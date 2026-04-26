import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "../../auth/RequireAuth";
import { AuthProvider } from "../../auth/AuthContext";
import { BranchProvider } from "../../branch/BranchContext";
import AdminUsersPage from "../../pages/admin/AdminUsersPage";

let authState = {
  bootstrapping: false,
  isAuthenticated: false,
  refreshMe: vi.fn(),
  logout: vi.fn(),
};

vi.mock("../../auth/authzkitClient", () => ({
  authzkit: {
    get isAuthenticated() {
      return Boolean(authState.isAuthenticated);
    },
    users: {
      getMe: vi.fn(async () => authState.me),
      getMyPermissions: vi.fn(async () => ({ permissions: ["users.list", "users.view", "audit.view"] })),
      list: vi.fn(async () => ({
        items: [],
        meta: { page: 1, page_size: 200, total: 0 },
      })),
    },
    branches: {
      list: vi.fn(async () => ({ items: [], meta: { page: 1, page_size: 200, total: 0 } })),
    },
    auditLogs: {
      list: vi.fn(async () => ({ items: [], meta: { page: 1, page_size: 200, total: 0 } })),
    },
  },
}));

vi.mock("../../auth/AuthContext", async () => {
  const actual = await vi.importActual("../../auth/AuthContext");
  return {
    ...actual,
    useAuth: () => authState,
  };
});

function TestRoutes() {
  return (
    <AuthProvider>
      <BranchProvider>
        <Routes>
          <Route path="/sign-in" element={<h1>Sign In to your Account</h1>} />

          {/* Legacy redirects */}
          <Route path="/users-list" element={<Navigate to="/admin/users" replace />} />

          {/* Admin routes (protected) */}
          <Route
            path="/admin/users"
            element={
              <RequireAuth>
                <AdminUsersPage />
              </RequireAuth>
            }
          />
        </Routes>
      </BranchProvider>
    </AuthProvider>
  );
}

describe("admin routing behavior", () => {
  it("visiting /users-list redirects to /admin/users and renders Admin Users when authenticated", async () => {
    authState = {
      ...authState,
      bootstrapping: false,
      isAuthenticated: true,
      me: {
        user: { tenant_id: "tenant-test" },
        is_platform_user: false,
        branches_enabled: true,
        accessible_branches: [{ id: "b1", name: "Main" }],
        default_branch_id: "b1",
      },
      refreshMe: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={["/users-list"]}>
        <TestRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText("User Accounts")).toBeInTheDocument();
  });

  it("visiting /admin/users when unauthenticated ends up on sign-in", async () => {
    authState = {
      ...authState,
      bootstrapping: false,
      isAuthenticated: false,
    };

    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <TestRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText("Sign In to your Account")).toBeInTheDocument();
  });
});

