import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminAuditLogsView } from "../AdminAuditLogsView";

const listMock = vi.fn();

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    auditLogs: {
      list: (...args) => listMock(...args),
    },
  },
}));

describe("AdminAuditLogsView", () => {
  test("shows audit entries", async () => {
    listMock.mockResolvedValueOnce({
      items: [
        {
          id: "a1",
          tenant_id: "t1",
          actor_id: "u1",
          actor_type: "user",
          action: "user.created",
          resource_type: "user",
          resource_id: "u1",
          metadata: null,
          ip_address: "127.0.0.1",
          user_agent: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, page_size: 50, total: 1 },
    });

    render(<AdminAuditLogsView />);
    await waitFor(() =>
      expect(screen.getByText("user.created")).toBeInTheDocument()
    );
    expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
  });
});

