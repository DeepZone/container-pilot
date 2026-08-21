import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePayload } from '../src/validation.js';

import { validPayload } from '../test-support/payload.js';
test('valid payload is accepted',()=>assert.equal(validatePayload(validPayload()),null));
test('unknown fields and invalid schema are rejected',()=>{const unknown=validPayload();unknown.hostname='secret';assert.ok(validatePayload(unknown));const schema=validPayload();schema.schema_version=2;assert.ok(validatePayload(schema));});
test('invalid UUID, architecture, version, and negative values are rejected',()=>{for(const mutate of [p=>p.installation_id='bad',p=>p.system.architecture='mips-host',p=>p.container_pilot.version='x'.repeat(65),p=>p.updates.failed=-1]){const p=validPayload();mutate(p);assert.ok(validatePayload(p));}});
test('cross-field container totals are validated',()=>{const p=validPayload();p.containers.running=20;assert.equal(validatePayload(p),'invalid_container_totals');});
