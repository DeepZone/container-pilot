import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { basicAuthorization, configuredRegistries, dockerRegistryAuth } from '../src/registry-auth.js';
import { parseBearerChallenge } from '../src/registry.js';

test('loads private registry credentials from a secret file without exposing them', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-registry-'));
  const file = path.join(directory, 'credentials.json');
  fs.writeFileSync(file, JSON.stringify({ 'registry.example': { username: 'pilot', password: 'secret-value' } }), { mode: 0o600 });
  process.env.CP_REGISTRY_CREDENTIALS_FILE = file;
  assert.deepEqual(configuredRegistries(), ['registry.example']);
  assert.equal(basicAuthorization('registry.example'), `Basic ${Buffer.from('pilot:secret-value').toString('base64')}`);
  const dockerAuth = JSON.parse(Buffer.from(dockerRegistryAuth('registry.example'), 'base64url').toString());
  assert.deepEqual(dockerAuth, { username: 'pilot', password: 'secret-value', serveraddress: 'registry.example' });
  delete process.env.CP_REGISTRY_CREDENTIALS_FILE;
  fs.rmSync(directory, { recursive: true });
});

test('parses OCI bearer authentication challenges', () => {
  assert.deepEqual(parseBearerChallenge('Bearer realm="https://auth.example/token",service="registry.example",scope="repository:team/app:pull"'), {
    realm: 'https://auth.example/token', service: 'registry.example', scope: 'repository:team/app:pull',
  });
});
