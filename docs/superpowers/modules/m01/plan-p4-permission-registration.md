# M01-P4: Lekurax Backend — Permission Registration at Startup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register all Lekurax permission strings with the authz service at server startup so they appear in the role editor without manual seeding.

**Architecture:** A new `RegisterPermissions` function in `internal/authzkit/permreg.go` holds the canonical permission manifest and calls `POST /v1/permissions/register` via the existing `authzkit.Client`. The call is made in `cmd/lekurax-api/main.go` after routes are wired and before `Engine.Run`. Failure logs a warning and does not block startup.

**Tech Stack:** Go 1.21+, standard `net/http`, Vitest-style unit test (`go test`). Working directory: repo root.

---

## File Map

| Action | Path | What changes |
|---|---|---|
| Modify | `internal/authzkit/client.go` | Add private `post()` helper method |
| Create | `internal/authzkit/permreg.go` | Permission manifest + `RegisterPermissions()` |
| Create | `internal/authzkit/permreg_test.go` | Unit test: manifest covers all `api.go` permission strings |
| Modify | `cmd/lekurax-api/main.go` | Call `RegisterPermissions()` after `httpserver.RegisterRoutes` |

---

## Task 1: Add `post()` helper to `authzkit.Client`

**Files:**
- Modify: `internal/authzkit/client.go`

The existing `client.go` only has a `get()` method. The registration endpoint is a `POST`.

- [ ] **Step 1.1: Add `post()` to `client.go`**

Open `internal/authzkit/client.go` and append after the `get()` method:

```go
func (c *Client) post(ctx context.Context, path string, body any) error {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return fmt.Errorf("parse base url: %w", err)
	}
	u.Path = strings.TrimRight(u.Path, "/") + "/v1" + path

	buf := &bytes.Buffer{}
	if err := json.NewEncoder(buf).Encode(body); err != nil {
		return fmt.Errorf("encode body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), buf)
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("X-Service-Key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("authzkit http %d", res.StatusCode)
	}
	return nil
}
```

Add `"bytes"` to the existing import block.

- [ ] **Step 1.2: Run existing authzkit tests to confirm no regression**

```bash
go test ./internal/authzkit/... -v
```

Expected: all pass.

- [ ] **Step 1.3: Commit**

```bash
git add internal/authzkit/client.go
git commit -m "feat(authzkit): add post() helper to Client"
```

---

## Task 2: Create permission manifest and `RegisterPermissions`

**Files:**
- Create: `internal/authzkit/permreg.go`
- Create: `internal/authzkit/permreg_test.go`

- [ ] **Step 2.1: Write the failing test first**

Create `internal/authzkit/permreg_test.go`:

```go
package authzkit_test

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"lekurax/internal/authzkit"
)

// permissionNameRe extracts bare permission strings from Go source, e.g. "inventory.products.create"
var permissionNameRe = regexp.MustCompile(`"([a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,})"`)

func TestManifestCoversAllAPIPermissions(t *testing.T) {
	src, err := os.ReadFile("../../internal/httpserver/api.go")
	if err != nil {
		t.Fatalf("read api.go: %v", err)
	}

	// Collect all dotted lowercase strings that look like permission names.
	matches := permissionNameRe.FindAllSubmatch(src, -1)
	var apiPerms []string
	for _, m := range matches {
		candidate := string(m[1])
		// Exclude package paths and non-permission strings.
		if strings.Contains(candidate, "/") || strings.Count(candidate, ".") == 0 {
			continue
		}
		apiPerms = append(apiPerms, candidate)
	}

	manifest := authzkit.PermissionManifest()
	manifestIndex := make(map[string]bool, len(manifest))
	for _, p := range manifest {
		manifestIndex[p.Name] = true
	}

	var missing []string
	for _, perm := range apiPerms {
		if !manifestIndex[perm] {
			missing = append(missing, perm)
		}
	}

	if len(missing) > 0 {
		t.Errorf("permissions used in api.go but absent from manifest:\n  %s", strings.Join(missing, "\n  "))
	}
}
```

- [ ] **Step 2.2: Run to confirm it fails (module not found)**

```bash
go test ./internal/authzkit/... -run TestManifestCoversAllAPIPermissions -v
```

Expected: compile error — `PermissionManifest` not defined.

- [ ] **Step 2.3: Create `permreg.go`**

Create `internal/authzkit/permreg.go`:

```go
package authzkit

import (
	"context"
	"log"
)

// Permission is a single entry in the Lekurax permission manifest.
type Permission struct {
	Name     string `json:"name"`
	Label    string `json:"label"`
	Category string `json:"category"`
	Module   string `json:"module"`
}

// PermissionManifest returns the full canonical list of Lekurax permissions.
// Keep this in sync with the permission strings used in internal/httpserver/api.go.
func PermissionManifest() []Permission {
	return []Permission{
		// Inventory — products
		{Name: "inventory.products.create", Label: "Create Products", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.products.list", Label: "List Products", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.products.view", Label: "View Product", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.products.update", Label: "Update Product", Category: "Lekurax", Module: "inventory"},
		// Inventory — stock
		{Name: "inventory.stock.receive", Label: "Receive Stock", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.stock.adjust", Label: "Adjust Stock", Category: "Lekurax", Module: "inventory"},
		{Name: "inventory.stock.view", Label: "View Stock", Category: "Lekurax", Module: "inventory"},
		// Pricing
		{Name: "pricing.price.set", Label: "Set Product Price", Category: "Lekurax", Module: "pricing"},
		{Name: "pricing.quote", Label: "Quote Cart", Category: "Lekurax", Module: "pricing"},
		{Name: "pricing.tax.manage", Label: "Manage Tax Rules", Category: "Lekurax", Module: "pricing"},
		// Patients
		{Name: "patients.create", Label: "Create Patient", Category: "Lekurax", Module: "patients"},
		{Name: "patients.list", Label: "List Patients", Category: "Lekurax", Module: "patients"},
		{Name: "patients.view", Label: "View Patient", Category: "Lekurax", Module: "patients"},
		{Name: "patients.update", Label: "Update Patient", Category: "Lekurax", Module: "patients"},
		{Name: "patients.allergies.manage", Label: "Manage Allergies", Category: "Lekurax", Module: "patients"},
		{Name: "patients.allergies.view", Label: "View Allergies", Category: "Lekurax", Module: "patients"},
		// Prescriptions
		{Name: "rx.create", Label: "Create Prescription", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.list", Label: "List Prescriptions", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.view", Label: "View Prescription", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.items.manage", Label: "Manage Rx Items", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.submit", Label: "Submit Prescription", Category: "Lekurax", Module: "prescriptions"},
		{Name: "rx.dispense", Label: "Dispense Prescription", Category: "Lekurax", Module: "prescriptions"},
		// POS
		{Name: "pos.sales.create", Label: "Create Sale", Category: "Lekurax", Module: "pos"},
		{Name: "pos.sales.list", Label: "List Sales", Category: "Lekurax", Module: "pos"},
		{Name: "pos.sales.view", Label: "View Sale", Category: "Lekurax", Module: "pos"},
	}
}

type registerPermissionsRequest struct {
	Permissions []Permission `json:"permissions"`
}

// RegisterPermissions posts the full Lekurax permission manifest to the authz service.
// Failure is non-blocking: a warning is logged and the server continues.
func (c *Client) RegisterPermissions(ctx context.Context) {
	manifest := PermissionManifest()
	err := c.post(ctx, "/permissions/register", registerPermissionsRequest{Permissions: manifest})
	if err != nil {
		log.Printf("[startup] permission registration failed: %v", err)
		return
	}
	log.Printf("[startup] registered %d permissions with authz service", len(manifest))
}

// RegisterPermissionsOnce is the startup entry point. Safe to call with a nil client.
// Ensure new routes are reflected by running: go test ./internal/authzkit/... -run TestManifestCoversAllAPIPermissions
func RegisterPermissionsOnce(ctx context.Context, c *Client) {
	if c == nil {
		log.Print("[startup] authzkit client is nil; skipping permission registration")
		return
	}
	c.RegisterPermissions(ctx)
}
```

- [ ] **Step 2.4: Run the test**

```bash
go test ./internal/authzkit/... -run TestManifestCoversAllAPIPermissions -v
```

Expected: PASS — all permission strings in `api.go` appear in the manifest.

- [ ] **Step 2.5: Run full authzkit test suite**

```bash
go test ./internal/authzkit/... -v
```

Expected: all pass.

- [ ] **Step 2.6: Commit**

```bash
git add internal/authzkit/permreg.go internal/authzkit/permreg_test.go
git commit -m "feat(authzkit): add permission manifest and RegisterPermissions startup call"
```

---

## Task 3: Wire `RegisterPermissions` into startup

**Files:**
- Modify: `cmd/lekurax-api/main.go`

- [ ] **Step 3.1: Add the startup call in `run()`**

In `cmd/lekurax-api/main.go`, after `httpserver.RegisterRoutes(s.Engine, gdb, verifier, aw, az)` and before `s.Engine.Run(...)`, add:

```go
// Register Lekurax permissions with authz service (non-blocking on failure).
authzkit.RegisterPermissionsOnce(context.Background(), az)
```

Add `"context"` to the import block if not already present.

The final `run()` function tail should look like:

```go
	aw := audit.New(gdb)
	az := authzkit.New(cfg.Authz.BaseURL, cfg.Authz.ServiceAPIKey)
	s := server.New(gdb, verifier, aw, az)
	httpserver.RegisterRoutes(s.Engine, gdb, verifier, aw, az)

	authzkit.RegisterPermissionsOnce(context.Background(), az)

	log.Info("starting lekurax-api", zap.String("addr", cfg.HTTP.Addr))
	if err := s.Engine.Run(cfg.HTTP.Addr); err != nil {
		log.Error("server failed", zap.Error(err))
		return 1
	}
	return 0
```

- [ ] **Step 3.2: Build to confirm it compiles**

```bash
go build ./cmd/lekurax-api/...
```

Expected: exits 0, no errors.

- [ ] **Step 3.3: Run full test suite**

```bash
go test ./...
```

Expected: all pass, no regressions.

- [ ] **Step 3.4: Commit**

```bash
git add cmd/lekurax-api/main.go
git commit -m "feat(startup): register Lekurax permissions with authz on boot"
```

---

## Task 4: Update roadmap

- [ ] **Step 4.1: Mark P4 tasks complete**

In `docs/superpowers/modules/m01/roadmap.md`, update Phase P4 rows 4.1–4.5 to `✅` and Phase Overview P4 Status to `✅`.

- [ ] **Step 4.2: Commit**

```bash
git add docs/superpowers/modules/m01/roadmap.md
git commit -m "docs: mark M01-P4 complete in roadmap"
```
