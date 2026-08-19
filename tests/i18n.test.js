import test from 'node:test';
import assert from 'node:assert/strict';
import { messages, t } from '../src/public/i18n.js';

test('English and German UI catalogs contain identical keys', () => {
  assert.deepEqual(Object.keys(messages.de).sort(), Object.keys(messages.en).sort());
});

test('UI translations interpolate values', () => {
  assert.equal(t('nextScan', { time: '12:00' }), 'Next scan: 12:00');
});
