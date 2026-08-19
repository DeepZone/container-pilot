import { parseImage } from './docker.js';
import { basicAuthorization, credentialsFor } from './registry-auth.js';

const accepts = [
  'application/vnd.oci.image.index.v1+json', 'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json', 'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');

async function tokenFor(registry, repository) {
  const authorization = basicAuthorization(registry);
  if (registry === 'docker.io') {
    const url = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${encodeURIComponent(repository)}:pull`;
    return (await (await fetch(url, { headers: authorization ? { authorization } : {} })).json()).token;
  }
  if (registry === 'ghcr.io') {
    const url = `https://ghcr.io/token?service=ghcr.io&scope=repository:${encodeURIComponent(repository)}:pull`;
    const json = await (await fetch(url, { headers: authorization ? { authorization } : {} })).json();
    return json.token;
  }
  return null;
}

export function parseBearerChallenge(value) {
  if (!String(value || '').toLowerCase().startsWith('bearer ')) return null;
  return Object.fromEntries([...String(value).slice(7).matchAll(/([a-zA-Z]+)="([^"]*)"/g)].map(([, key, item]) => [key.toLowerCase(), item]));
}

async function challengeToken(challenge, registry) {
  if (!challenge?.realm) return null;
  const url = new URL(challenge.realm);
  if (challenge.service) url.searchParams.set('service', challenge.service);
  if (challenge.scope) url.searchParams.set('scope', challenge.scope);
  const authorization = basicAuthorization(registry);
  const response = await fetch(url, { headers: authorization ? { authorization } : {} });
  if (!response.ok) throw new Error(`Registry token service returned HTTP ${response.status}`);
  const data = await response.json();
  return data.token || data.access_token || null;
}

async function manifest(image, tag) {
  const parsed = parseImage(image);
  const registryHost = parsed.registry === 'docker.io' ? 'registry-1.docker.io' : parsed.registry;
  let token = await tokenFor(parsed.registry, parsed.repository);
  const url = `https://${registryHost}/v2/${parsed.repository}/manifests/${encodeURIComponent(tag)}`;
  let response = await fetch(url, { method: 'HEAD', headers: { accept: accepts, ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  if (response.status === 401 && parsed.registry !== 'docker.io' && parsed.registry !== 'ghcr.io') {
    const challenge = parseBearerChallenge(response.headers.get('www-authenticate'));
    token = await challengeToken(challenge, parsed.registry);
    const basic = !token && credentialsFor(parsed.registry) ? basicAuthorization(parsed.registry) : null;
    if (token || basic) response = await fetch(url, { method: 'HEAD', headers: { accept: accepts, authorization: token ? `Bearer ${token}` : basic } });
  }
  if (response.status === 401) throw new Error(`Registry authentication failed for ${parsed.registry}`);
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
