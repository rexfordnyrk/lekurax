-- +goose Up

CREATE TABLE IF NOT EXISTS insurance_providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  payer_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_coverages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES insurance_plans(id) ON DELETE RESTRICT,
  member_id text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES insurance_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft', -- draft|submitted|approved|rejected|paid
  submitted_at timestamptz NULL,
  adjudicated_at timestamptz NULL,
  paid_at timestamptz NULL,
  rejection_reason text NULL,
  approved_amount_cents bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS patient_coverages;
DROP TABLE IF EXISTS insurance_plans;
DROP TABLE IF EXISTS insurance_providers;
