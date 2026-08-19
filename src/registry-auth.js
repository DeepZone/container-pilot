import fs from 'node:fs';

const credentialsFile = () => process.env.CP_REGISTRY_CREDENTIALS_FILE;

export function loadRegistryCredentials() {
  const file = credentialsFile();
  if (!file) return {};
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Registry credential secret must contain a JSON object');
  return parsed;
}

export function credentialsFor(registry) {
  const value = loadRegistryCredentials()[registry];
  if (!value) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid registry credential entry for ${registry}`);
  const username = String(value.username || '');
  const password = String(value.password || value.token || '');
  if (!username || !password) throw new Error(`Registry credentials for ${registry} require username and password or token`);
  return { username, password };
}

export function basicAuthorization(registry) {
  const credential = credentialsFor(registry);
  return credential ? `Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString('base64')}` : null;
}

export function dockerRegistryAuth(registry) {
  const credential = credentialsFor(registry);
  const payload = credential
    ? { username: credential.username, password: credential.password, serveraddress: registry }
    : {};
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function configuredRegistries() {
  return Object.keys(loadRegistryCredentials()).sort();
}
