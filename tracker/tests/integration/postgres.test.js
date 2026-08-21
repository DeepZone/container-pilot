import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

test('PostgreSQL integration upserts, preserves cumulative counters, aggregates, and cascades deletion', { skip: process.env.TRACKER_RUN_POSTGRES_INTEGRATION !== '1' }, async () => {
  const { migrate, pool, saveReport, deleteInstallation } = await import('../../src/db.js');
  const { summary } = await import('../../src/dashboard-data.js');
  const { createPublicHandler } = await import('../../src/public-api.js'); const { buildTelemetryPayload, enableTelemetry } = await import('../../../src/telemetry.js'); const { defaultTelemetryState } = await import('../../../src/store.js');
  const store={telemetry:defaultTelemetryState(),policies:{},settings:{webhook:{enabled:false}}};enableTelemetry(store);store.telemetry.successful_updates=20;
  const build=()=>buildTelemetryPayload({store,version:'0.9.0-rc.10',nativeHttps:true,dockerInfo:{Architecture:'amd64',ServerVersion:'28.3.0',ApiVersion:'1.51',OperatingSystem:'Debian GNU/Linux 13',KernelVersion:'6.12.1'},containers:[],registries:[]});
  const handler=createPublicHandler({query:(...args)=>pool.query(...args),saveReport,deleteInstallation,log:{info(){},warn(){}}});
  const request=async({method='POST',url='/api/v1/telemetry',headers={},payload})=>{const req=Readable.from(payload?[Buffer.from(JSON.stringify(payload))]:[]);Object.assign(req,{method,url,headers,socket:{remoteAddress:'127.0.0.1'}});let status;const res={writeHead(value){status=value;return this;},end(){}};await handler(req,res);return status;};
  await migrate();const first=await build();await pool.query('DELETE FROM installations WHERE installation_id=$1',[first.installation_id]);assert.equal(await request({payload:first}),202);store.telemetry.successful_updates=24;assert.equal(await request({payload:await build()}),202);
  const installation=await pool.query('SELECT successful_updates FROM installations WHERE installation_id=$1',[first.installation_id]);const reports=await pool.query('SELECT count(*)::int count FROM reports WHERE installation_id=$1',[first.installation_id]);assert.equal(installation.rows[0].successful_updates,24);assert.equal(reports.rows[0].count,2);
  const data=await summary(7);assert.ok(data.timeline.some(row=>row.successful_updates===4));assert.equal(await request({method:'DELETE',url:`/api/v1/telemetry/${first.installation_id}`,headers:{authorization:`Bearer ${store.telemetry.delete_token}`}}),200);assert.equal((await pool.query('SELECT count(*)::int count FROM reports WHERE installation_id=$1',[first.installation_id])).rows[0].count,0);await pool.end();
});
