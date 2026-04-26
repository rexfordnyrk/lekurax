import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { describe, test, vi } from "vitest";

vi.mock("./authzkitClient", () => ({
  authzkit: {
    isAuthenticated: false,
    users: {
      getMe: vi.fn(),
    },
    auth: {
      logout: vi.fn(),
    },
  },
}));

function AuthConsumer() {
  const { bootstrapping, me, isAuthenticated } = useAuth();

  return (
    <>
      <div data-testid="bootstrapping">{String(bootstrapping)}</div>
      <div data-testid="me">{String(me)}</div>
      <div data-testid="is-authenticated">{String(isAuthenticated)}</div>
    </>
  );
}

describe("AuthContext", () => {
  test("renders unauthenticated auth state without crashing", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("bootstrapping")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("me")).toHaveTextContent("null");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });
});
