# E6 (Backend) — Training & Knowledge (LMS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track courses, assignments, and completions for staff training compliance.

---

## Task 1: Schema

**Files:**
- Create: `migrations/0011_training.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  is_mandatory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_completions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS course_completions;
DROP TABLE IF EXISTS course_assignments;
DROP TABLE IF EXISTS courses;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0011_training.sql
git commit -m "feat(lekurax-api): add training schema"
```

---

## Task 2: LMS endpoints

**Files:**
- Create: `internal/training/http/courses_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/training/courses` (perm `training.courses.manage`, audit `course.created`)
- `GET /api/v1/training/courses` (perm `training.courses.view`)
- `POST /api/v1/training/courses/:id/assign` (perm `training.assign.manage`, audit `course.assigned`)
- `POST /api/v1/training/courses/:id/complete` (perm `training.complete.manage`, audit `course.completed`)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/training internal/server
git commit -m "feat(lekurax-api): add training endpoints"
```

