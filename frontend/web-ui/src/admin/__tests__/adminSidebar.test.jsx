import React from "react";
import { describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, within } from "@testing-library/react";
import MasterLayout from "../../masterLayout/MasterLayout";

vi.mock("../../branch/BranchContext", () => ({
  useBranch: () => ({
    activeBranchId: null,
    setActiveBranchId: vi.fn(),
    branchSwitchGeneration: 0,
    accessibleBranches: [],
  }),
}));

describe("Admin sidebar", () => {
  test("shows Admin menu items", () => {
    const { container } = render(
      <MemoryRouter>
        <MasterLayout>
          <div>child</div>
        </MasterLayout>
      </MemoryRouter>
    );

    const menu = container.querySelector("#sidebar-menu");
    expect(menu).toBeTruthy();

    expect(within(menu).getByText("Admin")).toBeInTheDocument();

    const adminUsersLink = within(menu)
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "/admin/users");
    expect(adminUsersLink).toBeTruthy();
    expect(adminUsersLink).toHaveTextContent("Users");

    expect(
      within(menu).getByRole("link", { name: "Roles & Permissions" })
    ).toHaveAttribute("href", "/admin/roles");
    expect(within(menu).getByRole("link", { name: "Audit logs" })).toHaveAttribute(
      "href",
      "/admin/audit"
    );
    expect(
      within(menu).getByRole("link", { name: "Auth policies" })
    ).toHaveAttribute("href", "/admin/auth-policies");
  });
});
