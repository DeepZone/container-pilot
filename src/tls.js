import fs from 'node:fs';

export function loadTlsOptions(env = process.env, readFile = fs.readFileSync) {
  const certFile = env.CP_TLS_CERT_FILE;
  const keyFile = env.CP_TLS_KEY_FILE;
  if (!certFile && !keyFile) return null;
  if (!certFile || !keyFile) throw new Error('CP_TLS_CERT_FILE und CP_TLS_KEY_FILE müssen gemeinsam gesetzt werden');
  const passphraseFile = env.CP_TLS_KEY_PASSPHRASE_FILE;
  return {
    cert: readFile(certFile),
    key: readFile(keyFile),
    ...(passphraseFile ? { passphrase: readFile(passphraseFile, 'utf8').trim() } : {}),
    minVersion: 'TLSv1.2',
  };
}

export function tlsEnabled(env = process.env) {
  return Boolean(env.CP_TLS_CERT_FILE && env.CP_TLS_KEY_FILE);
}
