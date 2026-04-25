-- +goose Up

CREATE TABLE IF NOT EXISTS portal_patient_links (
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id),
  UNIQUE (tenant_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_patient_links_tenant_user ON portal_patient_links (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_portal_patient_links_tenant_patient ON portal_patient_links (tenant_id, patient_id);

CREATE TABLE IF NOT EXISTS refill_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'requested', -- requested|approved|denied|filled
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refill_requests_tenant_patient_created ON refill_requests (tenant_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refill_requests_tenant_prescription ON refill_requests (tenant_id, prescription_id);

-- +goose Down
DROP TABLE IF EXISTS refill_requests;
DROP TABLE IF EXISTS portal_patient_links;
