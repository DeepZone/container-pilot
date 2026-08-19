import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImage, digestReference, validateReplacement, reconcileImageDefaults, assertImageUnused, waitForContainerReady } from '../src/docker.js';

test('parses short Docker Hub images', () => {
  assert.deepEqual(parseImage('redis:8.0'), {
    registry: 'docker.io', repository: 'library/redis', tag: '8.0', canonical: 'docker.io/library/redis:8.0',
  });
});

test('parses GHCR images and tags', () => {
  assert.deepEqual(parseImage('ghcr.io/immich-app/immich-server:v3'), {
    registry: 'ghcr.io', repository: 'immich-app/immich-server', tag: 'v3', canonical: 'ghcr.io/immich-app/immich-server:v3',
  });
});

test('removes a pinned digest for registry checks', () => {
  assert.equal(parseImage('valkey/valkey:9@sha256:abc').tag, '9');
});

test('builds immutable rollback references from local digests', () => {
  assert.equal(digestReference('redis:latest', 'sha256:abc'), 'library/redis@sha256:abc');
  assert.equal(digestReference('ghcr.io/example/app:v2', 'sha256:def'), 'ghcr.io/example/app@sha256:def');
});

test('rejects unsafe container replacement modes', () => {
  assert.throws(() => validateReplacement({ HostConfig: { AutoRemove: true } }), /AutoRemove/);
  assert.throws(() => validateReplacement({ HostConfig: { NetworkMode: 'container:abc' } }), /Netzwerkmodus/);
  assert.doesNotThrow(() => validateReplacement({ HostConfig: { AutoRemove: false, NetworkMode: 'bridge' } }));
});

test('uses target image commands when the current commands were inherited', () => {
  const result = reconcileImageDefaults(
    { Entrypoint: ['/entrypoint'], Cmd: ['nginx', '-g', 'daemon off;'] },
    { Entrypoint: ['/entrypoint'], Cmd: ['nginx', '-g', 'daemon off;'] },
    { Entrypoint: ['/entrypoint'], Cmd: ['apache2-foreground'] },
  );
  assert.deepEqual(result.Cmd, ['apache2-foreground']);
});

test('preserves explicit command overrides across image variants', () => {
  const result = reconcileImageDefaults(
    { Entrypoint: ['/custom-entrypoint'], Cmd: ['serve', '--custom'] },
    { Entrypoint: ['/entrypoint'], Cmd: ['serve'] },
    { Entrypoint: ['/new-entrypoint'], Cmd: ['apache2-foreground'] },
  );
  assert.deepEqual(result.Entrypoint, ['/custom-entrypoint']);
  assert.deepEqual(result.Cmd, ['serve', '--custom']);
});

test('protects rollback images still used by another container', () => {
  assert.throws(() => assertImageUnused('sha256:old', [
    { name: 'another-service', imageId: 'sha256:old' },
  ]), /another-service/);
  assert.doesNotThrow(() => assertImageUnused('sha256:old', [
    { name: 'updated-service', imageId: 'sha256:new' },
  ]));
});

test('accepts a healthy replacement and rejects an unhealthy one', async () => {
  const healthy = async () => ({ Config: { Healthcheck: {} }, State: { Running: true, Health: { Status: 'healthy' } } });
  assert.deepEqual(await waitForContainerReady('demo', { timeoutSeconds: 1, intervalMilliseconds: 1, inspect: healthy }), { state: 'running', health: 'healthy' });
  const unhealthy = async () => ({ Config: { Healthcheck: {} }, State: { Running: true, Health: { Status: 'unhealthy', Log: [{ Output: 'probe failed' }] } } });
  await assert.rejects(waitForContainerReady('demo', { timeoutSeconds: 1, intervalMilliseconds: 1, inspect: unhealthy }), /probe failed/);
});

test('rejects restart loops during startup observation without a healthcheck', async () => {
  let calls = 0;
  const inspect = async () => ({ Config: {}, RestartCount: calls++, State: { Running: true } });
  await assert.rejects(waitForContainerReady('demo', { graceSeconds: 0.003, intervalMilliseconds: 1, inspect }), /nicht stabil/);
});
