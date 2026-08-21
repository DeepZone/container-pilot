import crypto from 'node:crypto';

const sessions = new Map();
const attempts = new Map();
const SESSION_MS = Math.max(5, Number(process.env.TRACKER_SESSION_MINUTES || 60)) * 60_000;
const WINDOW_MS = 15 * 60_000;
export function loginAllowed(key, now = Date.now()) { const recent = (attempts.get(key) || []).filter(at => now - at < WINDOW_MS); attempts.set(key, recent); return recent.length < 10; }
export function loginFailed(key) { attempts.set(key, [...(attempts.get(key) || []), Date.now()]); }
export function loginSucceeded(key) { attempts.delete(key); }
export function createSession() { const token = crypto.randomBytes(32).toString('base64url'); const csrf = crypto.randomBytes(24).toString('base64url'); sessions.set(token, { csrf, expires: Date.now() + SESSION_MS }); return { token, csrf }; }
export function readSession(cookie = '') { const token = cookie.match(/(?:^|;\s*)tracker_session=([^;]+)/)?.[1]; const session = token && sessions.get(token); if (!session || session.expires <= Date.now()) { if (token) sessions.delete(token); return null; } return { token, ...session }; }
export function destroySession(token) { sessions.delete(token); }
export function cleanupSessions(now = Date.now()) { for (const [token, session] of sessions) if (session.expires <= now) sessions.delete(token); }
export function cookie(token, secure = false) { return `tracker_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure ? '; Secure' : ''}`; }
export const clearCookie = () => 'tracker_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
export function safeEqual(left, right) { const a = Buffer.from(String(left)); const b = Buffer.from(String(right)); return a.length === b.length && crypto.timingSafeEqual(a, b); }
export function validCredentials(username, password, expectedUser, expectedPassword) { return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword); }
