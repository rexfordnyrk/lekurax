# Lekurax Frontend Auth Foundation (AuthzKit SDK + Branch Selector) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate `frontend/web-ui` with `@authzkit/client` and implement the standard auth workflows (password login, OTP login, password reset, logout) plus a branch selector that works with a single token across multiple branches.

**Architecture:** A small `auth/` layer provides an `AuthzKitClient` singleton, an `AuthProvider` for React state, and route guards. After login, the app calls `getMe()` and loads `accessible_branches` to populate the branch selector. Branch selection is stored in localStorage and applied per endpoint type (path/query/header), with the server-side precedence contract respected.

**Tech Stack:** React (`frontend/web-ui`), `@authzkit/client`

---

## Task 0: Add AuthzKit client dependency + client wrapper

**Files:**
- Modify: `frontend/web-ui/package.json`
- Create: `frontend/web-ui/src/auth/authzkitClient.js`
- Create: `frontend/web-ui/src/auth/storage.js`
- Create: `frontend/web-ui/src/auth/config.js`

- [ ] **Step 1: Install `@authzkit/client`**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm install @authzkit/client
```

Expected: dependency appears in `package.json`.

- [ ] **Step 2: Add auth config**

Create `frontend/web-ui/src/auth/config.js`:

```js
export const AUTHZ_BASE_URL = import.meta.env.VITE_AUTHZ_BASE_URL;

export const AUTHZ_TOKEN_PREFIX = "lekurax";
```

- [ ] **Step 3: Token storage**

Create `frontend/web-ui/src/auth/storage.js`:

```js
import { LocalStorageTokenStore } from "@authzkit/client";
import { AUTHZ_TOKEN_PREFIX } from "./config";

export const tokenStore = new LocalStorageTokenStore(AUTHZ_TOKEN_PREFIX);
```

- [ ] **Step 4: Client singleton**

Create `frontend/web-ui/src/auth/authzkitClient.js`:

```js
import { AuthzKitClient } from "@authzkit/client";
import { AUTHZ_BASE_URL } from "./config";
import { tokenStore } from "./storage";

export const authzkit = new AuthzKitClient({
  baseUrl: AUTHZ_BASE_URL,
  tokenStore,
  onAuthFailure: () => {
    // Keep it simple for MVP: redirect to sign-in route.
    window.location.href = "/sign-in";
  },
});
```

- [ ] **Step 5: Verify build**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add frontend/web-ui/package.json frontend/web-ui/package-lock.json frontend/web-ui/src/auth
git commit -m "feat(web-ui): add AuthzKit client wrapper and token storage"
```

---

## Task 1: Auth state + route guards

**Files:**
- Create: `frontend/web-ui/src/auth/AuthContext.jsx`
- Create: `frontend/web-ui/src/auth/RequireAuth.jsx`
- Modify: `frontend/web-ui/src/App.jsx`
- Test: `frontend/web-ui/src/auth/AuthContext.test.jsx`

- [ ] **Step 1: Auth context**

Create `frontend/web-ui/src/auth/AuthContext.jsx`:

```jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authzkit } from "./authzkitClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        if (!authzkit.isAuthenticated) {
          if (!cancelled) setMe(null);
          return;
        }
        const result = await authzkit.users.getMe();
        if (!cancelled) setMe(result);
      } catch (e) {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    boot();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({
    bootstrapping,
    me,
    isAuthenticated: authzkit.isAuthenticated,
    async refreshMe() {
      const result = await authzkit.users.getMe();
      setMe(result);
      return result;
    },
    async logout() {
      await authzkit.auth.logout();
      setMe(null);
    },
  }), [bootstrapping, me]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
```

- [ ] **Step 2: RequireAuth route wrapper**

Create `frontend/web-ui/src/auth/RequireAuth.jsx`:

```jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { bootstrapping, isAuthenticated } = useAuth();
  if (bootstrapping) return null;
  if (!isAuthenticated) return <Navigate to="/sign-in" replace />;
  return children;
}
```

- [ ] **Step 3: Wire provider in App**

Modify `frontend/web-ui/src/App.jsx`:
- Wrap `Routes` in `<AuthProvider>`.
- Guard at least one route (e.g. `/`) behind `RequireAuth` for MVP; keep public routes for sign-in/forgot-password.

Example snippet to use:

```jsx
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

// ...
<BrowserRouter>
  <RouteScrollToTop />
  <AuthProvider>
    <Routes>
      <Route exact path="/sign-in" element={<SignInPage />} />
      <Route exact path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        exact
        path="/"
        element={
          <RequireAuth>
            <HomePageOne />
          </RequireAuth>
        }
      />
      {/* ...other routes can be guarded later as they become real */}
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

- [ ] **Step 4: Tests**

Create `frontend/web-ui/src/auth/AuthContext.test.jsx` with React Testing Library:
- renders AuthProvider
- with a mocked `authzkit.isAuthenticated=false` expects `me=null` and no crash

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/App.jsx frontend/web-ui/src/auth
git commit -m "feat(web-ui): add auth provider and route guard"
```

---

## Task 2: Implement sign-in (password + OTP) using AuthzKit

**Files:**
- Modify: `frontend/web-ui/src/pages/SignInPage.jsx`
- Modify: `frontend/web-ui/src/pages/ForgotPasswordPage.jsx`
- Create: `frontend/web-ui/src/pages/OtpSignInPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Password login on `SignInPage`**

Update `SignInPage.jsx` to submit:

```js
await authzkit.auth.login({ identifier, password, tenant_id })
```

Then call:

```js
await refreshMe()
```

and navigate to `/`.

Use the `authzkit-client` error types (`AuthzKitApiError`) to display user-friendly messages.

- [ ] **Step 2: OTP login route**

Create `OtpSignInPage.jsx` implementing:
- enter `tenant_id` + `phone`
- `await authzkit.auth.requestOtpLogin({ phone, tenant_id })`
- enter `code`
- `await authzkit.auth.verifyOtp({ phone, code, tenant_id })`
- call `refreshMe()` and navigate to `/`

- [ ] **Step 3: Forgot password**

Modify `ForgotPasswordPage.jsx` to use:
- `authzkit.auth.requestPasswordReset({ identifier, tenant_id })`

For MVP, display “check your email/SMS”.

- [ ] **Step 4: Wire routes**

Modify `App.jsx` to add:
- `/sign-in` (existing)
- `/sign-in/otp` (new)

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/pages/SignInPage.jsx frontend/web-ui/src/pages/OtpSignInPage.jsx frontend/web-ui/src/pages/ForgotPasswordPage.jsx frontend/web-ui/src/App.jsx
git commit -m "feat(web-ui): implement password and OTP sign-in via AuthzKit"
```

---

## Task 3: Branch selector + branch context propagation helpers

**Files:**
- Create: `frontend/web-ui/src/branch/BranchContext.jsx`
- Create: `frontend/web-ui/src/branch/branchStorage.js`
- Create: `frontend/web-ui/src/api/lekuraxApi.js`
- Modify: `frontend/web-ui/src/masterLayout/MasterLayout.jsx` (add selector UI)

- [ ] **Step 1: Store active branch selection**

Create `branchStorage.js`:

```js
const KEY = "lekurax:active_branch_id";

export function getActiveBranchId() {
  return localStorage.getItem(KEY);
}

export function setActiveBranchId(id) {
  localStorage.setItem(KEY, id);
}
```

- [ ] **Step 2: Branch context provider**

Create `BranchContext.jsx` that:
- reads `me.accessible_branches` from `useAuth()`
- sets default active branch if missing (first branch)
- exposes `activeBranchId` and `setActiveBranchId`

- [ ] **Step 3: API wrapper**

Create `api/lekuraxApi.js` that:
- attaches `Authorization: Bearer <authzkit.accessToken>`
- attaches `X-Branch-Id` header when endpoint type uses headers
- supports query param branch filters for dashboards

Example:

```js
import { authzkit } from "../auth/authzkitClient";
import { getActiveBranchId } from "../branch/branchStorage";

export async function lekuraxFetch(path, { method = "GET", headers = {}, body } = {}) {
  const h = new Headers(headers);
  if (authzkit.accessToken) h.set("Authorization", `Bearer ${authzkit.accessToken}`);
  const bid = getActiveBranchId();
  if (bid) h.set("X-Branch-Id", bid);
  const res = await fetch(`${import.meta.env.VITE_LEKURAX_API_BASE_URL}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

- [ ] **Step 4: Add selector to layout**

In `MasterLayout.jsx`, add a dropdown (using existing components) that shows:
- current branch name
- branch options from context

Switching updates localStorage and triggers data reload on the current screen.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/branch frontend/web-ui/src/api frontend/web-ui/src/masterLayout/MasterLayout.jsx
git commit -m "feat(web-ui): add branch selector and branch-aware API wrapper"
```

