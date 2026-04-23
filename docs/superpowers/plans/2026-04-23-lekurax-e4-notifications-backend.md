# E4 (Backend) — Notifications & Communications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize in-app notifications and outbound delivery (email/SMS) with templates and user preferences.

**Architecture:** Start with DB-backed notification queue + synchronous “send now” for low volume. Add background worker and retries as follow-up tasks in this same extension.

---

## Task 1: Schema (templates, preferences, notifications, delivery attempts)

**Files:**
- Create: `migrations/0009_notifications.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  channel text NOT NULL, -- email|sms|in_app
  subject text NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_template_key ON notification_templates (tenant_id, key, channel);

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  in_app_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notification_prefs ON user_notification_prefs (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  channel text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread', -- unread|read
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_notification_prefs;
DROP TABLE IF EXISTS notification_templates;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0009_notifications.sql
git commit -m "feat(lekurax-api): add notifications schema"
```

---

## Task 2: In-app notification endpoints

**Files:**
- Create: `internal/notify/http/notifications_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `GET /api/v1/notifications` (perm `notifications.view`)
- `POST /api/v1/notifications/:id/read` (perm `notifications.manage`)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/notify internal/server
git commit -m "feat(lekurax-api): add in-app notifications endpoints"
```

