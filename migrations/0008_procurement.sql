-- +goose Up

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  contact_email text NULL,
  contact_phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft|submitted|approved|rejected|cancelled
  requested_by_user_id uuid NULL,
  approved_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requisition_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  requisition_id uuid NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS purchase_requisition_lines;
DROP TABLE IF EXISTS purchase_requisitions;
DROP TABLE IF EXISTS suppliers;
