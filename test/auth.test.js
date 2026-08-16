import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createSession, readSession, destroySession, sessionCookie } from '../src/auth.js';

test('password hashes are salted and verifiable', () => {
  const first = hashPassword('a sufficiently long password');
  const second = hashPassword('a sufficiently long password');
  assert.notEqual(first, second);
  assert.equal(verifyPassword('a sufficiently long password', first), true);
  assert.equal(verifyPassword('wrong password', first), false);
});

test('sessions are read from hardened cookies and can be destroyed', () => {
  const created = createSession('admin', 'admin');
  assert.match(sessionCookie(created.token), /HttpOnly; SameSite=Strict/);
  assert.equal(readSession(`foo=bar; cp_session=${created.token}`).username, 'admin');
  destroySession(created.token);
  assert.equal(readSession(`cp_session=${created.token}`), null);
});
