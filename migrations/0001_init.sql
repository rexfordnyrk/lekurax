-- +goose Up

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Generic audit log table for Lekurax domain events (separate from AuthzKit audit).
CREATE TABLE IF NOT EXISTS lekurax_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NULL,
  actor_user_id uuid NULL,
  action text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lekurax_audit_tenant_created ON lekurax_audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lekurax_audit_branch_created ON lekurax_audit_logs (tenant_id, branch_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS lekurax_audit_logs;
