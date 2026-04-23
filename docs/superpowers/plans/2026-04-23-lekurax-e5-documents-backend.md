# E5 (Backend) — Document Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store and retrieve documents (prescription images, licenses, SOPs) with tenant isolation, access control, and audit.

**Architecture:** MVP of this extension stores metadata in Postgres and file bytes in local disk (dev) with a storage abstraction to later support S3.

---

## Task 1: Schema

**Files:**
- Create: `migrations/0010_documents.sql`

- [ ] **Step 1: Create migration**

```sql
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
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0010_documents.sql
git commit -m "feat(lekurax-api): add documents schema"
```

---

## Task 2: Upload + download endpoints

**Files:**
- Create: `internal/docs/http/documents_handler.go`
- Create: `internal/docs/infra/storage_local.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/documents` (multipart upload; perm `documents.upload`, audit `document.uploaded`)
- `GET /api/v1/documents/:id` (metadata; perm `documents.view`)
- `GET /api/v1/documents/:id/content` (bytes; perm `documents.view`, sets content-type)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/docs internal/server
git commit -m "feat(lekurax-api): add document upload and download endpoints"
```

