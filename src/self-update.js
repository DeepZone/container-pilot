import fs from 'node:fs';
import path from 'node:path';
import { dockerRequest, inspectContainer, listContainers } from './docker.js';

const repository = process.env.CP_SELF_UPDATE_REPOSITORY || 'DeepZone/container-pilot';
const imageRepository = process.env.CP_SELF_UPDATE_IMAGE || 'ghcr.io/deepzone/container-pilot';
const channel = process.env.CP_SELF_UPDATE_CHANNEL || 'stable';
const statusFile = process.env.CP_SELF_UPDATE_STATUS_FILE || '/data/self-update.json';

export function compareVersions(left, right) {
  const parse = value => String(value || '').replace(/^v/, '').split('-', 2).map((part, index) => index ? part : part.split('.').map(Number));
  const [a, aPre] = parse(left); const [b, bPre] = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference) return Math.sign(difference);
  }
  if (aPre === bPre) return 0;
  if (!aPre) return 1;
  if (!bPre) return -1;
  return aPre.localeCompare(bPre, undefined, { numeric: true });
}

export function selectRelease(releases, currentVersion, selectedChannel = 'stable') {
  const candidates = releases.filter(item => !item.draft && (selectedChannel === 'prerelease' || !item.prerelease));
  const release = candidates.sort((left, right) => compareVersions(right.tag_name, left.tag_name))[0];
  if (!release) return null;
  const version = release.tag_name.replace(/^v/, '');
  return {
    version,
    tag: release.tag_name,
    name: release.name || release.tag_name,
    notes: String(release.body || '').slice(0, 4_000),
    publishedAt: release.published_at,
    url: release.html_url,
    image: `${imageRepository}:${version}`,
    available: compareVersions(version, currentVersion) > 0,
  };
}

export async function checkSelfUpdate(currentVersion) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=30`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': `container-pilot/${currentVersion}` },
  });
  if (!response.ok) throw new Error(`GitHub-Release-Prüfung fehlgeschlagen: HTTP ${response.status}`);
  return { currentVersion, channel, repository, release: selectRelease(await response.json(), currentVersion, channel) };
}

export function readSelfUpdateStatus() {
  try { return JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') console.error('Self-Update-Status konnte nicht gelesen werden', error);
    return null;
  }
}

export function writeSelfUpdateStatus(status) {
  fs.mkdirSync(path.dirname(statusFile), { recursive: true });
  const temporary = `${statusFile}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(status, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, statusFile);
}

function updaterMounts(current) {
  return current.Mounts.filter(mount => ['/data', '/var/run/docker.sock'].includes(mount.Destination)).map(mount => ({
    Type: mount.Type,
    Source: mount.Type === 'volume' ? mount.Name : mount.Source,
    Target: mount.Destination,
    ReadOnly: false,
  }));
}

export async function launchSelfUpdater(target) {
  const current = (await listContainers()).find(container => container.name === (process.env.CP_SELF_CONTAINER_NAME || 'container-pilot'));
  if (!current) throw new Error('Container Pilot wurde in Docker nicht gefunden');
  const inspection = await inspectContainer(current.id);
  const mounts = updaterMounts(inspection);
  if (!mounts.some(mount => mount.Target === '/data') || !mounts.some(mount => mount.Target === '/var/run/docker.sock')) {
    throw new Error('Self-Update benötigt das Datenvolume und den Docker-Socket');
  }
  const operationId = `self-update-${Date.now()}`;
  writeSelfUpdateStatus({ operationId, state: 'queued', fromVersion: inspection.Config.Labels?.['org.opencontainers.image.version'] || null, toVersion: target.version, targetImage: target.image, startedAt: new Date().toISOString() });
  const helper = await dockerRequest('POST', `/containers/create?name=${encodeURIComponent(`container-pilot-updater-${Date.now()}`)}`, {
    Image: inspection.Image,
    Cmd: ['node', 'src/self-updater.js'],
    Env: [
      `CP_SELF_TARGET_IMAGE=${target.image}`,
      `CP_SELF_TARGET_VERSION=${target.version}`,
      `CP_SELF_TARGET_CONTAINER=${current.id}`,
      `CP_SELF_UPDATE_STATUS_FILE=${statusFile}`,
      `CP_SELF_OPERATION_ID=${operationId}`,
    ],
    Labels: { 'container-pilot.watch': 'false', 'container-pilot.role': 'self-updater' },
    HostConfig: {
      AutoRemove: true,
      ReadonlyRootfs: true,
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges:true'],
      Mounts: mounts,
      Tmpfs: { '/tmp': 'size=16m,mode=1777' },
    },
  });
  await dockerRequest('POST', `/containers/${helper.Id}/start`);
  return { operationId, helperId: helper.Id, targetImage: target.image };
}
