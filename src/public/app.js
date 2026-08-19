const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
let csrf = null;
let currentUser = null;
let currentStatus = null;
let pending = null;
let authRevision = 0;
let manualScanPending = false;
let selfUpdateData = null;

async function api(path, options = {}) {
  const requestAuthRevision = authRevision;
  const headers = { 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}), ...(options.headers || {}) };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    if (currentUser && requestAuthRevision === authRevision) showLogin();
    throw new Error(data.error || 'Anmeldung erforderlich');
  }
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}
function setVersion(version) { document.querySelectorAll('[data-version]').forEach((element) => { element.textContent = version || '–'; }); }
function showLogin() { authRevision += 1; $('#app').hidden = true; $('#loginView').hidden = false; csrf = null; currentUser = null; }
function showApp(session) {
  authRevision += 1; csrf = session.csrf; currentUser = session.user; setVersion(session.version);
  $('#loginView').hidden = true; $('#app').hidden = false;
  $('#who').textContent = `${currentUser.username} · ${currentUser.role === 'admin' ? 'Administrator' : 'Betrachter'}`;
  $('#usersButton').hidden = currentUser.role !== 'admin'; $('#settingsButton').hidden = currentUser.role !== 'admin'; $('#selfUpdateButton').hidden = currentUser.role !== 'admin';
  showView('containers');
}
function showView(view) {
  const events = view === 'events';
  $('#containersView').hidden = events; $('#eventsView').hidden = !events;
  $('#containersButton').classList.toggle('active', !events); $('#eventsButton').classList.toggle('active', events);
}
function confirmAction(title, text, fn) { $('#confirmTitle').textContent = title; $('#confirmText').textContent = text; pending = fn; $('#confirm').showModal(); }

$('#loginForm').onsubmit = async (event) => {
  event.preventDefault(); const form = new FormData(event.target);
  try { const session = await api('/api/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); showApp(session); event.target.reset(); $('#loginError').textContent = ''; load(); }
  catch (error) { $('#loginError').textContent = error.message; }
};
$('#logout').onclick = async () => { await api('/api/logout', { method: 'POST', body: '{}' }); showLogin(); };
$('#scan').onclick = async () => {
  try {
    await api('/api/scan', { method: 'POST', body: '{}' }); manualScanPending = true;
    $('#notice').textContent = 'Prüfung läuft …'; pollManualScan();
  } catch (error) { $('#notice').textContent = `Fehler: ${error.message}`; }
};
$('#containersButton').onclick = () => showView('containers');
$('#eventsButton').onclick = async () => { await load(); showView('events'); };
$('#refreshEvents').onclick = load;
$('#confirmGo').onclick = async () => {
  if (!pending) return; const fn = pending; pending = null;
  try { $('#notice').textContent = 'Aktion läuft …'; await fn(); $('#notice').textContent = 'Aktion erfolgreich.'; setTimeout(load, 1000); }
  catch (error) { $('#notice').textContent = `Fehler: ${error.message}`; }
};

async function load() {
  const status = await api('/api/status'); currentStatus = status; const isAdmin = currentUser.role === 'admin';
  const updated = (container) => container.scan?.currentDigest && container.scan?.localDigest && container.scan.currentDigest !== container.scan.localDigest;
  $('#total').textContent = status.containers.length;
  $('#running').textContent = status.containers.filter((container) => container.state === 'running').length;
  $('#updates').textContent = status.containers.filter(updated).length;
  $('#latest').textContent = status.containers.filter((container) => container.parsed.tag !== 'latest' && container.scan?.latestExists).length;
  const last = status.lastScan ? `Letzte Prüfung: ${new Date(status.lastScan).toLocaleString()}` : 'Noch nicht geprüft';
  const next = status.settings.enabled && status.nextScanAt ? `Nächste Prüfung: ${new Date(status.nextScanAt).toLocaleString()}` : 'Automatische Prüfung deaktiviert';
  $('#last').innerHTML = `${esc(last)}<br><small>${esc(next)}</small>`;
  $('#scan').disabled = status.scanRunning; $('#scan').textContent = status.scanRunning ? 'Prüfung läuft …' : 'Jetzt prüfen';
  const scan = status.lastScanResult;
  $('#scanSummary').textContent = scan ? `Letztes Prüfergebnis: ${scan.checked} geprüft · ${scan.updatesFound} Updates gefunden · ${scan.installed} installiert · ${scan.errors} Fehler` : 'Noch kein Prüfergebnis vorhanden.';
  $('#containerRows').innerHTML = status.containers.map((container) => {
    const update = updated(container); const canLatest = container.parsed.tag !== 'latest' && container.scan?.latestExists;
    const busy = Boolean(container.operation);
    const lastUpdate = container.lastUpdate ? new Date(container.lastUpdate.at).toLocaleString() : 'Noch keines';
    const updateMode = container.lastUpdate?.mode === 'automatic' ? '<span class="badge good">Automatisch</span>' : container.lastUpdate ? '<span class="badge">Manuell</span>' : '–';
    const disabled = isAdmin && !busy ? '' : 'disabled';
    const rollbackButton = container.rollback ? `<button class="rollback" data-rollback="${container.id}" data-name="${esc(container.name)}" data-image="${esc(container.rollback.displayImage)}" data-created="${esc(container.rollback.createdAt)}" ${disabled}>Rollback</button>` : '';
    const currentTagAction = update ? `<button class="primary" data-update="${container.id}" data-name="${esc(container.name)}" data-tag="${esc(container.parsed.tag)}" ${disabled}>Tag ${esc(container.parsed.tag)} aktualisieren</button>` : '';
    const latestAction = canLatest ? `<button data-latest="${container.id}" data-name="${esc(container.name)}" ${disabled}>Auf latest wechseln</button>` : '';
    return `<tr><td><div class="name">${esc(container.name)}</div><small>${esc(container.id.slice(0, 12))}</small></td><td class="image">${esc(container.image)}</td><td><span class="badge ${container.state === 'running' ? 'good' : 'bad'}">${esc(container.state)}</span><br><small>${esc(container.status)}</small>${busy ? `<br><span class="badge warn">${esc(container.operation)}</span>` : ''}</td><td class="${container.scan?.error ? 'bad' : update ? 'warn' : 'good'}">${container.scan?.error ? esc(container.scan.error) : update ? `Update für Tag ${esc(container.parsed.tag)}` : 'Tag aktuell'}${canLatest ? '<br><small>latest als Alternative verfügbar</small>' : ''}</td><td class="lastUpdate">${esc(lastUpdate)}</td><td>${updateMode}</td><td><label class="toggle"><input type="checkbox" data-policy="${container.id}" ${container.policy.auto ? 'checked' : ''} ${disabled}> Aktiv</label></td><td><div class="actions">${currentTagAction}${latestAction}${rollbackButton}</div></td></tr>`;
  }).join('');
  $('#events').innerHTML = status.events.length ? status.events.map((event) => `<div class="event"><strong>${esc(event.container || event.actor || event.type)}</strong> · ${esc(event.type)} · ${new Date(event.at).toLocaleString()} ${event.message ? `<span class="bad">${esc(event.message)}</span>` : ''}</div>`).join('') : '<p class="muted">Noch keine Ereignisse.</p>';
  document.querySelectorAll('[data-policy]').forEach((element) => { element.onchange = () => api(`/api/containers/${element.dataset.policy}/policy`, { method: 'POST', body: JSON.stringify({ auto: element.checked }) }); });
  document.querySelectorAll('[data-update]').forEach((element) => { element.onclick = () => confirmAction('Bestehenden Tag aktualisieren', `${element.dataset.name} bleibt auf Tag ${element.dataset.tag}. Nur das aktuelle Image dieses Tags wird installiert und bis zur Betriebsbereitschaft geprüft.`, () => api(`/api/containers/${element.dataset.update}/update`, { method: 'POST', body: '{}' })); });
  document.querySelectorAll('[data-latest]').forEach((element) => { element.onclick = () => confirmAction('Zu latest wechseln', `${element.dataset.name} wechselt auf latest. Das kann einen Versionssprung und irreversible Datenmigrationen verursachen. Vorher anwendungsspezifisches Backup erstellen.`, () => api(`/api/containers/${element.dataset.latest}/update`, { method: 'POST', body: JSON.stringify({ target: 'latest' }) })); });
  document.querySelectorAll('[data-rollback]').forEach((element) => { element.onclick = () => confirmAction('Rollback durchführen', `${element.dataset.name} wird auf ${element.dataset.image} vom ${new Date(element.dataset.created).toLocaleString()} zurückgesetzt. Nur das Image wird zurückgesetzt – Volumes und Datenbanken bleiben unverändert.`, () => api(`/api/containers/${element.dataset.rollback}/rollback`, { method: 'POST', body: '{}' })); });
  return status;
}

async function pollManualScan() {
  if (!manualScanPending) return;
  try {
    const status = await load();
    if (status.scanRunning) return setTimeout(pollManualScan, 1000);
    manualScanPending = false; const scan = status.lastScanResult;
    $('#notice').textContent = scan ? `Prüfung abgeschlossen: ${scan.checked} geprüft, ${scan.updatesFound} Updates gefunden, ${scan.installed} installiert, ${scan.errors} Fehler.` : 'Prüfung abgeschlossen.';
  } catch (error) {
    manualScanPending = false; $('#notice').textContent = `Prüfung fehlgeschlagen: ${error.message}`;
  }
}

async function loadUsers() {
  const data = await api('/api/users');
  $('#userList').innerHTML = data.users.map((user) => `<div class="userRow"><strong>${esc(user.username)}</strong><span class="badge">${esc(user.role)}</span><button class="danger" data-delete-user="${esc(user.username)}" ${user.username === currentUser.username ? 'disabled' : ''}>Löschen</button></div>`).join('');
  document.querySelectorAll('[data-delete-user]').forEach((element) => { element.onclick = () => confirmAction('Benutzer löschen', `${element.dataset.deleteUser} wird gelöscht und aktive Sitzungen werden beendet.`, async () => { await api(`/api/users/${encodeURIComponent(element.dataset.deleteUser)}`, { method: 'DELETE', body: '{}' }); await loadUsers(); }); });
}
$('#usersButton').onclick = async () => { await loadUsers(); $('#usersDialog').showModal(); };
document.querySelector('[data-close-users]').onclick = () => $('#usersDialog').close();
$('#newUser').onsubmit = async (event) => { event.preventDefault(); const form = Object.fromEntries(new FormData(event.target)); try { await api('/api/users', { method: 'POST', body: JSON.stringify(form) }); event.target.reset(); await loadUsers(); } catch (error) { $('#notice').textContent = error.message; } };

$('#settingsButton').onclick = () => {
  const form = $('#settingsForm'); form.elements.enabled.checked = currentStatus.settings.enabled; form.elements.intervalMinutes.value = currentStatus.settings.intervalMinutes; form.elements.installUpdates.checked = currentStatus.settings.installUpdates; $('#settingsDialog').showModal();
};
document.querySelector('[data-close-settings]').onclick = () => $('#settingsDialog').close();
$('#settingsForm').onsubmit = async (event) => {
  event.preventDefault(); const form = event.target;
  try {
    await api('/api/settings', { method: 'POST', body: JSON.stringify({ enabled: form.elements.enabled.checked, intervalMinutes: Number(form.elements.intervalMinutes.value), installUpdates: form.elements.installUpdates.checked }) });
    $('#settingsDialog').close(); $('#notice').textContent = 'Automatik-Einstellungen gespeichert.'; await load();
  } catch (error) { $('#notice').textContent = `Fehler: ${error.message}`; }
};

function describeSelfUpdateStatus(status) {
  if (!status) return 'Noch kein Self-Update durchgeführt.';
  if (status.state === 'queued') return `Update auf ${status.toVersion} wurde vorbereitet.`;
  if (status.state === 'running') return `Update auf ${status.toVersion} läuft …`;
  if (status.state === 'success') return `Letztes Systemupdate auf ${status.toVersion} war erfolgreich.`;
  if (status.state === 'failed') return `Letztes Systemupdate ist fehlgeschlagen; der bisherige Container wurde wiederhergestellt. ${status.error || ''}`;
  return String(status.state || 'Unbekannter Zustand');
}

async function loadSelfUpdate(force = false) {
  $('#selfAvailableVersion').textContent = 'Prüfung läuft …';
  try {
    selfUpdateData = await api(`/api/self-update${force ? '?force=true' : ''}`);
    $('#selfCurrentVersion').textContent = selfUpdateData.currentVersion;
    $('#selfAvailableVersion').textContent = selfUpdateData.release ? `${selfUpdateData.release.version}${selfUpdateData.release.available ? ' – Update verfügbar' : ' – aktuell'}` : 'Kein Release veröffentlicht';
    $('#selfReleaseNotes').textContent = selfUpdateData.release?.notes || '';
    $('#selfUpdateState').textContent = describeSelfUpdateStatus(selfUpdateData.status);
    $('#installSelfUpdate').disabled = !selfUpdateData.release?.available || ['queued', 'running'].includes(selfUpdateData.status?.state);
  } catch (error) {
    $('#selfAvailableVersion').textContent = 'Prüfung fehlgeschlagen';
    $('#selfUpdateState').textContent = error.message;
    $('#installSelfUpdate').disabled = true;
  }
}

$('#selfUpdateButton').onclick = async () => { $('#selfUpdateDialog').showModal(); await loadSelfUpdate(); };
document.querySelector('[data-close-self-update]').onclick = () => $('#selfUpdateDialog').close();
$('#checkSelfUpdate').onclick = () => loadSelfUpdate(true);
$('#installSelfUpdate').onclick = () => {
  if (!selfUpdateData?.release?.available) return;
  confirmAction('Container Pilot aktualisieren', `Container Pilot wird auf ${selfUpdateData.release.version} aktualisiert. Die Oberfläche ist während Neustart und Healthcheck kurzzeitig nicht erreichbar.`, async () => {
    await api('/api/self-update', { method: 'POST', body: '{}' });
    $('#selfUpdateDialog').close();
    $('#notice').textContent = `Systemupdate auf ${selfUpdateData.release.version} gestartet. Die Seite wird nach dem Healthcheck neu geladen.`;
    setTimeout(() => window.location.reload(), 45_000);
  });
};

api('/api/version').then((data) => setVersion(data.version)).catch(() => {});
const startupAuthRevision = authRevision;
api('/api/session').then((session) => {
  if (authRevision !== startupAuthRevision) return;
  showApp(session); load();
}).catch(() => {
  if (authRevision === startupAuthRevision) showLogin();
});
setInterval(() => { if (currentUser) load().catch(() => {}); }, 15000);
