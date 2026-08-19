import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, selectRelease } from '../src/self-update.js';

test('compares stable and prerelease versions', () => {
  assert.equal(compareVersions('0.9.0', '0.9.0-rc.5'), 1);
  assert.equal(compareVersions('v0.9.0-rc.6', '0.9.0-rc.5'), 1);
  assert.equal(compareVersions('0.9.0-rc.5', '0.9.0-rc.5'), 0);
});

test('stable channel ignores prereleases', () => {
  const releases = [
    { tag_name: 'v1.1.0-rc.1', prerelease: true, draft: false },
    { tag_name: 'v1.0.1', prerelease: false, draft: false },
  ];
  assert.equal(selectRelease(releases, '1.0.0', 'stable').version, '1.0.1');
  assert.equal(selectRelease(releases, '1.0.0', 'prerelease').version, '1.1.0-rc.1');
});
