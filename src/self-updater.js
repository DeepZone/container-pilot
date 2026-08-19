import { replaceContainer } from './docker.js';
import { writeSelfUpdateStatus } from './self-update.js';

const operationId = process.env.CP_SELF_OPERATION_ID;
const targetImage = process.env.CP_SELF_TARGET_IMAGE;
const toVersion = process.env.CP_SELF_TARGET_VERSION;
const containerId = process.env.CP_SELF_TARGET_CONTAINER;
const pull = process.env.CP_SELF_PULL !== 'false';

const base = { operationId, toVersion, targetImage };

try {
  if (!operationId || !targetImage || !containerId) throw new Error('Unvollständiger Self-Update-Auftrag');
  writeSelfUpdateStatus({ ...base, state: 'running', startedAt: new Date().toISOString() });
  // Give the API response time to reach the browser before the old web process stops.
  await new Promise(resolve => setTimeout(resolve, 2_000));
  const result = await replaceContainer(containerId, targetImage, { pull });
  writeSelfUpdateStatus({ ...base, state: 'success', completedAt: new Date().toISOString(), containerId: result.id, health: result.readiness });
} catch (error) {
  writeSelfUpdateStatus({ ...base, state: 'failed', completedAt: new Date().toISOString(), error: error.message });
  console.error(error);
  process.exitCode = 1;
}
