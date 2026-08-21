import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupSessions, cookie, createSession, loginAllowed, loginFailed, readSession, safeEqual, validCredentials } from '../src/auth.js';

test('dashboard sessions use hardened cookies and expire', () => { const session=createSession();const value=cookie(session.token,true);assert.match(value,/HttpOnly/);assert.match(value,/SameSite=Strict/);assert.match(value,/Secure/);assert.equal(readSession(value).csrf,session.csrf);cleanupSessions(Date.now()+2*60*60_000);assert.equal(readSession(value),null); });
test('dashboard authentication accepts valid and rejects wrong credentials',()=>{assert.equal(safeEqual('correct','correct'),true);assert.equal(validCredentials('admin','correct','admin','correct'),true);assert.equal(validCredentials('admin','wrong','admin','correct'),false);assert.equal(validCredentials('viewer','correct','admin','correct'),false);});
test('login rate limiting rejects repeated failures',()=>{const key=`test-${Date.now()}`;for(let i=0;i<10;i++){assert.equal(loginAllowed(key),true);loginFailed(key);}assert.equal(loginAllowed(key),false);});
