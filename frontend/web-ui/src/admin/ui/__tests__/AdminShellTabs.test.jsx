import React from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { AdminShellTabs } from "../AdminShellTabs";

describe("AdminShellTabs", () => {
  it("marks Users tab active on /admin/users", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <AdminShellTabs />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

