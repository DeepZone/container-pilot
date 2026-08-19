import crypto from 'node:crypto';

const ENABLE = 'com.centurylinklabs.watchtower.enable';
const MONITOR_ONLY = 'com.centurylinklabs.watchtower.monitor-only';

function booleanLabel(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return null;
}

export function watchtowerImportPreview(containers, policies = {}) {
  const entries = containers.flatMap(container => {
    const enabled = booleanLabel(container.labels?.[ENABLE]);
    const monitorOnly = booleanLabel(container.labels?.[MONITOR_ONLY]);
    if (enabled === null && monitorOnly === null) return [];
    const currentAuto = policies[container.name]?.auto === true;
    const importable = enabled !== null || monitorOnly === true;
    const proposedAuto = monitorOnly === true ? false : enabled === true ? true : enabled === false ? false : currentAuto;
    const reason = monitorOnly === true ? 'monitor-only' : enabled === true ? 'enabled' : enabled === false ? 'disabled' : 'ambiguous';
    return [{ id: container.id, name: container.name, image: container.image, enabled, monitorOnly, proposedAuto, currentAuto, importable, changes: importable && currentAuto !== proposedAuto, reason }];
  }).sort((left, right) => left.name.localeCompare(right.name));
  const previewId = crypto.createHash('sha256').update(JSON.stringify(entries.map(({ id, enabled, monitorOnly, proposedAuto }) => ({ id, enabled, monitorOnly, proposedAuto })))).digest('hex');
  return { previewId, detected: entries.length, changes: entries.filter(entry => entry.changes).length, entries };
}

export function applyWatchtowerImport(preview, selectedIds, policies) {
  const selected = new Set(selectedIds);
  const imported = [];
  for (const entry of preview.entries) {
    if (!selected.has(entry.id) || !entry.importable) continue;
    policies[entry.name] = { auto: entry.proposedAuto };
    imported.push(entry);
  }
  return imported;
}
