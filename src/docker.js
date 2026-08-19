import http from 'node:http';

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
  const reference = image.includes('@') ? image.split('@')[1] : tag;
  return dockerRequest('POST', `/images/create?fromImage=${encodeURIComponent(fromImage)}&tag=${encodeURIComponent(reference)}`);
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
} = {}) {
  const deadline = Date.now() + timeoutSeconds * 1_000;
  let current = await inspectContainer(id);
  if (!current.Config?.Healthcheck) {
    await delay(graceSeconds * 1_000);
    current = await inspectContainer(id);
    if (!current.State?.Running) throw new Error(current.State?.Error || `Container wurde innerhalb von ${graceSeconds} Sekunden beendet`);
    return { state: 'running', health: null };
  }
  while (Date.now() < deadline) {
    current = await inspectContainer(id);
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

export async function replaceContainer(id, targetImage) {
  const old = await inspectContainer(id);
  validateReplacement(old);
  const name = old.Name.replace(/^\//, '');
  const backup = `${name}.cp-backup-${Date.now()}`;
  const wasRunning = old.State.Running;
  await pullImage(targetImage);
  if (wasRunning) await dockerRequest('POST', `/containers/${id}/stop?t=${encodeURIComponent(old.Config.StopTimeout ?? 30)}`);
  await dockerRequest('POST', `/containers/${id}/rename?name=${encodeURIComponent(backup)}`);
  const config = cleanContainerConfig(old.Config, old.Id);
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
