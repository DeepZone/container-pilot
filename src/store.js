import fs from 'node:fs';
import path from 'node:path';

const file = process.env.CP_STORE_FILE || '/data/state.json';
let state = { policies: {}, scans: {}, events: [], users: {}, lastScan: null };

export function loadStore() {
  try { state = { ...state, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) {
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
  state.events.unshift({ at: new Date().toISOString(), ...event });
  state.events = state.events.slice(0, 200);
  saveStore();
}
