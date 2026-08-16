import crypto from 'node:crypto';

const sessions = new Map();
const SESSION_TTL = 12 * 60 * 60 * 1000;

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, encoded) {
  const [kind, salt, expected] = String(encoded || '').split('$');
  if (kind !== 'scrypt' || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const wanted = Buffer.from(expected, 'hex');
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}

export function createSession(username, role) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  sessions.set(token, { username, role, csrf, expires: Date.now() + SESSION_TTL });
  return { token, csrf, expires: Date.now() + SESSION_TTL };
}

export function readSession(cookieHeader = '') {
  const token = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith('cp_session='))?.slice(11);
  const session = token && sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) { sessions.delete(token); return null; }
  session.expires = Date.now() + SESSION_TTL;
  return { token, ...session };
}

export function destroySession(token) { if (token) sessions.delete(token); }
export function destroyUserSessions(username) {
  for (const [token, session] of sessions) if (session.username === username) sessions.delete(token);
}

export function sessionCookie(token) {
  return `cp_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}`;
}
export function clearSessionCookie() { return 'cp_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'; }
