-- +goose Up

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  kind text NOT NULL, -- med_error|adverse_event|security|general
  severity text NOT NULL, -- low|medium|high|critical
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open|investigating|closed
  reported_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capa_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action text NOT NULL,
  owner_user_id uuid NULL,
  due_on date NULL,
  status text NOT NULL DEFAULT 'open', -- open|done
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS capa_actions;
DROP TABLE IF EXISTS incidents;
