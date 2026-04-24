-- +goose Up

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS webhooks;
