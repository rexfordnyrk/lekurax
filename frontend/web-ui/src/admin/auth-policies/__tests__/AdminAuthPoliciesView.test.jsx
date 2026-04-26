import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminAuthPoliciesView } from "../AdminAuthPoliciesView";

const lookupMock = vi.fn();
const getMyPermissionsMock = vi.fn();

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    users: {
      getMyPermissions: (...args) => getMyPermissionsMock(...args),
    },
    tenants: {
      lookupByDomain: (...args) => lookupMock(...args),
      update: vi.fn(),
    },
  },
}));

describe("AdminAuthPoliciesView", () => {
  test("loads tenant config and shows password policy inputs", async () => {
    getMyPermissionsMock.mockResolvedValueOnce({ permissions: ["tenants.update"] });
    lookupMock.mockResolvedValueOnce({
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
    });

    render(<AdminAuthPoliciesView />);

    expect(await screen.findByRole("heading", { name: /auth policies/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Minimum length")).toBeInTheDocument()
    );

    expect(screen.getByLabelText("Minimum length")).toHaveValue(14);
    expect(screen.getByLabelText("MFA policy")).toHaveValue("optional");
  });
});

