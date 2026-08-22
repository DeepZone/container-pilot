import http from 'node:http';
import { dockerRegistryAuth } from './registry-auth.js';

const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const healthTimeoutSeconds = Math.max(5, Number(process.env.CP_HEALTH_TIMEOUT_SECONDS || 120));
const startupGraceSeconds = Math.max(1, Number(process.env.CP_STARTUP_GRACE_SECONDS || 5));

export function dockerRequest(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({ socketPath, method, path, headers: {
      ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}), ...headers,
    } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) return reject(new Error(`Docker ${method} ${path}: ${res.statusCode} ${raw}`));
        if (!raw) return resolve(null);
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function listContainers() {
  const rows = await dockerRequest('GET', '/containers/json?all=1');
  return rows.map(c => ({
    id: c.Id, name: (c.Names?.[0] || '').replace(/^\//, ''), image: c.Image,
    imageId: c.ImageID, state: c.State, status: c.Status, labels: c.Labels || {},
  }));
}

export async function inspectContainer(id) {
  return dockerRequest('GET', `/containers/${encodeURIComponent(id)}/json`);
}

export async function localImageDigest(imageId, imageName) {
  const image = await dockerRequest('GET', `/images/${encodeURIComponent(imageId)}/json`);
  const parsed = parseImage(imageName);
  const prefix = `${parsed.registry === 'docker.io' ? '' : `${parsed.registry}/`}${parsed.repository}@`;
  const match = (image.RepoDigests || []).find(value => value.startsWith(prefix)) || (image.RepoDigests || [])[0];
  return match?.split('@')[1] || null;
}

export async function pullImage(image) {
  const { registry, repository, tag } = parseImage(image);
  const fromImage = registry === 'docker.io' ? repository : `${registry}/${repository}`;
  if (image.includes('@')) {
    const digest = image.split('@')[1];
    return dockerRequest('POST', `/images/create?fromImage=${encodeURIComponent(`${fromImage}@${digest}`)}`, undefined, { 'X-Registry-Auth': dockerRegistryAuth(registry) });
  }
  return dockerRequest('POST', `/images/create?fromImage=${encodeURIComponent(fromImage)}&tag=${encodeURIComponent(tag)}`, undefined, { 'X-Registry-Auth': dockerRegistryAuth(registry) });
}

export async function tagImage(sourceImage, targetImage) {
  const { registry, repository, tag } = parseImage(targetImage);
  const repositoryName = registry === 'docker.io' ? repository : `${registry}/${repository}`;
  return dockerRequest('POST', `/images/${encodeURIComponent(sourceImage)}/tag?repo=${encodeURIComponent(repositoryName)}&tag=${encodeURIComponent(tag)}`);
}

export function assertImageUnused(imageId, containers) {
  const users = containers.filter(container => container.imageId === imageId);
  if (users.length) throw Object.assign(new Error(`Das alte Image wird noch von ${users.map(container => container.name).join(', ')} verwendet`), { status: 409 });
}

export async function removeUnusedImage(imageReference) {
  const image = await dockerRequest('GET', `/images/${encodeURIComponent(imageReference)}/json`);
  assertImageUnused(image.Id, await listContainers());
  await dockerRequest('DELETE', `/images/${encodeURIComponent(image.Id)}?force=false&noprune=false`);
  return { imageId: image.Id, removed: true };
}

export function findImageIdByDigest(images, digest) {
  if (!digest) return null;
  return images.find(image => (image.RepoDigests || []).some(reference => reference.endsWith(`@${digest}`)))?.Id || null;
}

export async function resolveRollbackImage(checkpoint) {
  if (!checkpoint?.imageId && !checkpoint?.image) throw new Error('Rollback-Punkt enthält keine Image-Referenz');
  let missingImageError;
  for (const reference of [checkpoint.imageId, checkpoint.image].filter(Boolean)) {
    try {
      const image = await dockerRequest('GET', `/images/${encodeURIComponent(reference)}/json`);
      return image.Id;
    } catch (error) {
      if (!/Docker GET .*: 404 /.test(error.message)) throw error;
      missingImageError = error;
    }
  }
  const digest = checkpoint.image?.split('@')[1];
  const imageId = findImageIdByDigest(await dockerRequest('GET', '/images/json?all=1&digests=1'), digest);
  if (imageId) return imageId;
  throw missingImageError || new Error('Das lokale Rollback-Image ist nicht mehr vorhanden');
}

export function digestReference(image, digest) {
  if (!digest) return null;
  const { registry, repository } = parseImage(image);
  const name = registry === 'docker.io' ? repository : `${registry}/${repository}`;
  return `${name}@${digest}`;
}

function cleanHostConfig(host) {
  const copy = structuredClone(host);
  for (const key of ['ContainerIDFile']) delete copy[key];
  return copy;
}

function cleanContainerConfig(config, oldId) {
  const copy = structuredClone(config);
  if (copy.Hostname === oldId.slice(0, 12)) delete copy.Hostname;
  return copy;
}

const sameValue = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

// Docker inspect shows the effective command, even when it merely came from the
// image. When changing between variants (for example nginx -> latest/apache),
// carrying that effective command over would accidentally override the target
// image's own defaults. Explicit operator overrides remain untouched.
export function reconcileImageDefaults(containerConfig, sourceImageConfig = {}, targetImageConfig = {}) {
  const copy = structuredClone(containerConfig);
  for (const key of ['Entrypoint', 'Cmd']) {
    if (sameValue(copy[key], sourceImageConfig[key])) copy[key] = structuredClone(targetImageConfig[key] ?? null);
  }
  return copy;
}

function preserveMounts(hostConfig, mounts = []) {
  const copy = structuredClone(hostConfig);
  const configuredTargets = new Set([
    ...(copy.Binds || []).map(bind => bind.split(':')[1]),
    ...(copy.Mounts || []).map(mount => mount.Target),
  ]);
  copy.Mounts ||= [];
  for (const mount of mounts) {
    if (configuredTargets.has(mount.Destination) || !['volume', 'bind'].includes(mount.Type)) continue;
    copy.Mounts.push({
      Type: mount.Type,
      Source: mount.Type === 'volume' ? mount.Name : mount.Source,
      Target: mount.Destination,
      ReadOnly: !mount.RW,
      ...(mount.Type === 'bind' && mount.Propagation ? { BindOptions: { Propagation: mount.Propagation } } : {}),
    });
  }
  return copy;
}

export function validateReplacement(old) {
  if (old.HostConfig?.AutoRemove) throw new Error('Container mit AutoRemove können nicht sicher aktualisiert werden');
  if (String(old.HostConfig?.NetworkMode || '').startsWith('container:')) throw new Error('Container mit gemeinsamem Container-Netzwerkmodus können nicht sicher aktualisiert werden');
}

const delay = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function waitForContainerReady(id, {
  timeoutSeconds = healthTimeoutSeconds,
  graceSeconds = startupGraceSeconds,
  intervalMilliseconds = 1_000,
  inspect = inspectContainer,
} = {}) {
  const deadline = Date.now() + timeoutSeconds * 1_000;
  let current = await inspect(id);
  if (!current.Config?.Healthcheck) {
    const initialRestartCount = current.RestartCount || 0;
    const graceDeadline = Date.now() + graceSeconds * 1_000;
    while (Date.now() < graceDeadline) {
      await delay(Math.min(intervalMilliseconds, Math.max(1, graceDeadline - Date.now())));
      current = await inspect(id);
      if (!current.State?.Running || (current.RestartCount || 0) > initialRestartCount) {
        throw new Error(current.State?.Error || `Container blieb während der ${graceSeconds}-Sekunden-Startprüfung nicht stabil`);
      }
    }
    return { state: 'running', health: null };
  }
  while (Date.now() < deadline) {
    current = await inspect(id);
    if (!current.State?.Running) throw new Error(current.State?.Error || 'Container wurde während der Startprüfung beendet');
    const health = current.State.Health?.Status;
    if (health === 'healthy') return { state: 'running', health };
    if (health === 'unhealthy') {
      const lastOutput = current.State.Health?.Log?.at(-1)?.Output?.trim();
      throw new Error(`Healthcheck meldet unhealthy${lastOutput ? `: ${lastOutput}` : ''}`);
    }
    await delay(intervalMilliseconds);
  }
  throw new Error(`Healthcheck nach ${timeoutSeconds} Sekunden nicht erfolgreich`);
}

function cleanEndpoints(networks = {}) {
  return Object.fromEntries(Object.entries(networks).map(([name, endpoint]) => [name, {
    Aliases: endpoint.Aliases || [],
    Links: endpoint.Links || [],
    IPAMConfig: endpoint.IPAMConfig || undefined,
  }]));
}

export async function replaceContainer(id, targetImage, { pull = true } = {}) {
  const old = await inspectContainer(id);
  validateReplacement(old);
  const name = old.Name.replace(/^\//, '');
  const backup = `${name}.cp-backup-${Date.now()}`;
  const wasRunning = old.State.Running;
  if (pull) await pullImage(targetImage);
  const sourceImage = await dockerRequest('GET', `/images/${encodeURIComponent(old.Image)}/json`);
  const target = await dockerRequest('GET', `/images/${encodeURIComponent(targetImage)}/json`);
  if (wasRunning) await dockerRequest('POST', `/containers/${id}/stop?t=${encodeURIComponent(old.Config.StopTimeout ?? 30)}`);
  await dockerRequest('POST', `/containers/${id}/rename?name=${encodeURIComponent(backup)}`);
  const config = reconcileImageDefaults(cleanContainerConfig(old.Config, old.Id), sourceImage.Config, target.Config);
  config.Image = targetImage;
  const createBody = {
    ...config,
    HostConfig: preserveMounts(cleanHostConfig(old.HostConfig), old.Mounts),
    NetworkingConfig: { EndpointsConfig: cleanEndpoints(old.NetworkSettings.Networks) },
  };
  let created;
  try {
    created = await dockerRequest('POST', `/containers/create?name=${encodeURIComponent(name)}`, createBody);
    if (wasRunning) await dockerRequest('POST', `/containers/${created.Id}/start`);
    const readiness = wasRunning ? await waitForContainerReady(created.Id) : { state: 'stopped', health: null };
    await dockerRequest('DELETE', `/containers/${id}?v=0&force=1`);
    return { id: created.Id, name, image: targetImage, readiness, backupRemoved: true };
  } catch (error) {
    if (created?.Id) await dockerRequest('DELETE', `/containers/${created.Id}?v=0&force=1`).catch(() => {});
    await dockerRequest('POST', `/containers/${id}/rename?name=${encodeURIComponent(name)}`).catch(() => {});
    if (wasRunning) await dockerRequest('POST', `/containers/${id}/start`).catch(() => {});
    throw new Error(`Update zurückgerollt: ${error.message}`);
  }
}

export function parseImage(value) {
  const withoutDigest = value.split('@')[0];
  const slash = withoutDigest.lastIndexOf('/');
  const colon = withoutDigest.lastIndexOf(':');
  const hasTag = colon > slash;
  const tag = hasTag ? withoutDigest.slice(colon + 1) : 'latest';
  const base = hasTag ? withoutDigest.slice(0, colon) : withoutDigest;
  const parts = base.split('/');
  const firstIsRegistry = parts.length > 1 && (parts[0].includes('.') || parts[0].includes(':') || parts[0] === 'localhost');
  const registry = firstIsRegistry ? parts.shift() : 'docker.io';
  let repository = parts.join('/');
  if (registry === 'docker.io' && !repository.includes('/')) repository = `library/${repository}`;
  return { registry, repository, tag, canonical: `${registry}/${repository}:${tag}` };
}
