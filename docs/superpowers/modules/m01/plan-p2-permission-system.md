# M01-P2: Lekurax Web-UI — Centralised Permission System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-layer permission system in the Lekurax web-ui that mirrors the authzkit console — a pure helper module, a React context provider, and a route guard component — so every page can check permissions without calling the API independently.

**Architecture:** `permissions.js` holds pure functions and an in-memory cache. `PermissionContext.jsx` wraps the app, fetches permissions once per route change, and exposes `hasPermission`/`hasAny`/`hasAll` hooks. `PermissionRoute.jsx` guards individual routes. `PermissionProvider` is wired in `App.jsx` inside `AuthContext`.

**Tech Stack:** React 18, React Router v6, Vite, Vitest + @testing-library/react. Working directory: `frontend/web-ui/`.

**Dependency:** Must complete before M01-P3 (admin page wiring depends on `usePermissions` hook).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `frontend/web-ui/src/auth/permissions.js` | Pure helpers + 30-min in-memory cache |
| Create | `frontend/web-ui/src/auth/PermissionContext.jsx` | React context provider + hooks |
| Create | `frontend/web-ui/src/auth/PermissionRoute.jsx` | Route guard component |
| Modify | `frontend/web-ui/src/App.jsx` | Wrap routes with `PermissionProvider` |
| Create | `frontend/web-ui/src/auth/__tests__/permissions.test.js` | Unit tests for helpers |
| Create | `frontend/web-ui/src/auth/__tests__/PermissionContext.test.jsx` | Context integration tests |

---

## Task 1: `permissions.js` — pure helpers + cache

**Files:**
- Create: `frontend/web-ui/src/auth/permissions.js`
- Create: `frontend/web-ui/src/auth/__tests__/permissions.test.js`

- [ ] **Step 1.1: Write failing tests**

Create `frontend/web-ui/src/auth/__tests__/permissions.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import {
  permissionGranted,
  permissionGrantedAny,
  permissionGrantedAll,
  seedCachedPermissions,
  clearPermissionCache,
} from '../permissions.js';

describe('permissionGranted', () => {
  it('returns false for empty permissions', () => {
    expect(permissionGranted([], 'users.list')).toBe(false);
  });
  it('returns true when wildcard * is present', () => {
    expect(permissionGranted(['*'], 'users.list')).toBe(true);
  });
  it('returns true for exact match', () => {
    expect(permissionGranted(['users.list', 'roles.list'], 'users.list')).toBe(true);
  });
  it('returns false for no match', () => {
    expect(permissionGranted(['roles.list'], 'users.list')).toBe(false);
  });
  it('returns true when name is empty (no permission required)', () => {
    expect(permissionGranted([], '')).toBe(true);
  });
});

describe('permissionGrantedAny', () => {
  it('returns true when at least one permission matches', () => {
    expect(permissionGrantedAny(['users.list'], ['users.list', 'roles.list'])).toBe(true);
  });
  it('returns false when none match', () => {
    expect(permissionGrantedAny(['audit.view'], ['users.list', 'roles.list'])).toBe(false);
  });
  it('returns true for empty required list', () => {
    expect(permissionGrantedAny([], [])).toBe(true);
  });
});

describe('permissionGrantedAll', () => {
  it('returns true when all permissions match', () => {
    expect(permissionGrantedAll(['users.list', 'roles.list'], ['users.list', 'roles.list'])).toBe(true);
  });
  it('returns false when one is missing', () => {
    expect(permissionGrantedAll(['users.list'], ['users.list', 'roles.list'])).toBe(false);
  });
});

describe('cache', () => {
  beforeEach(() => clearPermissionCache());

  it('seedCachedPermissions stores permissions', () => {
    seedCachedPermissions(['users.list']);
    expect(permissionGranted(['users.list'], 'users.list')).toBe(true);
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd frontend/web-ui
npx vitest run src/auth/__tests__/permissions.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 1.3: Create `permissions.js`**

Create `frontend/web-ui/src/auth/permissions.js`:

```js
// Client-side permission helpers.
// Server-side checks remain authoritative; this layer is UX-only (hide/show UI).

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let _cachedPerms = null;
let _lastFetchedAt = 0;

/**
 * @param {string[] | null | undefined} perms
 * @param {string} required
 * @returns {boolean}
 */
export function permissionGranted(perms, required) {
  if (!required) return true;
  if (!Array.isArray(perms) || perms.length === 0) return false;
  if (perms.includes('*')) return true;
  return perms.includes(required);
}

/**
 * @param {string[] | null | undefined} perms
 * @param {string[]} requiredAny
 * @returns {boolean}
 */
export function permissionGrantedAny(perms, requiredAny) {
  if (!requiredAny?.length) return true;
  return requiredAny.some(p => permissionGranted(perms, p));
}

/**
 * @param {string[] | null | undefined} perms
 * @param {string[]} requiredAll
 * @returns {boolean}
 */
export function permissionGrantedAll(perms, requiredAll) {
  if (!requiredAll?.length) return true;
  return requiredAll.every(p => permissionGranted(perms, p));
}

/** Pre-fill cache when another caller already fetched permissions. */
export function seedCachedPermissions(permsArray) {
  if (!Array.isArray(permsArray)) return;
  _cachedPerms = permsArray;
  _lastFetchedAt = Date.now();
}

/** Clear on logout. */
export function clearPermissionCache() {
  _cachedPerms = null;
  _lastFetchedAt = 0;
}

/** Returns cached permissions or null if stale / not seeded. */
export function getCachedPermissions() {
  if (_cachedPerms && Date.now() - _lastFetchedAt <= CACHE_TTL_MS) {
    return _cachedPerms;
  }
  return null;
}
```

- [ ] **Step 1.4: Run tests**

```bash
cd frontend/web-ui
npx vitest run src/auth/__tests__/permissions.test.js
```

Expected: all PASS.

- [ ] **Step 1.5: Commit**

```bash
cd frontend/web-ui
git add src/auth/permissions.js src/auth/__tests__/permissions.test.js
git commit -m "feat(web-ui): add permissions helper with cache"
```

---

## Task 2: `PermissionContext.jsx` — React context provider

**Files:**
- Create: `frontend/web-ui/src/auth/PermissionContext.jsx`
- Create: `frontend/web-ui/src/auth/__tests__/PermissionContext.test.jsx`

- [ ] **Step 2.1: Write failing tests**

Create `frontend/web-ui/src/auth/__tests__/PermissionContext.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PermissionProvider, usePermissions } from '../PermissionContext.jsx';
import { authzkit } from '../authzkitClient.js';

vi.mock('../authzkitClient.js', () => ({
  authzkit: {
    users: {
      getMyPermissions: vi.fn(),
    },
  },
}));

vi.mock('../storage.js', () => ({
  getAccessToken: vi.fn(() => 'fake-token'),
}));

const Consumer = () => {
  const { hasPermission, loading } = usePermissions();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="can-list">{hasPermission('users.list') ? 'yes' : 'no'}</span>
    </div>
  );
};

describe('PermissionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes hasPermission after fetch', async () => {
    authzkit.users.getMyPermissions.mockResolvedValue({
      permissions: ['users.list'],
      roles: ['admin'],
    });

    render(
      <MemoryRouter>
        <PermissionProvider>
          <Consumer />
        </PermissionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('can-list')).toHaveTextContent('yes');
    });
  });

  it('returns false for permissions not in list', async () => {
    authzkit.users.getMyPermissions.mockResolvedValue({
      permissions: [],
      roles: [],
    });

    render(
      <MemoryRouter>
        <PermissionProvider>
          <Consumer />
        </PermissionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('can-list')).toHaveTextContent('no');
    });
  });

  it('handles fetch errors gracefully', async () => {
    authzkit.users.getMyPermissions.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <PermissionProvider>
          <Consumer />
        </PermissionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('can-list')).toHaveTextContent('no');
    });
  });
});
```

- [ ] **Step 2.2: Run to confirm failure**

```bash
cd frontend/web-ui
npx vitest run src/auth/__tests__/PermissionContext.test.jsx
```

Expected: FAIL — `PermissionContext.jsx` not found.

- [ ] **Step 2.3: Create `PermissionContext.jsx`**

Create `frontend/web-ui/src/auth/PermissionContext.jsx`:

```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authzkit } from './authzkitClient.js';
import { getAccessToken } from './storage.js';
import {
  clearPermissionCache,
  permissionGranted,
  permissionGrantedAll,
  permissionGrantedAny,
  seedCachedPermissions,
} from './permissions.js';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const location = useLocation();
  const [permissions, setPermissions] = useState([]);
  const [roleNames, setRoleNames] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      clearPermissionCache();
      setPermissions([]);
      setRoleNames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await authzkit.users.getMyPermissions();
      const perms = Array.isArray(data?.permissions) ? data.permissions : [];
      seedCachedPermissions(perms);
      setPermissions(perms);
      setRoleNames(Array.isArray(data?.roles) ? data.roles : []);
    } catch {
      clearPermissionCache();
      setPermissions([]);
      setRoleNames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [location.pathname, load]);

  const hasPermission = useCallback(name => permissionGranted(permissions, name), [permissions]);
  const hasAny = useCallback(names => permissionGrantedAny(permissions, names), [permissions]);
  const hasAll = useCallback(names => permissionGrantedAll(permissions, names), [permissions]);

  const value = useMemo(
    () => ({ permissions, roleNames, loading, hasPermission, hasAny, hasAll, refresh: load }),
    [permissions, roleNames, loading, hasPermission, hasAny, hasAll, load]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}

export function usePermissionsOptional() {
  return useContext(PermissionContext);
}
```

- [ ] **Step 2.4: Check how `getAccessToken` is exported from `storage.js`**

```bash
grep -n "export" frontend/web-ui/src/auth/storage.js
```

Adjust the import in `PermissionContext.jsx` if the function name differs.

- [ ] **Step 2.5: Run tests**

```bash
cd frontend/web-ui
npx vitest run src/auth/__tests__/PermissionContext.test.jsx
```

Expected: all PASS.

- [ ] **Step 2.6: Commit**

```bash
git add frontend/web-ui/src/auth/PermissionContext.jsx \
        frontend/web-ui/src/auth/__tests__/PermissionContext.test.jsx
git commit -m "feat(web-ui): add PermissionContext provider and usePermissions hook"
```

---

## Task 3: `PermissionRoute.jsx` — route guard

**Files:**
- Create: `frontend/web-ui/src/auth/PermissionRoute.jsx`

- [ ] **Step 3.1: Create `PermissionRoute.jsx`**

```jsx
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from './PermissionContext.jsx';
import { getAccessToken } from './storage.js';

/**
 * Guards a route by permission.
 *
 * @param {object} props
 * @param {string} [props.permission] - Single permission name required
 * @param {string[]} [props.anyOf]   - User must have at least one
 * @param {string[]} [props.allOf]   - User must have every one
 * @param {string} [props.redirectTo] - Where to send on denial (default "/")
 * @param {React.ReactNode} props.children
 */
export default function PermissionRoute({ permission, anyOf, allOf, redirectTo = '/', children }) {
  const location = useLocation();
  const { loading, hasPermission, hasAny, hasAll } = usePermissions();

  if (!getAccessToken()) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  const required = permission || anyOf?.length || allOf?.length;
  if (!required) return <>{children}</>;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  let allowed = true;
  if (permission) allowed = hasPermission(permission);
  else if (anyOf?.length) allowed = hasAny(anyOf);
  else if (allOf?.length) allowed = hasAll(allOf);

  if (!allowed) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
```

- [ ] **Step 3.2: Commit**

```bash
git add frontend/web-ui/src/auth/PermissionRoute.jsx
git commit -m "feat(web-ui): add PermissionRoute guard component"
```

---

## Task 4: Wire `PermissionProvider` into `App.jsx`

**Files:**
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 4.1: Locate `AuthContext` wrapper in `App.jsx`**

```bash
grep -n "AuthContext\|AuthProvider\|PermissionProvider\|BrowserRouter\|Routes" frontend/web-ui/src/App.jsx | head -20
```

- [ ] **Step 4.2: Add `PermissionProvider` inside the auth wrapper**

Import at top of `App.jsx`:

```jsx
import { PermissionProvider } from './auth/PermissionContext.jsx';
```

Wrap the `<Routes>` block (must be inside `BrowserRouter` and inside auth context):

```jsx
// Before:
<AuthContext>
  <Routes>
    ...
  </Routes>
</AuthContext>

// After:
<AuthContext>
  <PermissionProvider>
    <Routes>
      ...
    </Routes>
  </PermissionProvider>
</AuthContext>
```

- [ ] **Step 4.3: Run the full test suite**

```bash
cd frontend/web-ui
npx vitest run
```

Expected: no regressions.

- [ ] **Step 4.4: Start dev server and verify app loads**

```bash
cd frontend/web-ui
npm run dev
```

Navigate to `/admin/users`. Confirm page loads without console errors.

- [ ] **Step 4.5: Commit**

```bash
git add frontend/web-ui/src/App.jsx
git commit -m "feat(web-ui): wire PermissionProvider into App"
```

---

## Task 5: Update roadmap

- [ ] **Step 5.1: Mark P2 tasks complete**

In `docs/superpowers/modules/m01/roadmap.md`, update Phase P2 rows 2.1–2.6 to `✅` and Phase Overview P2 Status to `✅`.

- [ ] **Step 5.2: Commit**

```bash
git add docs/superpowers/modules/m01/roadmap.md
git commit -m "docs: mark M01-P2 complete in roadmap"
```
