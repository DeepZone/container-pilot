import crypto from 'node:crypto';
import { UUID_V4, validatePayload } from './validation.js';

const MAX_BODY = 16 * 1024;
const security = { 'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",'referrer-policy':'no-referrer' };
function json(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{...security,'content-length':Buffer.byteLength(body)});res.end(body);}
async function parseBody(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw Object.assign(new Error('payload_too_large'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw Object.assign(new Error('invalid_json'),{status:400});}}
function allow(map,key,max,windowMs){const now=Date.now();const recent=(map.get(key)||[]).filter(at=>now-at<windowMs);if(recent.length>=max)return false;recent.push(now);map.set(key,recent);return true;}

export function createPublicHandler({ query, saveReport, deleteInstallation, log = console }) {
  const installRates=new Map();const ipRates=new Map();
  return async function publicHandler(req,res){
    try{const url=new URL(req.url,'http://tracker');
      if(req.method==='GET'&&url.pathname==='/healthz'){await query('SELECT 1');return json(res,200,{status:'ok'});}
      if(req.method==='POST'&&url.pathname==='/api/v1/telemetry'){
        if(!allow(ipRates,req.socket.remoteAddress||'unknown',60,3600000))return json(res,429,{error:'rate_limited'});
        const payload=await parseBody(req);const invalid=validatePayload(payload);if(invalid)return json(res,400,{error:invalid});
        if(!allow(installRates,payload.installation_id,10,3600000))return json(res,429,{error:'rate_limited'});
        await saveReport(payload);log.info(`telemetry report accepted ${payload.installation_id.slice(0,8)}…`);return json(res,202,{status:'accepted'});
      }
      const deletion=url.pathname.match(/^\/api\/v1\/telemetry\/([0-9a-f-]+)$/i);
      if(req.method==='DELETE'&&deletion&&UUID_V4.test(deletion[1])){const token=req.headers.authorization?.match(/^Bearer (.{20,200})$/)?.[1];if(!token)return json(res,401,{error:'unauthorized'});const hash=crypto.createHash('sha256').update(token).digest('hex');return await deleteInstallation(deletion[1],hash)?json(res,200,{status:'deleted'}):json(res,403,{error:'unauthorized'});}
      return json(res,404,{error:'not_found'});
    }catch(error){log.warn(`telemetry report rejected ${error.status||500}`);return json(res,error.status||500,{error:error.status?error.message:'internal_error'});}
  };
}
