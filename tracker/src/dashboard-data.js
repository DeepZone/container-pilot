import { pool } from './db.js';

export async function summary(days = 30, db = pool) {
  const range = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const current = await db.query(`SELECT
    count(*)::int total_known,
    count(*) FILTER (WHERE last_seen >= now()-interval '24 hours')::int active_24h,
    count(*) FILTER (WHERE last_seen >= now()-interval '7 days')::int active_7d,
    count(*) FILTER (WHERE last_seen >= now()-interval '30 days')::int active_30d,
    coalesce(sum(containers_total),0)::int managed_containers, coalesce(avg(containers_total),0)::float average_containers,
    coalesce(avg(containers_running),0)::float average_running, coalesce(avg(containers_stopped),0)::float average_stopped,
    coalesce(sum(containers_with_healthcheck),0)::int healthchecks, coalesce(sum(containers_auto_update),0)::int auto_updates,
    coalesce(sum(successful_updates),0)::int successful_updates, coalesce(sum(failed_updates),0)::int failed_updates,
    coalesce(sum(automatic_rollbacks),0)::int automatic_rollbacks, coalesce(sum(manual_rollbacks),0)::int manual_rollbacks
    FROM installations`);
  const group = async (column) => (await db.query(`SELECT ${column} value,count(*)::int count FROM installations GROUP BY ${column} ORDER BY count DESC`)).rows;
  const feature = await db.query(`SELECT count(*) FILTER(WHERE watchtower_import_used)::int watchtower_import_used,count(*) FILTER(WHERE native_https_enabled)::int native_https_enabled,count(*) FILTER(WHERE private_registry_configured)::int private_registry_configured,count(*) FILTER(WHERE webhook_configured)::int webhook_configured,count(*) FILTER(WHERE registry_docker_hub)::int docker_hub,count(*) FILTER(WHERE registry_ghcr)::int ghcr,count(*) FILTER(WHERE registry_gitlab)::int gitlab,count(*) FILTER(WHERE registry_generic_oci)::int generic_oci FROM installations`);
  const timeline = await db.query(`WITH raw AS (
      SELECT *,greatest(successful_updates-lag(successful_updates,1,successful_updates) OVER(PARTITION BY installation_id ORDER BY received_at),0) success_delta,
      greatest(failed_updates-lag(failed_updates,1,failed_updates) OVER(PARTITION BY installation_id ORDER BY received_at),0) failed_delta,
      greatest(automatic_rollbacks-lag(automatic_rollbacks,1,automatic_rollbacks) OVER(PARTITION BY installation_id ORDER BY received_at),0) rollback_delta
      FROM reports WHERE received_at >= now()-($1*interval '1 day')
    ), changes AS (
      SELECT received_at::date day,count(*)::int reports,sum(success_delta)::int successful_updates,sum(failed_delta)::int failed_updates,sum(rollback_delta)::int automatic_rollbacks FROM raw GROUP BY received_at::date
    ), daily AS (
      SELECT DISTINCT ON (received_at::date,installation_id) received_at::date day,installation_id,containers_total FROM reports WHERE received_at >= now()-($1*interval '1 day') ORDER BY received_at::date,installation_id,received_at DESC
    ), totals AS (
      SELECT day,count(*)::int active,sum(containers_total)::int containers FROM daily GROUP BY day
    ) SELECT totals.*,changes.reports,changes.successful_updates,changes.failed_updates,changes.automatic_rollbacks FROM totals JOIN changes USING(day) ORDER BY day`, [range]);
  return { ...current.rows[0], features: feature.rows[0], architectures: await group('architecture'), versions: await group('container_pilot_version'), dockerVersions: await group("split_part(docker_version,'.',1)||'.x'"), dockerVersionDetails: await group('docker_version'), operatingSystems: await group('operating_system'), timeline: timeline.rows, days: range };
}

export async function installations(db = pool) { return (await db.query(`SELECT installation_id,left(installation_id::text,8)||'…' short_id,first_seen,last_seen,container_pilot_version,architecture,docker_version,operating_system,containers_total,containers_with_healthcheck,containers_auto_update,successful_updates,failed_updates,automatic_rollbacks FROM installations ORDER BY last_seen DESC LIMIT 1000`)).rows; }
export async function installation(id, db = pool) { const item = (await db.query(`SELECT installation_id,first_seen,last_seen,schema_version,container_pilot_version,channel,architecture,docker_version,docker_api_version,operating_system,kernel_version,containers_total,containers_running,containers_stopped,containers_with_healthcheck,containers_auto_update,watchtower_import_used,native_https_enabled,private_registry_configured,webhook_configured,registry_docker_hub,registry_ghcr,registry_gitlab,registry_generic_oci,successful_updates,failed_updates,automatic_rollbacks,manual_rollbacks FROM installations WHERE installation_id=$1`, [id])).rows[0]; if (!item) return null; const reports = (await db.query('SELECT id,received_at,container_pilot_version,containers_total,containers_running,containers_stopped,containers_with_healthcheck,containers_auto_update,successful_updates,failed_updates,automatic_rollbacks,manual_rollbacks FROM reports WHERE installation_id=$1 ORDER BY received_at DESC LIMIT 100', [id])).rows; return { item, reports }; }
