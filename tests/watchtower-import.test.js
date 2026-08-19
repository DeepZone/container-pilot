import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWatchtowerImport, watchtowerImportPreview } from '../src/watchtower-import.js';

const containers = [
  { id: 'a'.repeat(64), name: 'enabled', image: 'demo:1', labels: { 'com.centurylinklabs.watchtower.enable': 'true' } },
  { id: 'b'.repeat(64), name: 'disabled', image: 'demo:1', labels: { 'com.centurylinklabs.watchtower.enable': 'false' } },
  { id: 'c'.repeat(64), name: 'monitor', image: 'demo:1', labels: { 'com.centurylinklabs.watchtower.enable': 'true', 'com.centurylinklabs.watchtower.monitor-only': 'true' } },
  { id: 'd'.repeat(64), name: 'unlabelled', image: 'demo:1', labels: {} },
  { id: 'e'.repeat(64), name: 'ambiguous', image: 'demo:1', labels: { 'com.centurylinklabs.watchtower.monitor-only': 'false' } },
];

test('creates a conservative Watchtower policy preview without changing state', () => {
  const policies = { disabled: { auto: true } };
  const before = structuredClone(policies);
  const preview = watchtowerImportPreview(containers, policies);
  assert.equal(preview.detected, 4);
  assert.equal(preview.entries.find(entry => entry.name === 'enabled').proposedAuto, true);
  assert.equal(preview.entries.find(entry => entry.name === 'disabled').proposedAuto, false);
  assert.equal(preview.entries.find(entry => entry.name === 'monitor').proposedAuto, false);
  assert.equal(preview.entries.find(entry => entry.name === 'ambiguous').importable, false);
  assert.deepEqual(policies, before);
  assert.match(preview.previewId, /^[a-f0-9]{64}$/);
});

test('imports only explicitly selected preview entries', () => {
  const policies = {};
  const preview = watchtowerImportPreview(containers, policies);
  const selected = preview.entries.find(entry => entry.name === 'enabled');
  const imported = applyWatchtowerImport(preview, [selected.id], policies);
  assert.deepEqual(imported.map(entry => entry.name), ['enabled']);
  assert.deepEqual(policies, { enabled: { auto: true } });
});
