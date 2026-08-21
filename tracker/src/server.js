import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, deleteInstallation, migrate, pool, saveReport } from './db.js';
import { createSession, cookie, clearCookie, destroySession, loginAllowed, loginFailed, loginSucceeded, readSession, validCredentials, cleanupSessions } from './auth.js';
import { installation, installations, summary } from './dashboard-data.js';
import { UUID_V4 } from './validation.js';
import { createPublicHandler } from './public-api.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const apiBind = process.env.TRACKER_API_BIND || '127.0.0.1'; const apiPort = Number(process.env.TRACKER_API_PORT || 3090);
const dashboardBind = process.env.TRACKER_DASHBOARD_BIND || '127.0.0.1'; const dashboardPort = Number(process.env.TRACKER_DASHBOARD_PORT || 3091);
const adminUser = process.env.TRACKER_ADMIN_USER || 'admin';
const passwordFile = process.env.TRACKER_ADMIN_PASSWORD_FILE; if (!passwordFile) throw new Error('TRACKER_ADMIN_PASSWORD_FILE is required');
const adminPassword = fs.readFileSync(passwordFile, 'utf8').trim(); if (adminPassword.length < 12) throw new Error('Tracker admin password must contain at least 12 characters');
const MAX_BODY = 16 * 1024;

function headers(extra = {}) { return { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'referrer-policy': 'no-referrer', ...extra }; }
function json(res, status, value, extra = {}) { const body = JSON.stringify(value); res.writeHead(status, headers({ 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), ...extra })); res.end(body); }
function text(res, status, value, type = 'text/plain; charset=utf-8', extra = {}) { res.writeHead(status, headers({ 'content-type': type, ...extra })); res.end(value); }
async function parseBody(req) { const chunks = []; let size = 0; for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw Object.assign(new Error('payload_too_large'), { status: 413 }); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); } }
function remoteKey(req) { return req.socket.remoteAddress || 'unknown'; }
export const publicHandler = createPublicHandler({ query: (...args) => pool.query(...args), saveReport, deleteInstallation });

function sameOrigin(req) { const origin = req.headers.origin; if (!origin) return true; try { return new URL(origin).host === req.headers.host; } catch { return false; } }
export async function dashboardHandler(req, res) {
  try {
    const url = new URL(req.url, 'http://dashboard'); const session = readSession(req.headers.cookie);
    if (req.method === 'GET' && url.pathname === '/healthz') { await pool.query('SELECT 1'); return json(res, 200, { status: 'ok' }); }
    if (req.method === 'POST' && url.pathname === '/login') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'invalid_origin' }); const key = remoteKey(req); if (!loginAllowed(key)) return json(res, 429, { error: 'rate_limited' });
      const data = await parseBody(req); if (!validCredentials(data.username, data.password, adminUser, adminPassword)) { loginFailed(key); return json(res, 401, { error: 'invalid_credentials' }); }
      loginSucceeded(key); const created = createSession(); return json(res, 200, { csrf: created.csrf }, { 'set-cookie': cookie(created.token, process.env.TRACKER_SECURE_COOKIE === 'true') });
    }
    if (!session && url.pathname.startsWith('/api/')) return json(res, 401, { error: 'authentication_required' });
    if (!session && !['/login.html', '/app.css', '/login.js'].includes(url.pathname)) return text(res, 302, '', 'text/plain', { location: '/login.html' });
    if (req.method === 'POST' && url.pathname === '/api/logout') { if (!sameOrigin(req) || req.headers['x-csrf-token'] !== session.csrf) return json(res, 403, { error: 'csrf' }); destroySession(session.token); return json(res, 200, { status: 'ok' }, { 'set-cookie': clearCookie() }); }
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { csrf: session.csrf });
    if (req.method === 'GET' && url.pathname === '/api/dashboard/summary') return json(res, 200, await summary(url.searchParams.get('days')));
    if (req.method === 'GET' && url.pathname === '/api/dashboard/installations') return json(res, 200, { installations: await installations() });
    const detail = url.pathname.match(/^\/api\/dashboard\/installations\/([0-9a-f-]+)$/i); if (req.method === 'GET' && detail && UUID_V4.test(detail[1])) { const value = await installation(detail[1]); return value ? json(res, 200, value) : json(res, 404, { error: 'not_found' }); }
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1); const file = path.resolve(publicDir, requested); if (!file.startsWith(`${publicDir}${path.sep}`)) return json(res, 403, { error: 'forbidden' });
    const data = fs.readFileSync(file); const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8'; return text(res, 200, data, type);
  } catch (error) { if (error.code === 'ENOENT') return json(res, 404, { error: 'not_found' }); console.error('dashboard request failed'); return json(res, error.status || 500, { error: error.status ? error.message : 'internal_error' }); }
}

await migrate();
http.createServer(publicHandler).listen(apiPort, apiBind, () => console.info(`public telemetry listener ready on ${apiBind}:${apiPort}`));
http.createServer(dashboardHandler).listen(dashboardPort, dashboardBind, () => console.info(`internal dashboard listener ready on ${dashboardBind}:${dashboardPort}`));
setInterval(() => { cleanup().then(result => console.info(`report cleanup completed ${result.rowCount}`)).catch(() => console.error('report cleanup failed')); cleanupSessions(); }, 6 * 60 * 60_000).unref();
