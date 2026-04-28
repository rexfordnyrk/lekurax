import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PermissionProvider } from "../../../auth/PermissionContext.jsx";
import { AdminAuthPoliciesView } from "../AdminAuthPoliciesView";

const lookupMock = vi.fn();
const getMyPermissionsMock = vi.fn();
const updateMyConfigMock = vi.fn();

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    isAuthenticated: true,
    users: {
      getMyPermissions: (...args) => getMyPermissionsMock(...args),
    },
    tenants: {
      lookupByDomain: (...args) => lookupMock(...args),
      updateMyConfig: (...args) => updateMyConfigMock(...args),
    },
  },
}));

const renderView = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <AdminAuthPoliciesView />
      </PermissionProvider>
    </MemoryRouter>
  );

const tenantConfig = {
  tenant_id: "t1",
  tenant_name: "Acme",
  slug: "acme",
  primary_domain: "acme.test",
  config: {
    mfa_policy: "optional",
    allow_passwordless_otp: true,
    auto_create_on_otp: false,
    password_policy: {
      min_length: 14,
      require_uppercase: true,
      require_digit: true,
      require_special_char: false,
      max_failed_attempts: 3,
      lockout_duration: 10,
    },
  },
};

describe("AdminAuthPoliciesView", () => {
  beforeEach(() => {
    getMyPermissionsMock.mockResolvedValue({
      permissions: ["tenant.settings.update"],
      roles: ["admin"],
    });
    updateMyConfigMock.mockResolvedValue({});
  });

  test("loads tenant config and shows password policy inputs", async () => {
    lookupMock.mockResolvedValue(tenantConfig);

    renderView();

    expect(await screen.findByRole("heading", { name: /auth policies/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Minimum length")).toBeInTheDocument()
    );

    expect(screen.getByLabelText("Minimum length")).toHaveValue(14);
    expect(screen.getByLabelText("MFA policy")).toHaveValue("optional");
  });
});
