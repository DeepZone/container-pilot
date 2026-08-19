import test from 'node:test';
import assert from 'node:assert/strict';
import { requireCsrf, sameOrigin } from '../src/http-security.js';

test('same-origin validation allows missing Origin and exact host only', () => {
  assert.equal(sameOrigin({ headers: { host: 'pilot.example' } }), true);
  assert.equal(sameOrigin({ headers: { host: 'pilot.example', origin: 'https://pilot.example' } }), true);
  assert.equal(sameOrigin({ headers: { host: 'pilot.example', origin: 'https://attacker.example' } }), false);
  assert.equal(sameOrigin({ headers: { host: 'pilot.example', origin: 'not a url' } }), false);
});

test('CSRF validation requires a matching token and origin', () => {
  const session = { csrf: 'expected' };
  assert.doesNotThrow(() => requireCsrf({ headers: { host: 'pilot.example', origin: 'https://pilot.example', 'x-csrf-token': 'expected' } }, session));
  assert.throws(() => requireCsrf({ headers: { host: 'pilot.example', origin: 'https://pilot.example', 'x-csrf-token': 'wrong' } }, session), error => error.status === 403);
  assert.throws(() => requireCsrf({ headers: { host: 'pilot.example', origin: 'https://attacker.example', 'x-csrf-token': 'expected' } }, session), error => error.status === 403);
});
