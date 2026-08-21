import crypto from 'node:crypto';
import { dockerRequest, inspectContainer, listContainers, parseImage } from './docker.js';
import { configuredRegistries } from './registry-auth.js';
import { defaultTelemetryState } from './store.js';

export const TELEMETRY_SCHEMA_VERSION = 1;
export const DEFAULT_TELEMETRY_URL = 'https://cp-track.noisens.de/api/v1/telemetry';
export const REPORT_INTERVAL_MS = 24 * 60 * 60 * 1_000;
export const JITTER_MIN_MS = 2 * 60_000;
export const JITTER_MAX_MS = 15 * 60_000;

export function ensureTelemetryState(store) {
  store.telemetry = { ...defaultTelemetryState(), ...(store.telemetry || {}) };
  return store.telemetry;
}

export function enableTelemetry(store) {
  const telemetry = ensureTelemetryState(store);
  if (!telemetry.installation_id) telemetry.installation_id = crypto.randomUUID();
  if (!telemetry.delete_token) telemetry.delete_token = crypto.randomBytes(32).toString('base64url');
  telemetry.enabled = true;
  return telemetry;
}

export function resetTelemetryIdentity(store) {
  store.telemetry = defaultTelemetryState();
  return store.telemetry;
}

export function incrementTelemetryCounter(store, name) {
  const telemetry = ensureTelemetryState(store);
  if (!['successful_updates', 'failed_updates', 'automatic_rollbacks', 'manual_rollbacks'].includes(name)) throw new Error('Unknown telemetry counter');
  telemetry[name] = Math.max(0, Number(telemetry[name]) || 0) + 1;
}

function architecture(value) {
  const normalized = String(value || '').toLowerCase();
  return ({ x86_64: 'amd64', aarch64: 'arm64', i386: '386', i686: '386' })[normalized]
    || (['amd64', 'arm64', 'arm', '386'].includes(normalized) ? normalized : 'other');
}
function shortKernel(value) { return String(value || '').match(/^\d+\.\d+/)?.[0] || 'other'; }
function registryCategories(containers) {
  const values = { docker_hub: false, ghcr: false, gitlab: false, generic_oci: false };
  for (const container of containers) {
    const registry = parseImage(container.image).registry.toLowerCase();
    if (registry === 'docker.io') values.docker_hub = true;
    else if (registry === 'ghcr.io') values.ghcr = true;
    else if (registry.includes('gitlab')) values.gitlab = true;
    else values.generic_oci = true;
  }
  return values;
}
function releaseChannel(version) {
  if (version.includes('-rc.')) return 'rc';
  if (version.includes('-')) return 'prerelease';
  return 'stable';
}

export async function buildTelemetryPayload({ store, version, nativeHttps = false, dockerInfo, dockerVersion, containers, inspect = inspectContainer, registries = configuredRegistries() }) {
  const telemetry = ensureTelemetryState(store);
  if (!telemetry.installation_id) throw new Error('Telemetry identity is not initialized');
  const safeContainers = containers || await listContainers();
  const info = dockerInfo || await dockerRequest('GET', '/info');
  const engine = dockerVersion || (dockerInfo ? dockerInfo : await dockerRequest('GET', '/version'));
  const health = await Promise.all(safeContainers.map(async container => {
    try { return Boolean((await inspect(container.id)).Config?.Healthcheck); } catch { return false; }
  }));
  const configured = Array.isArray(registries) && registries.length > 0;
  return {
    schema_version: TELEMETRY_SCHEMA_VERSION,
    installation_id: telemetry.installation_id,
    delete_token_hash: crypto.createHash('sha256').update(telemetry.delete_token).digest('hex'),
    container_pilot: { version, channel: releaseChannel(version) },
    system: {
      architecture: architecture(info.Architecture), docker_version: String(engine.Version || info.ServerVersion || 'unknown').slice(0, 64),
      docker_api_version: String(engine.ApiVersion || info.ApiVersion || 'unknown').slice(0, 32), os: String(info.OperatingSystem || info.OSType || 'unknown').slice(0, 128),
      kernel: shortKernel(info.KernelVersion),
    },
    containers: {
      total: safeContainers.length, running: safeContainers.filter(item => item.state === 'running').length,
      stopped: safeContainers.filter(item => item.state !== 'running').length, with_healthcheck: health.filter(Boolean).length,
      automatic_updates_enabled: safeContainers.filter(item => (store.policies[item.name] || { auto: process.env.CP_AUTO_DEFAULT === 'true' }).auto).length,
    },
    features: {
      watchtower_import_used: telemetry.watchtower_import_used === true, native_https_enabled: nativeHttps,
      private_registry_configured: configured, webhook_configured: store.settings?.webhook?.enabled === true,
    },
    registries: registryCategories(safeContainers),
    updates: {
      successful: telemetry.successful_updates, failed: telemetry.failed_updates,
      automatic_rollbacks: telemetry.automatic_rollbacks, manual_rollbacks: telemetry.manual_rollbacks,
    },
  };
}

export function telemetryUrl(value = process.env.CP_TELEMETRY_URL || DEFAULT_TELEMETRY_URL) {
  const url = new URL(value);
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('Telemetry endpoint must use HTTPS');
  return url.toString();
}

export async function sendTelemetry({ store, buildPayload, fetchImpl = fetch, url, timeoutMs = 8_000, now = () => new Date() }) {
  const telemetry = ensureTelemetryState(store);
  telemetry.last_attempt = now().toISOString();
  try {
    const payload = await buildPayload();
    const response = await fetchImpl(telemetryUrl(url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`http_${response.status}`);
    let result;
    try { result = await response.json(); } catch { throw new Error('invalid_response'); }
    if (result?.status !== 'accepted') throw new Error('invalid_response');
    telemetry.last_successful_report = telemetry.last_attempt;
    telemetry.last_status = 'successful';
    return { ok: true, payload };
  } catch (error) {
    telemetry.last_status = safeTelemetryError(error);
    return { ok: false, error: telemetry.last_status };
  }
}

export function safeTelemetryError(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout';
  if (/^http_\d{3}$/.test(error?.message || '')) return error.message;
  if (/invalid_response/.test(error?.message || '')) return 'invalid_response';
  if (/certificate|tls|ssl|cert_/i.test(`${error?.message || ''} ${error?.cause?.code || ''}`)) return 'tls_error';
  return 'connection_failed';
}

export function nextAutomaticReport(telemetry, now = Date.now()) {
  if (!telemetry?.enabled) return null;
  const due = telemetry.last_successful_report ? new Date(telemetry.last_successful_report).getTime() + REPORT_INTERVAL_MS : now;
  return new Date(Math.max(now, due)).toISOString();
}

export function randomJitter(random = Math.random) { return JITTER_MIN_MS + Math.floor(random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)); }
