const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const text = (value, max, pattern = /^[\x20-\x7e]+$/) => typeof value === 'string' && value.length > 0 && value.length <= max && pattern.test(value);
const count = value => Number.isInteger(value) && value >= 0 && value <= 1_000_000;
const bools = (value, keys) => exact(value, keys) && keys.every(key => typeof value[key] === 'boolean');
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$/;

export function validatePayload(payload) {
  const top = ['schema_version', 'installation_id', 'delete_token_hash', 'container_pilot', 'system', 'containers', 'features', 'registries', 'updates'];
  if (!exact(payload, top)) return 'unknown_or_missing_field';
  if (payload.schema_version !== 1) return 'invalid_schema_version';
  if (!UUID_V4.test(payload.installation_id || '')) return 'invalid_installation_id';
  if (!/^[0-9a-f]{64}$/.test(payload.delete_token_hash || '')) return 'invalid_delete_token_hash';
  if (!exact(payload.container_pilot, ['version', 'channel']) || !text(payload.container_pilot.version, 64, VERSION) || !['stable', 'rc', 'prerelease'].includes(payload.container_pilot.channel)) return 'invalid_container_pilot';
  if (!exact(payload.system, ['architecture', 'docker_version', 'docker_api_version', 'os', 'kernel'])) return 'invalid_system';
  if (!['amd64', 'arm64', 'arm', '386', 'other'].includes(payload.system.architecture) || !text(payload.system.docker_version, 64) || !text(payload.system.docker_api_version, 32) || !text(payload.system.os, 128) || !/^(?:\d+\.\d+|other)$/.test(payload.system.kernel)) return 'invalid_system';
  const containerKeys = ['total', 'running', 'stopped', 'with_healthcheck', 'automatic_updates_enabled'];
  if (!exact(payload.containers, containerKeys) || !containerKeys.every(key => count(payload.containers[key]))) return 'invalid_containers';
  if (payload.containers.running + payload.containers.stopped !== payload.containers.total || payload.containers.with_healthcheck > payload.containers.total || payload.containers.automatic_updates_enabled > payload.containers.total) return 'invalid_container_totals';
  if (!bools(payload.features, ['watchtower_import_used', 'native_https_enabled', 'private_registry_configured', 'webhook_configured'])) return 'invalid_features';
  if (!bools(payload.registries, ['docker_hub', 'ghcr', 'gitlab', 'generic_oci'])) return 'invalid_registries';
  if (!exact(payload.updates, ['successful', 'failed', 'automatic_rollbacks', 'manual_rollbacks']) || !Object.values(payload.updates).every(count)) return 'invalid_updates';
  return null;
}

export { UUID_V4 };
