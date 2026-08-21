import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const password = process.env.TRACKER_POSTGRES_PASSWORD_FILE ? fs.readFileSync(process.env.TRACKER_POSTGRES_PASSWORD_FILE, 'utf8').trim() : undefined;
export const pool = new pg.Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
  host: process.env.PGHOST || 'postgres', port: Number(process.env.PGPORT || 5432), database: process.env.PGDATABASE || 'container_pilot', user: process.env.PGUSER || 'tracker', password,
});

export async function migrate(db = pool) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied = new Set((await db.query('SELECT version FROM schema_migrations')).rows.map(row => row.version));
  for (const name of fs.readdirSync(migrationDir).filter(file => !file.startsWith('.') && file.endsWith('.sql')).sort()) {
    if (applied.has(name)) continue;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const statements = fs.readFileSync(path.join(migrationDir, name), 'utf8').split(/;\s*(?:\r?\n|$)/).map(statement => statement.trim()).filter(Boolean);
      for (const statement of statements) await client.query({ text: statement, queryMode: 'simple' });
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [name]);
      await client.query('COMMIT');
    }
    catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
}

export async function saveReport(payload, db = pool) {
  const p = payload; const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO installations (installation_id,first_seen,last_seen,schema_version,container_pilot_version,channel,architecture,docker_version,docker_api_version,operating_system,kernel_version,containers_total,containers_running,containers_stopped,containers_with_healthcheck,containers_auto_update,watchtower_import_used,native_https_enabled,private_registry_configured,webhook_configured,registry_docker_hub,registry_ghcr,registry_gitlab,registry_generic_oci,successful_updates,failed_updates,automatic_rollbacks,manual_rollbacks,delete_token_hash)
      VALUES ($1,now(),now(),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      ON CONFLICT (installation_id) DO UPDATE SET last_seen=now(),schema_version=EXCLUDED.schema_version,container_pilot_version=EXCLUDED.container_pilot_version,channel=EXCLUDED.channel,architecture=EXCLUDED.architecture,docker_version=EXCLUDED.docker_version,docker_api_version=EXCLUDED.docker_api_version,operating_system=EXCLUDED.operating_system,kernel_version=EXCLUDED.kernel_version,containers_total=EXCLUDED.containers_total,containers_running=EXCLUDED.containers_running,containers_stopped=EXCLUDED.containers_stopped,containers_with_healthcheck=EXCLUDED.containers_with_healthcheck,containers_auto_update=EXCLUDED.containers_auto_update,watchtower_import_used=EXCLUDED.watchtower_import_used,native_https_enabled=EXCLUDED.native_https_enabled,private_registry_configured=EXCLUDED.private_registry_configured,webhook_configured=EXCLUDED.webhook_configured,registry_docker_hub=EXCLUDED.registry_docker_hub,registry_ghcr=EXCLUDED.registry_ghcr,registry_gitlab=EXCLUDED.registry_gitlab,registry_generic_oci=EXCLUDED.registry_generic_oci,successful_updates=EXCLUDED.successful_updates,failed_updates=EXCLUDED.failed_updates,automatic_rollbacks=EXCLUDED.automatic_rollbacks,manual_rollbacks=EXCLUDED.manual_rollbacks`,
      [p.installation_id,p.schema_version,p.container_pilot.version,p.container_pilot.channel,p.system.architecture,p.system.docker_version,p.system.docker_api_version,p.system.os,p.system.kernel,p.containers.total,p.containers.running,p.containers.stopped,p.containers.with_healthcheck,p.containers.automatic_updates_enabled,p.features.watchtower_import_used,p.features.native_https_enabled,p.features.private_registry_configured,p.features.webhook_configured,p.registries.docker_hub,p.registries.ghcr,p.registries.gitlab,p.registries.generic_oci,p.updates.successful,p.updates.failed,p.updates.automatic_rollbacks,p.updates.manual_rollbacks,p.delete_token_hash]);
    await client.query(`INSERT INTO reports (installation_id,container_pilot_version,containers_total,containers_running,containers_stopped,containers_with_healthcheck,containers_auto_update,successful_updates,failed_updates,automatic_rollbacks,manual_rollbacks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [p.installation_id,p.container_pilot.version,p.containers.total,p.containers.running,p.containers.stopped,p.containers.with_healthcheck,p.containers.automatic_updates_enabled,p.updates.successful,p.updates.failed,p.updates.automatic_rollbacks,p.updates.manual_rollbacks]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function deleteInstallation(id, tokenHash, db = pool) {
  const result = await db.query('DELETE FROM installations WHERE installation_id=$1 AND delete_token_hash=$2', [id, tokenHash]);
  return result.rowCount === 1;
}

export async function cleanup(db = pool, days = Number(process.env.TRACKER_RETENTION_DAYS || 90)) {
  return db.query("DELETE FROM reports WHERE received_at < now() - ($1 * interval '1 day')", [Math.max(1, Math.min(days, 3650))]);
}
