import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PermissionProvider } from "../../../auth/PermissionContext.jsx";
import { AdminUsersView } from "../AdminUsersView";

const listMock = vi.fn();
const getMyPermissionsMock = vi.fn();
const auditListMock = vi.fn();

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: () => ({
    me: { user: { tenant_id: "tenant-1" } },
  }),
}));

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    isAuthenticated: true,
    users: {
      list: (...args) => listMock(...args),
      getMyPermissions: (...args) => getMyPermissionsMock(...args),
    },
    branches: {
      list: vi.fn(async () => ({ items: [], meta: { page: 1, page_size: 200, total: 0 } })),
    },
    auditLogs: {
      list: (...args) => auditListMock(...args),
    },
  },
}));

vi.mock("../../ui/AdminShellContext", () => ({
  useAdminShell: () => ({ setHeaderActions: vi.fn() }),
}));

const renderView = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <AdminUsersView />
      </PermissionProvider>
    </MemoryRouter>
  );

describe("AdminUsersView", () => {
  beforeEach(() => {
    getMyPermissionsMock.mockResolvedValue({
      permissions: [
        "users.list",
        "users.create",
        "users.update",
        "users.delete",
        "users.view",
        "users.roles.assign",
        "users.roles.revoke",
        "branches.list",
        "branches.users.assign",
        "audit.view",
      ],
      roles: ["admin"],
    });

    auditListMock.mockResolvedValue({
      items: [],
      meta: { page: 1, page_size: 200, total: 0 },
    });
  });

  test("shows user row from API", async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: "u1",
          first_name: "Sarah",
          last_name: "Johnson",
          email: "sarah@example.com",
          phone_number: null,
          status: "active",
          mfa_enabled: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          tenant_id: "t1",
          roles: [{ id: "r1", name: "admin", label: "Administrator" }],
        },
      ],
      meta: { page: 1, page_size: 50, total: 1 },
    });

    renderView();

    expect(screen.getByText(/User Accounts/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Sarah Johnson")).toBeInTheDocument());
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  test("shows Admin Users heading", async () => {
    listMock.mockResolvedValue({ items: [], meta: { page: 1, page_size: 50, total: 0 } });

    renderView();

    await waitFor(() => expect(screen.getByText(/User Accounts/)).toBeInTheDocument());
  });
});
