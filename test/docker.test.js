import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImage } from '../src/docker.js';

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
