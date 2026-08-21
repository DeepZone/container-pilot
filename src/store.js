import fs from 'node:fs';
import path from 'node:path';

const file = process.env.CP_STORE_FILE || '/data/state.json';
export const defaultTelemetryState = () => ({
  enabled: false, installation_id: null, delete_token: null,
  last_successful_report: null, last_attempt: null, last_status: null,
  successful_updates: 0, failed_updates: 0, automatic_rollbacks: 0,
  manual_rollbacks: 0, watchtower_import_used: false,
});
let state = { policies: {}, scans: {}, events: [], users: {}, lastScan: null, lastScanResult: null, lastUpdates: {}, rollbacks: {}, settings: null, telemetry: defaultTelemetryState() };
let eventListener = null;

export function loadStore() {
  try {
    const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
    state = { ...state, ...loaded, telemetry: { ...defaultTelemetryState(), ...(loaded.telemetry || {}) } };
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Store konnte nicht geladen werden', e);
  }
  return state;
}
export function getStore() { return state; }
export function saveStore() {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
export function addEvent(event) {
  const stored = { at: new Date().toISOString(), ...event };
  state.events.unshift(stored);
  state.events = state.events.slice(0, 200);
  saveStore();
  if (eventListener) Promise.resolve(eventListener(stored)).catch(error => console.error('Event listener failed', error.message));
}
export function setEventListener(listener) { eventListener = listener; }
