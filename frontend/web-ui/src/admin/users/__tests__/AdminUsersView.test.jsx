import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("AdminUsersView", () => {
  test("shows user row from API", async () => {
    getMyPermissionsMock.mockResolvedValueOnce({
      permissions: ["users.list", "users.view", "audit.view"],
    });

    listMock.mockImplementation(async () => ({
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
    }));

    auditListMock.mockResolvedValue({
      items: [],
      meta: { page: 1, page_size: 200, total: 0 },
    });

    render(<AdminUsersView />);

    await waitFor(() => expect(screen.getByText("Sarah Johnson")).toBeInTheDocument());
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });
});
