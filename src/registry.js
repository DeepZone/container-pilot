import { parseImage } from './docker.js';

const accepts = [
  'application/vnd.oci.image.index.v1+json', 'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json', 'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');

async function tokenFor(registry, repository) {
  if (registry === 'docker.io') {
    const url = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${encodeURIComponent(repository)}:pull`;
    return (await (await fetch(url)).json()).token;
  }
  if (registry === 'ghcr.io') {
    const url = `https://ghcr.io/token?service=ghcr.io&scope=repository:${encodeURIComponent(repository)}:pull`;
    const json = await (await fetch(url)).json();
    return json.token;
  }
  return null;
}

async function manifest(image, tag) {
  const parsed = parseImage(image);
  const registryHost = parsed.registry === 'docker.io' ? 'registry-1.docker.io' : parsed.registry;
  const token = await tokenFor(parsed.registry, parsed.repository);
  const response = await fetch(`https://${registryHost}/v2/${parsed.repository}/manifests/${encodeURIComponent(tag)}`, {
    method: 'HEAD', headers: { accept: accepts, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  return { exists: response.ok, status: response.status, digest: response.headers.get('docker-content-digest') };
}

export async function inspectRemote(image) {
  const parsed = parseImage(image);
  const [current, latest] = await Promise.all([manifest(image, parsed.tag), manifest(image, 'latest')]);
  return {
    ...parsed, currentDigest: current.digest, currentExists: current.exists,
    latestExists: latest.exists, latestDigest: latest.digest,
    latestDifferent: latest.exists && current.digest && latest.digest !== current.digest,
  };
}
