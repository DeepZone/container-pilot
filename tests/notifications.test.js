import test from 'node:test';
import assert from 'node:assert/strict';
import { sendWebhook, validateWebhookUrl, webhookPayload } from '../src/notifications.js';

test('webhooks require HTTPS unless explicitly allowed', () => {
  assert.equal(validateWebhookUrl('https://hooks.example/events'), 'https://hooks.example/events');
  assert.throws(() => validateWebhookUrl('http://hooks.example/events'), /HTTPS/);
  assert.equal(validateWebhookUrl('http://127.0.0.1/events', true), 'http://127.0.0.1/events');
  assert.throws(() => validateWebhookUrl('https://user:pass@hooks.example/events'), /credentials/);
});

test('webhook payload contains no actor or registry credentials', () => {
  assert.deepEqual(webhookPayload({ type: 'update-failed', at: 'now', container: 'demo', message: 'failed', actor: 'admin' }, '1.0.0'), {
    source: 'container-pilot', version: '1.0.0', type: 'update-failed', at: 'now', container: 'demo', image: null, result: null, message: 'failed',
  });
});

test('delivers supported events and ignores unrelated events', async () => {
  let request;
  const fetchImpl = async (url, options) => { request = { url, options }; return { ok: true, status: 204 }; };
  const settings = { enabled: true, url: 'https://hooks.example/events' };
  assert.deepEqual(await sendWebhook({ type: 'login', at: 'now' }, settings, '1.0.0', fetchImpl), { delivered: false, reason: 'disabled-or-unsupported' });
  assert.deepEqual(await sendWebhook({ type: 'update-started', at: 'now', container: 'demo' }, settings, '1.0.0', fetchImpl), { delivered: true });
  assert.equal(request.url, 'https://hooks.example/events');
  assert.equal(JSON.parse(request.options.body).container, 'demo');
});
