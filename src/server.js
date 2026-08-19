import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listContainers, replaceContainer, parseImage, localImageDigest, digestReference, tagImage } from './docker.js';
import { inspectRemote } from './registry.js';
import { loadStore, getStore, saveStore, addEvent } from './store.js';
import { hashPassword, verifyPassword, createSession, readSession, destroySession, destroyUserSessions, sessionCookie, clearSessionCookie } from './auth.js';
import { checkSelfUpdate, launchSelfUpdater, readSelfUpdateStatus } from './self-update.js';

loadStore();
const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(sourceDir, 'public');
const port = Number(process.env.CP_PORT || 8080);
const appVersion = JSON.parse(fs.readFileSync(path.join(sourceDir, '..', 'package.json'), 'utf8')).version;
const initialUser = process.env.CP_ADMIN_USER || 'admin';
const initialPassword = process.env.CP_ADMIN_PASSWORD_FILE ? fs.readFileSync(process.env.CP_ADMIN_PASSWORD_FILE, 'utf8').trim() : process.env.CP_ADMIN_PASSWORD;
if (!initialPassword) throw new Error('Initiales Admin-Passwort fehlt');
if (!getStore().users[initialUser]) {
  getStore().users[initialUser] = { passwordHash: hashPassword(initialPassword), role: 'admin', createdAt: new Date().toISOString() };
  saveStore();
}
let scanRunning = false;
let scanTimer = null;
let nextScanAt = null;
const containerLocks = new Map();
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
const LOGIN_MAX_ATTEMPTS = 10;
let selfUpdateCheck = null;
let selfUpdateCheckedAt = 0;

async function currentSelfUpdate(force = false) {
  if (!force && selfUpdateCheck && Date.now() - selfUpdateCheckedAt < 5 * 60_000) return selfUpdateCheck;
  selfUpdateCheck = await checkSelfUpdate(appVersion);
  selfUpdateCheckedAt = Date.now();
  return selfUpdateCheck;
}

async function withContainerLock(name, operation, action) {
  if (containerLocks.has(name)) throw Object.assign(new Error(`Für ${name} läuft bereits die Aktion „${containerLocks.get(name)}“`), { status: 409 });
  containerLocks.set(name, operation);
  try { return await action(); } finally { containerLocks.delete(name); }
}

function defaultSettings() {
  return {
    enabled: true,
    intervalMinutes: Math.max(1, Number(process.env.CP_SCAN_INTERVAL_MINUTES || 60)),
    installUpdates: true,
  };
}
if (!getStore().settings) {
  getStore().settings = defaultSettings();
  saveStore();
}

function scheduleNextScan(delayMinutes = getStore().settings.intervalMinutes) {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = null;
  nextScanAt = null;
  if (!getStore().settings.enabled) return;
  const delay = Math.max(1, delayMinutes) * 60_000;
  nextScanAt = new Date(Date.now() + delay).toISOString();
  scanTimer = setTimeout(async () => {
    await scanAll();
    scheduleNextScan();
  }, delay);
}

function json(res, status, data, headers = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store', ...headers });
  res.end(payload);
}
async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 64_000) throw new Error('Anfrage zu groß'); chunks.push(chunk); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || new URL(origin).host === req.headers.host;
}
function requireCsrf(req, session) {
  if (!sameOrigin(req) || !session || req.headers['x-csrf-token'] !== session.csrf) throw Object.assign(new Error('Ungültiges CSRF-Token'), { status: 403 });
}
function validUsername(value) { return /^[a-zA-Z0-9._-]{3,32}$/.test(value || ''); }
function publicUser(username, user) { return { username, role: user.role, createdAt: user.createdAt }; }
function loginKey(req) { return req.socket.remoteAddress || 'unknown'; }
function loginAllowed(req) {
  const key = loginKey(req); const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter(at => now - at < LOGIN_WINDOW_MS);
  loginAttempts.set(key, recent);
  return recent.length < LOGIN_MAX_ATTEMPTS;
}
function recordFailedLogin(req) {
  const key = loginKey(req); const attempts = loginAttempts.get(key) || [];
  attempts.push(Date.now()); loginAttempts.set(key, attempts);
}

async function scanAll(trigger = 'scheduled', actor = null) {
  if (scanRunning) return false;
  scanRunning = true; const store = getStore();
  const result = { trigger, actor, startedAt: new Date().toISOString(), completedAt: null, checked: 0, updatesFound: 0, installed: 0, errors: 0 };
  try {
    for (const c of await listContainers()) {
      if (c.labels['container-pilot.watch'] === 'false') continue;
      result.checked += 1;
      try {
        const remote = await inspectRemote(c.image); const localDigest = await localImageDigest(c.imageId, c.image);
        store.scans[c.name] = { at: new Date().toISOString(), ...remote, localDigest, error: null };
        const policy = store.policies[c.name] || { auto: process.env.CP_AUTO_DEFAULT === 'true' };
        const updateAvailable = remote.currentDigest && localDigest && remote.currentDigest !== localDigest;
        if (updateAvailable) result.updatesFound += 1;
        if (store.settings.installUpdates && policy.auto && updateAvailable) {
          await withContainerLock(c.name, 'Automatisches Update', async () => {
            const current = (await listContainers()).find(item => item.name === c.name);
            if (!current) throw new Error('Container nicht mehr vorhanden');
            const currentLocalDigest = await localImageDigest(current.imageId, current.image);
            if (currentLocalDigest === remote.currentDigest) return;
            const rollback = { image: digestReference(current.image, currentLocalDigest), displayImage: current.image, createdAt: new Date().toISOString() };
            if (!rollback.image) throw new Error('Rollback-Punkt konnte nicht erstellt werden');
            await replaceContainer(current.id, current.image);
            store.rollbacks[c.name] = rollback;
            store.lastUpdates[c.name] = { at: new Date().toISOString(), mode: 'automatic', type: 'auto-update', actor: null };
            result.installed += 1;
            addEvent({ type: 'auto-update', container: c.name, image: c.image, result: 'success' });
          });
        }
      } catch (error) {
        result.errors += 1;
        store.scans[c.name] = { at: new Date().toISOString(), error: error.message };
        addEvent({ type: 'scan-error', container: c.name, result: 'error', message: error.message });
      }
    }
  } catch (error) {
    result.errors += 1; result.message = error.message;
    addEvent({ type: 'scan-error', actor, result: 'error', message: error.message });
  } finally {
    result.completedAt = new Date().toISOString(); store.lastScan = result.completedAt; store.lastScanResult = result;
    scanRunning = false; saveStore();
    addEvent({ type: 'scan-complete', actor, result: result.errors ? 'warning' : 'success', message: `${result.checked} geprüft, ${result.updatesFound} Updates, ${result.installed} installiert, ${result.errors} Fehler` });
  }
  return true;
}

async function api(req, res, url, session) {
  if (req.method === 'GET' && url.pathname === '/api/version') {
    return json(res, 200, { version: appVersion });
  }
  if (req.method === 'POST' && url.pathname === '/api/login') {
    if (!sameOrigin(req)) return json(res, 403, { error: 'Ungültiger Origin' });
    if (!loginAllowed(req)) return json(res, 429, { error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.' });
    const data = await body(req); const user = getStore().users[data.username];
    if (!user || !verifyPassword(data.password || '', user.passwordHash)) {
      recordFailedLogin(req); addEvent({ type: 'login', actor: String(data.username || 'unbekannt').slice(0, 32), result: 'error', message: 'Fehlgeschlagene Anmeldung' });
      return json(res, 401, { error: 'Benutzername oder Passwort falsch' });
    }
    loginAttempts.delete(loginKey(req));
    const created = createSession(data.username, user.role);
    addEvent({ type: 'login', actor: data.username, result: 'success' });
    return json(res, 200, { user: publicUser(data.username, user), csrf: created.csrf, version: appVersion }, { 'set-cookie': sessionCookie(created.token) });
  }
  if (!session) return json(res, 401, { error: 'Anmeldung erforderlich' });
  if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { user: { username: session.username, role: session.role }, csrf: session.csrf, version: appVersion });
  if (req.method === 'POST') requireCsrf(req, session);
  if (req.method === 'POST' && url.pathname === '/api/logout') {
    destroySession(session.token); return json(res, 200, { ok: true }, { 'set-cookie': clearSessionCookie() });
  }
  if (req.method === 'GET' && url.pathname === '/api/status') {
    const containers = await listContainers(); const store = getStore();
    return json(res, 200, { version: appVersion, lastScan: store.lastScan, lastScanResult: store.lastScanResult, nextScanAt, scanRunning, settings: store.settings, selfUpdate: readSelfUpdateStatus(), events: store.events, containers: containers.map(c => ({
      ...c,
      parsed: parseImage(c.image),
      policy: store.policies[c.name] || { auto: process.env.CP_AUTO_DEFAULT === 'true' },
      scan: store.scans[c.name] || null,
      rollback: store.rollbacks?.[c.name] || null,
      operation: containerLocks.get(c.name) || null,
      lastUpdate: (() => {
        if (store.lastUpdates?.[c.name]) return store.lastUpdates[c.name];
        const event = store.events.find(item => item.container === c.name && ['auto-update', 'manual-update', 'switch-latest', 'rollback'].includes(item.type) && item.result === 'success');
        return event ? { at: event.at, mode: event.type === 'auto-update' ? 'automatic' : 'manual', type: event.type, actor: event.actor || null } : null;
      })(),
    })) });
  }
  if (req.method === 'GET' && url.pathname === '/api/self-update') {
    try { return json(res, 200, { ...(await currentSelfUpdate(url.searchParams.get('force') === 'true')), status: readSelfUpdateStatus() }); }
    catch (error) { return json(res, 502, { error: error.message, currentVersion: appVersion, status: readSelfUpdateStatus() }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/self-update') {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    const status = readSelfUpdateStatus();
    if (['queued', 'running'].includes(status?.state)) return json(res, 409, { error: 'Ein Container-Pilot-Update läuft bereits' });
    const available = await currentSelfUpdate(true);
    if (!available.release?.available) return json(res, 409, { error: 'Kein neueres Container-Pilot-Release verfügbar' });
    const result = await launchSelfUpdater(available.release);
    addEvent({ type: 'self-update-started', actor: session.username, container: 'container-pilot', image: available.release.image, result: 'success', message: `Update auf ${available.release.version} gestartet` });
    return json(res, 202, result);
  }
  if (req.method === 'POST' && url.pathname === '/api/scan') {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    if (scanRunning) return json(res, 409, { error: 'Eine Prüfung läuft bereits' });
    scanAll('manual', session.username); return json(res, 202, { ok: true });
  }
  if (req.method === 'POST' && url.pathname === '/api/settings') {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    const data = await body(req); const intervalMinutes = Number(data.intervalMinutes);
    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 10_080) return json(res, 400, { error: 'Intervall muss zwischen 1 und 10.080 Minuten liegen' });
    getStore().settings = { enabled: data.enabled === true, intervalMinutes, installUpdates: data.installUpdates === true };
    saveStore(); scheduleNextScan();
    addEvent({ type: 'settings-changed', actor: session.username, result: 'success', message: `Intervall ${intervalMinutes} min` });
    return json(res, 200, { settings: getStore().settings, nextScanAt });
  }
  if (req.method === 'GET' && url.pathname === '/api/users') {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    return json(res, 200, { users: Object.entries(getStore().users).map(([name, value]) => publicUser(name, value)) });
  }
  if (req.method === 'POST' && url.pathname === '/api/users') {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    const data = await body(req);
    if (!validUsername(data.username)) return json(res, 400, { error: 'Benutzername: 3–32 Zeichen, Buchstaben, Zahlen, Punkt, Strich oder Unterstrich' });
    if (String(data.password || '').length < 12) return json(res, 400, { error: 'Passwort muss mindestens 12 Zeichen lang sein' });
    if (!['admin', 'viewer'].includes(data.role)) return json(res, 400, { error: 'Ungültige Rolle' });
    if (getStore().users[data.username]) return json(res, 409, { error: 'Benutzer existiert bereits' });
    getStore().users[data.username] = { passwordHash: hashPassword(data.password), role: data.role, createdAt: new Date().toISOString() }; saveStore();
    addEvent({ type: 'user-created', actor: session.username, container: data.username, result: 'success' });
    return json(res, 201, { user: publicUser(data.username, getStore().users[data.username]) });
  }
  const userMatch = url.pathname.match(/^\/api\/users\/([a-zA-Z0-9._-]+)$/);
  if (req.method === 'DELETE' && userMatch) {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    if (userMatch[1] === session.username) return json(res, 409, { error: 'Das eigene Konto kann nicht gelöscht werden' });
    if (!getStore().users[userMatch[1]]) return json(res, 404, { error: 'Benutzer nicht gefunden' });
    delete getStore().users[userMatch[1]]; destroyUserSessions(userMatch[1]); saveStore();
    addEvent({ type: 'user-deleted', actor: session.username, container: userMatch[1], result: 'success' });
    return json(res, 200, { ok: true });
  }
  const passwordMatch = url.pathname.match(/^\/api\/users\/([a-zA-Z0-9._-]+)\/password$/);
  if (req.method === 'POST' && passwordMatch) {
    if (session.role !== 'admin' && passwordMatch[1] !== session.username) return json(res, 403, { error: 'Keine Berechtigung' });
    const data = await body(req); if (String(data.password || '').length < 12) return json(res, 400, { error: 'Passwort muss mindestens 12 Zeichen lang sein' });
    const target = getStore().users[passwordMatch[1]]; if (!target) return json(res, 404, { error: 'Benutzer nicht gefunden' });
    target.passwordHash = hashPassword(data.password); destroyUserSessions(passwordMatch[1]); saveStore();
    addEvent({ type: 'password-changed', actor: session.username, container: passwordMatch[1], result: 'success' });
    return json(res, 200, { ok: true }, passwordMatch[1] === session.username ? { 'set-cookie': clearSessionCookie() } : {});
  }
  const policyMatch = url.pathname.match(/^\/api\/containers\/([a-f0-9]+)\/policy$/);
  if (req.method === 'POST' && policyMatch) {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    const current = (await listContainers()).find(c => c.id.startsWith(policyMatch[1])); if (!current) return json(res, 404, { error: 'Container nicht gefunden' });
    const data = await body(req); getStore().policies[current.name] = { auto: data.auto === true }; saveStore(); return json(res, 200, { ok: true });
  }
  const updateMatch = url.pathname.match(/^\/api\/containers\/([a-f0-9]+)\/update$/);
  if (req.method === 'POST' && updateMatch) {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    const data = await body(req); const selected = (await listContainers()).find(c => c.id.startsWith(updateMatch[1])); if (!selected) return json(res, 404, { error: 'Container nicht gefunden' });
    const result = await withContainerLock(selected.name, data.target === 'latest' ? 'Wechsel auf latest' : 'Manuelles Update', async () => {
      const current = (await listContainers()).find(c => c.name === selected.name); if (!current) throw Object.assign(new Error('Container nicht mehr vorhanden'), { status: 404 });
      const parsed = parseImage(current.image); const target = data.target === 'latest' ? `${parsed.registry === 'docker.io' ? '' : `${parsed.registry}/`}${parsed.repository}:latest` : current.image;
      if (data.target === 'latest' && !(await inspectRemote(current.image)).latestExists) throw Object.assign(new Error('Tag latest existiert nicht'), { status: 409 });
      const currentDigest = await localImageDigest(current.imageId, current.image);
      const rollback = { image: digestReference(current.image, currentDigest), displayImage: current.image, createdAt: new Date().toISOString() };
      if (!rollback.image) throw Object.assign(new Error('Das aktuelle Image besitzt keinen auflösbaren Digest; Rollback-Punkt kann nicht erstellt werden'), { status: 409 });
      const replaced = await replaceContainer(current.id, target); const updateType = data.target === 'latest' ? 'switch-latest' : 'manual-update';
      getStore().rollbacks[current.name] = rollback;
      getStore().lastUpdates[current.name] = { at: new Date().toISOString(), mode: 'manual', type: updateType, actor: session.username };
      addEvent({ type: updateType, actor: session.username, container: current.name, image: target, result: 'success' });
      return replaced;
    });
    return json(res, 200, result);
  }
  const rollbackMatch = url.pathname.match(/^\/api\/containers\/([a-f0-9]+)\/rollback$/);
  if (req.method === 'POST' && rollbackMatch) {
    if (session.role !== 'admin') return json(res, 403, { error: 'Adminrechte erforderlich' });
    const selected = (await listContainers()).find(c => c.id.startsWith(rollbackMatch[1])); if (!selected) return json(res, 404, { error: 'Container nicht gefunden' });
    const result = await withContainerLock(selected.name, 'Rollback', async () => {
      const current = (await listContainers()).find(c => c.name === selected.name); if (!current) throw Object.assign(new Error('Container nicht mehr vorhanden'), { status: 404 });
      const checkpoint = getStore().rollbacks?.[current.name]; if (!checkpoint?.image) throw Object.assign(new Error('Kein Rollback-Punkt vorhanden'), { status: 409 });
      const displayTarget = checkpoint.displayImage && !checkpoint.displayImage.includes('@') ? checkpoint.displayImage : null;
      if (displayTarget) await tagImage(checkpoint.image, displayTarget);
      const replaced = await replaceContainer(current.id, displayTarget || checkpoint.image, { pull: false });
      delete getStore().rollbacks[current.name];
      getStore().lastUpdates[current.name] = { at: new Date().toISOString(), mode: 'manual', type: 'rollback', actor: session.username };
      addEvent({ type: 'rollback', actor: session.username, container: current.name, image: checkpoint.image, result: 'success', message: `Wiederhergestellt: ${checkpoint.displayImage}` });
      return replaced;
    });
    return json(res, 200, result);
  }
  return json(res, 404, { error: 'Nicht gefunden' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`); const session = readSession(req.headers.cookie);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url, session);
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1); const full = path.resolve(root, requested);
    if (!full.startsWith(`${root}${path.sep}`) && full !== path.join(root, 'index.html')) return res.writeHead(403).end();
    const data = fs.readFileSync(full);
    const type = full.endsWith('.css') ? 'text/css'
      : full.endsWith('.js') ? 'text/javascript'
        : full.endsWith('.svg') ? 'image/svg+xml'
          : full.endsWith('.png') ? 'image/png'
            : 'text/html';
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'referrer-policy': 'no-referrer' }); res.end(data);
  } catch (error) { console.error(error); json(res, error.status || 500, { error: error.message }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Container Pilot lauscht auf Port ${port}`));
setTimeout(async () => {
  if (getStore().settings.enabled) await scanAll();
  scheduleNextScan();
}, 3_000);
