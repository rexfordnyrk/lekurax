-- +goose Up

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NULL,
  owner_user_id uuid NULL,
  kind text NOT NULL, -- prescription_image|license|sop|other
  filename text NOT NULL,
  content_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_created ON documents (tenant_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS documents;
