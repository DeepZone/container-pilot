import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImage, digestReference, validateReplacement } from '../src/docker.js';

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
