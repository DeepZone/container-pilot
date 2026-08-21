import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createPublicHandler } from '../src/public-api.js';
import { validPayload } from '../test-support/payload.js';

function fixture() { const saved=[]; return { saved, handler:createPublicHandler({query:async()=>({}),saveReport:async p=>saved.push(p),deleteInstallation:async(_id,hash)=>hash.length===64,log:{info(){},warn(){}}}) }; }
async function request(handler,{method='GET',url='/',headers={},body=''}){const req=Readable.from(body?[Buffer.from(body)]:[]);Object.assign(req,{method,url,headers,socket:{remoteAddress:'127.0.0.1'}});let status,output='';const responseHeaders={};const res={writeHead(value,next={}){status=value;Object.assign(responseHeaders,next);return this;},end(value=''){output+=value;}};await handler(req,res);return {status,headers:responseHeaders,json:()=>JSON.parse(output)};}
test('public listener accepts reports but exposes no dashboard routes',async()=>{const f=fixture();const accepted=await request(f.handler,{method:'POST',url:'/api/v1/telemetry',body:JSON.stringify(validPayload())});assert.equal(accepted.status,202);assert.equal(f.saved.length,1);for(const url of ['/','/dashboard','/admin','/stats','/api/dashboard/summary'])assert.equal((await request(f.handler,{url})).status,404);});
test('oversized and invalid payloads are rejected',async()=>{const f=fixture();assert.equal((await request(f.handler,{method:'POST',url:'/api/v1/telemetry',body:'x'.repeat(17*1024)})).status,413);assert.equal((await request(f.handler,{method:'POST',url:'/api/v1/telemetry',body:JSON.stringify({...validPayload(),hostname:'secret'})})).status,400);});
test('delete endpoint requires a bearer token',async()=>{const f=fixture();const url='/api/v1/telemetry/5f1776a8-5ca6-44e6-bc81-f7804681ed80';assert.equal((await request(f.handler,{method:'DELETE',url})).status,401);assert.equal((await request(f.handler,{method:'DELETE',url,headers:{authorization:'Bearer this-is-a-long-delete-token-value'}})).status,200);});
