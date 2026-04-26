import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminRolesView } from "../AdminRolesView";

const listRolesMock = vi.fn();
const getMyPermissionsMock = vi.fn();

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    users: {
      getMyPermissions: (...args) => getMyPermissionsMock(...args),
    },
    roles: {
      list: (...args) => listRolesMock(...args),
      delete: vi.fn(),
    },
  },
}));

describe("AdminRolesView", () => {
  test("shows role rows from API", async () => {
    getMyPermissionsMock.mockResolvedValueOnce({
      permissions: ["roles.list", "roles.create", "roles.update", "roles.delete"],
    });

    listRolesMock.mockResolvedValueOnce({
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

    render(<AdminRolesView />);

    await waitFor(() => expect(screen.getByText("Administrator")).toBeInTheDocument());
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("Full access")).toBeInTheDocument();
  });
});

