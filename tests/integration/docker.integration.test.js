import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { replaceContainer } from '../../src/docker.js';

const enabled = process.env.CP_RUN_DOCKER_INTEGRATION === '1';
const suffix = `${process.pid}-${Date.now()}`;
const name = `container-pilot-integration-${suffix}`;
const network = `${name}-network`;
const volume = `${name}-data`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();

test('preserves Compose-relevant configuration and restores an unhealthy update', { skip: !enabled, timeout: 120_000 }, async (t) => {
  docker('pull', 'alpine:3.19');
  docker('pull', 'alpine:3.20');
  docker('pull', 'busybox:latest');
  docker('network', 'create', network);
  docker('volume', 'create', volume);
  t.after(() => {
    try { docker('rm', '-f', name); } catch {}
    try { docker('network', 'rm', network); } catch {}
    try { docker('volume', 'rm', volume); } catch {}
  });

  docker('run', '-d', '--name', name, '--network', network, '--hostname', 'pilot-fixture',
    '--label', 'com.docker.compose.project=pilot-test', '--label', 'com.docker.compose.service=fixture',
    '--env', 'PILOT_VALUE=preserved', '--mount', `type=volume,source=${volume},target=/data`,
    '--health-cmd', 'test -f /etc/alpine-release', '--health-interval', '1s', '--health-retries', '2',
    'alpine:3.19', 'sleep', '300');
  docker('exec', name, 'sh', '-c', 'echo original > /data/value');

  const firstId = docker('inspect', '--format', '{{.Id}}', name);
  const updated = await replaceContainer(firstId, 'alpine:3.20');
  assert.equal(updated.readiness.health, 'healthy');
  const state = JSON.parse(docker('inspect', name))[0];
  assert.equal(state.Config.Hostname, 'pilot-fixture');
  assert.ok(state.Config.Env.includes('PILOT_VALUE=preserved'));
  assert.equal(state.Config.Labels['com.docker.compose.project'], 'pilot-test');
  assert.ok(state.NetworkSettings.Networks[network]);
  assert.ok(state.Mounts.some(mount => mount.Name === volume && mount.Destination === '/data'));
  assert.equal(docker('exec', name, 'cat', '/data/value'), 'original');

  await assert.rejects(() => replaceContainer(state.Id, 'busybox:latest'), /Update zurückgerollt: Healthcheck meldet unhealthy/);
  const restored = JSON.parse(docker('inspect', name))[0];
  assert.equal(restored.Config.Image, 'alpine:3.20');
  assert.equal(restored.State.Running, true);
  assert.equal(docker('exec', name, 'cat', '/data/value'), 'original');
});
