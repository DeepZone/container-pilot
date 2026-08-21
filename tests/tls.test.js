import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTlsOptions, tlsEnabled } from '../src/tls.js';

test('TLS remains disabled without certificate configuration', () => {
  assert.equal(loadTlsOptions({}), null);
  assert.equal(tlsEnabled({}), false);
});

test('TLS requires certificate and key together', () => {
  assert.throws(() => loadTlsOptions({ CP_TLS_CERT_FILE: '/cert' }), /gemeinsam gesetzt/);
  assert.throws(() => loadTlsOptions({ CP_TLS_KEY_FILE: '/key' }), /gemeinsam gesetzt/);
});

test('TLS reads certificate, key, and an optional passphrase from files', () => {
  const files = { '/cert': Buffer.from('certificate'), '/key': Buffer.from('private key'), '/pass': ' secret\n' };
  const options = loadTlsOptions({ CP_TLS_CERT_FILE: '/cert', CP_TLS_KEY_FILE: '/key', CP_TLS_KEY_PASSPHRASE_FILE: '/pass' }, (file) => files[file]);
  assert.equal(options.cert.toString(), 'certificate');
  assert.equal(options.key.toString(), 'private key');
  assert.equal(options.passphrase, 'secret');
  assert.equal(options.minVersion, 'TLSv1.2');
  assert.equal(tlsEnabled({ CP_TLS_CERT_FILE: '/cert', CP_TLS_KEY_FILE: '/key' }), true);
});
