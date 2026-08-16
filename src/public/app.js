const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
let csrf = null;
let currentUser = null;
let currentStatus = null;
let pending = null;
let authRevision = 0;

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
  $('#usersButton').hidden = currentUser.role !== 'admin'; $('#settingsButton').hidden = currentUser.role !== 'admin';
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
$('#scan').onclick = async () => { await api('/api/scan', { method: 'POST', body: '{}' }); $('#notice').textContent = 'Prüfung gestartet …'; setTimeout(load, 2500); };
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
  $('#containerRows').innerHTML = status.containers.map((container) => {
    const update = updated(container); const canLatest = container.parsed.tag !== 'latest' && container.scan?.latestExists;
    const lastUpdate = container.lastUpdate ? new Date(container.lastUpdate.at).toLocaleString() : 'Noch keines';
    const updateMode = container.lastUpdate?.mode === 'automatic' ? '<span class="badge good">Automatisch</span>' : container.lastUpdate ? '<span class="badge">Manuell</span>' : '–';
    return `<tr><td><div class="name">${esc(container.name)}</div><small>${esc(container.id.slice(0, 12))}</small></td><td class="image">${esc(container.image)}</td><td><span class="badge ${container.state === 'running' ? 'good' : 'bad'}">${esc(container.state)}</span><br><small>${esc(container.status)}</small></td><td class="${container.scan?.error ? 'bad' : update ? 'warn' : 'good'}">${container.scan?.error ? esc(container.scan.error) : update ? 'Verfügbar' : 'Aktuell'}</td><td class="lastUpdate">${esc(lastUpdate)}</td><td>${updateMode}</td><td><label class="toggle"><input type="checkbox" data-policy="${container.id}" ${container.policy.auto ? 'checked' : ''} ${isAdmin ? '' : 'disabled'}> Aktiv</label></td><td><div class="actions">${update ? `<button class="primary" data-update="${container.id}" data-name="${esc(container.name)}" ${isAdmin ? '' : 'disabled'}>Update</button>` : ''}${canLatest ? `<button data-latest="${container.id}" data-name="${esc(container.name)}" ${isAdmin ? '' : 'disabled'}>→ latest</button>` : ''}</div></td></tr>`;
  }).join('');
  $('#events').innerHTML = status.events.length ? status.events.map((event) => `<div class="event"><strong>${esc(event.container || event.actor || event.type)}</strong> · ${esc(event.type)} · ${new Date(event.at).toLocaleString()} ${event.message ? `<span class="bad">${esc(event.message)}</span>` : ''}</div>`).join('') : '<p class="muted">Noch keine Ereignisse.</p>';
  document.querySelectorAll('[data-policy]').forEach((element) => { element.onchange = () => api(`/api/containers/${element.dataset.policy}/policy`, { method: 'POST', body: JSON.stringify({ auto: element.checked }) }); });
  document.querySelectorAll('[data-update]').forEach((element) => { element.onclick = () => confirmAction('Update installieren', `${element.dataset.name} wird neu erstellt; bei Fehler erfolgt ein Rollback.`, () => api(`/api/containers/${element.dataset.update}/update`, { method: 'POST', body: '{}' })); });
  document.querySelectorAll('[data-latest]').forEach((element) => { element.onclick = () => confirmAction('Zu latest wechseln', `${element.dataset.name} wechselt auf latest. Das kann einen Versionssprung verursachen.`, () => api(`/api/containers/${element.dataset.latest}/update`, { method: 'POST', body: JSON.stringify({ target: 'latest' }) })); });
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

api('/api/version').then((data) => setVersion(data.version)).catch(() => {});
const startupAuthRevision = authRevision;
api('/api/session').then((session) => {
  if (authRevision !== startupAuthRevision) return;
  showApp(session); load();
}).catch(() => {
  if (authRevision === startupAuthRevision) showLogin();
});
setInterval(() => { if (currentUser) load().catch(() => {}); }, 15000);
