import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTelemetryPayload, enableTelemetry, incrementTelemetryCounter, resetTelemetryIdentity, sendTelemetry, telemetryUrl } from '../src/telemetry.js';
import { defaultTelemetryState } from '../src/store.js';

const baseStore = () => ({ telemetry: defaultTelemetryState(), policies: { 'secret-container': { auto: true } }, settings: { webhook: { enabled: true } } });
const containers = [{ id: 'a', name: 'secret-container', image: 'private.example/team/secret:prod', state: 'running' }, { id: 'b', name: 'other', image: 'ghcr.io/org/app:1', state: 'exited' }];
const dockerInfo = { Architecture: 'x86_64', ServerVersion: '28.3.0', ApiVersion: '1.51', OperatingSystem: 'Debian GNU/Linux 13', KernelVersion: '6.12.38-custom-host' };
const inspect = async ({}) => ({ Config: { Healthcheck: {} } });

test('telemetry is disabled by default and identity is random, persistent, and resettable', () => {
  const store = baseStore(); assert.equal(store.telemetry.enabled, false); assert.equal(store.telemetry.installation_id, null);
  enableTelemetry(store); const first = store.telemetry.installation_id; assert.match(first, /^[0-9a-f-]{36}$/); assert.ok(store.telemetry.delete_token); enableTelemetry(store); assert.equal(store.telemetry.installation_id, first);
  resetTelemetryIdentity(store); assert.equal(store.telemetry.installation_id, null); enableTelemetry(store); assert.notEqual(store.telemetry.installation_id, first);
});

test('payload contains only aggregated allow-listed data', async () => {
  const store = baseStore(); enableTelemetry(store);
  const payload = await buildTelemetryPayload({ store, version: '0.9.0-rc.10', nativeHttps: true, dockerInfo, containers, inspect, registries: ['generic'] });
  assert.deepEqual(payload.containers, { total: 2, running: 1, stopped: 1, with_healthcheck: 2, automatic_updates_enabled: 1 });
  assert.equal(payload.system.kernel, '6.12'); assert.equal(payload.registries.generic_oci, true);
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const forbidden of ['secret-container','private.example','team/secret','prod','container_id','image_name','hostname','mac_address','environment','mount','volume','label','compose_project','registry_domain']) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test('preview builder output exactly equals transmitted payload', async () => {
  const store = baseStore(); enableTelemetry(store); const preview = await buildTelemetryPayload({ store, version: '1.0.0', dockerInfo, containers, inspect, registries: [] }); let transmitted;
  const now = new Date('2026-08-21T14:20:00.000Z');
  const result = await sendTelemetry({ store, buildPayload: () => buildTelemetryPayload({ store, version: '1.0.0', dockerInfo, containers, inspect, registries: [] }), url: 'http://localhost:3090/api/v1/telemetry', now: () => now, fetchImpl: async (_url, options) => { transmitted = JSON.parse(options.body); return { ok: true, json: async () => ({ status: 'accepted' }) }; } });
  assert.equal(result.ok, true); assert.deepEqual(transmitted, preview);
  assert.equal(store.telemetry.last_attempt, now.toISOString());
  assert.equal(store.telemetry.last_successful_report, now.toISOString());
  assert.equal(store.telemetry.last_status, 'successful');
});

test('tracker failures are fail-open and reduced to safe statuses', async () => {
  for (const [response, expected] of [[{ ok:false,status:500 },'http_500'],[{ ok:false,status:503 },'http_503'],[{ ok:false,status:429 },'http_429']]) { const store=baseStore();enableTelemetry(store);const result=await sendTelemetry({store,buildPayload:async()=>({}),url:'http://localhost/test',fetchImpl:async()=>response});assert.equal(result.ok,false);assert.equal(result.error,expected); }
  const store=baseStore();enableTelemetry(store);const dns=await sendTelemetry({store,buildPayload:async()=>({}),url:'http://localhost/test',fetchImpl:async()=>{throw new Error('getaddrinfo ENOTFOUND')}});assert.deepEqual(dns,{ok:false,error:'connection_failed'});
  for (const error of [Object.assign(new Error('aborted'),{name:'TimeoutError'}),new Error('TLS certificate failure')]) { const state=baseStore();enableTelemetry(state);const result=await sendTelemetry({store:state,buildPayload:async()=>({}),url:'http://localhost/test',fetchImpl:async()=>{throw error}});assert.equal(result.ok,false); }
  const invalid=baseStore();enableTelemetry(invalid);assert.equal((await sendTelemetry({store:invalid,buildPayload:async()=>({}),url:'http://localhost/test',fetchImpl:async()=>({ok:true,json:async()=>({wrong:true})})})).error,'invalid_response');
});

test('counters are cumulative and endpoint policy rejects public HTTP', () => { const store=baseStore(); incrementTelemetryCounter(store,'successful_updates'); incrementTelemetryCounter(store,'successful_updates'); incrementTelemetryCounter(store,'failed_updates'); incrementTelemetryCounter(store,'automatic_rollbacks'); incrementTelemetryCounter(store,'manual_rollbacks'); assert.deepEqual({s:store.telemetry.successful_updates,f:store.telemetry.failed_updates,a:store.telemetry.automatic_rollbacks,m:store.telemetry.manual_rollbacks},{s:2,f:1,a:1,m:1}); assert.throws(()=>telemetryUrl('http://example.com/telemetry'),/HTTPS/); });
