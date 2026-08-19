import fs from 'node:fs';

const supportedTypes = new Set([
  'update-available', 'update-started', 'update-successful', 'update-failed',
  'healthcheck-failed', 'rollback-started', 'rollback-successful', 'rollback-failed',
]);

export function validateWebhookUrl(value, allowInsecure = process.env.CP_ALLOW_INSECURE_WEBHOOK === 'true') {
  if (!value) return '';
  const url = new URL(value);
  if (url.username || url.password) throw new Error('Webhook URL must not contain credentials');
  if (url.protocol !== 'https:' && !(allowInsecure && url.protocol === 'http:')) throw new Error('Webhook URL must use HTTPS');
  return url.toString();
}

export function webhookPayload(event, version) {
  return {
    source: 'container-pilot', version, type: event.type, at: event.at,
    container: event.container || null, image: event.image || null,
    result: event.result || null, message: event.message || null,
  };
}

function webhookToken() {
  const file = process.env.CP_WEBHOOK_TOKEN_FILE;
  return file ? fs.readFileSync(file, 'utf8').trim() : '';
}

export async function sendWebhook(event, settings, version, fetchImpl = fetch) {
  if (!settings?.enabled || !supportedTypes.has(event.type)) return { delivered: false, reason: 'disabled-or-unsupported' };
  const url = validateWebhookUrl(settings.url);
  if (!url) return { delivered: false, reason: 'missing-url' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const token = webhookToken();
    const response = await fetchImpl(url, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'user-agent': `Container-Pilot/${version}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(webhookPayload(event, version)),
    });
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
    return { delivered: true };
  } finally { clearTimeout(timer); }
}
