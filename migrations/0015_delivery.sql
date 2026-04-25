-- +goose Up

CREATE TABLE IF NOT EXISTS couriers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  courier_id uuid NULL REFERENCES couriers(id) ON DELETE SET NULL,
  address text NOT NULL,
  status text NOT NULL DEFAULT 'created', -- created|assigned|picked_up|delivered|failed
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS couriers;
