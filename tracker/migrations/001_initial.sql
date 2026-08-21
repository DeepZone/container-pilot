CREATE TABLE installations (
  installation_id uuid PRIMARY KEY, first_seen timestamptz NOT NULL, last_seen timestamptz NOT NULL, schema_version integer NOT NULL,
  container_pilot_version varchar(64) NOT NULL, channel varchar(16) NOT NULL, architecture varchar(16) NOT NULL,
  docker_version varchar(64) NOT NULL, docker_api_version varchar(32) NOT NULL, operating_system varchar(128) NOT NULL, kernel_version varchar(16) NOT NULL,
  containers_total integer NOT NULL, containers_running integer NOT NULL, containers_stopped integer NOT NULL, containers_with_healthcheck integer NOT NULL, containers_auto_update integer NOT NULL,
  watchtower_import_used boolean NOT NULL, native_https_enabled boolean NOT NULL, private_registry_configured boolean NOT NULL, webhook_configured boolean NOT NULL,
  registry_docker_hub boolean NOT NULL, registry_ghcr boolean NOT NULL, registry_gitlab boolean NOT NULL, registry_generic_oci boolean NOT NULL,
  successful_updates integer NOT NULL, failed_updates integer NOT NULL, automatic_rollbacks integer NOT NULL, manual_rollbacks integer NOT NULL,
  delete_token_hash char(64) NOT NULL
);
CREATE INDEX installations_last_seen_idx ON installations(last_seen);
CREATE TABLE reports (
  id bigserial PRIMARY KEY, installation_id uuid NOT NULL REFERENCES installations(installation_id) ON DELETE CASCADE, received_at timestamptz NOT NULL DEFAULT now(),
  container_pilot_version varchar(64) NOT NULL, containers_total integer NOT NULL, containers_running integer NOT NULL, containers_stopped integer NOT NULL,
  containers_with_healthcheck integer NOT NULL, containers_auto_update integer NOT NULL, successful_updates integer NOT NULL, failed_updates integer NOT NULL,
  automatic_rollbacks integer NOT NULL, manual_rollbacks integer NOT NULL
);
CREATE INDEX reports_installation_received_idx ON reports(installation_id, received_at DESC);
CREATE INDEX reports_received_idx ON reports(received_at);
