import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "../../auth/RequireAuth";
import AdminUsersPage from "../pages/AdminUsersPage";

let authState = {
  bootstrapping: false,
  isAuthenticated: false,
  refreshMe: vi.fn(),
  logout: vi.fn(),
};

vi.mock("../../auth/AuthContext", () => {
  return {
    AuthProvider: ({ children }) => children,
    useAuth: () => authState,
  };
});

function TestRoutes() {
  return (
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
  );
}

describe("admin routing behavior", () => {
  it("visiting /users-list redirects to /admin/users and renders Admin Users when authenticated", async () => {
    authState = {
      ...authState,
      bootstrapping: false,
      isAuthenticated: true,
    };

    render(
      <MemoryRouter initialEntries={["/users-list"]}>
        <TestRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText("Admin Users")).toBeInTheDocument();
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

