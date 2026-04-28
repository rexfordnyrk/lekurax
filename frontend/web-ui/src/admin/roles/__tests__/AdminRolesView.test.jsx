import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PermissionProvider } from "../../../auth/PermissionContext.jsx";
import { AdminShellHeader } from "../../ui/AdminShellHeader";
import { AdminShellProvider } from "../../ui/AdminShellContext";
import { AdminRolesView } from "../AdminRolesView";

const listRolesMock = vi.fn();
const getMyPermissionsMock = vi.fn();

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    isAuthenticated: true,
    users: {
      getMyPermissions: (...args) => getMyPermissionsMock(...args),
    },
    roles: {
      list: (...args) => listRolesMock(...args),
      delete: vi.fn(),
    },
  },
}));

const renderView = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <AdminShellProvider>
          <AdminShellHeader breadcrumb={[{ label: "Admin" }]} title="Roles" />
          <AdminRolesView />
        </AdminShellProvider>
      </PermissionProvider>
    </MemoryRouter>
  );

describe("AdminRolesView", () => {
  beforeEach(() => {
    getMyPermissionsMock.mockResolvedValue({
      permissions: [
        "roles.list",
        "roles.create",
        "roles.update",
        "roles.delete",
        "roles.permissions.assign",
        "roles.permissions.revoke",
        "permissions.list",
      ],
      roles: ["admin"],
    });
  });

  test("shows role rows from API", async () => {
    listRolesMock.mockResolvedValue({
      items: [
        {
          id: "r1",
          tenant_id: "t1",
          name: "admin",
          label: "Administrator",
          description: "Full access",
          is_system: true,
          parent_role_id: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, page_size: 50, total: 1 },
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create custom role/i })).toBeInTheDocument()
    );
    await waitFor(() => expect(screen.getByText("Administrator")).toBeInTheDocument());
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("Full access")).toBeInTheDocument();
  });
});
