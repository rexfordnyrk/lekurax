import { AuthzKitClient } from "@authzkit/client";
import { AUTHZ_BASE_URL } from "./config";
import { tokenStore } from "./storage";

export const authzkit = new AuthzKitClient({
  baseUrl: AUTHZ_BASE_URL,
  tokenStore,
  onAuthFailure: () => {
    const path = window.location.pathname;
    if (
      path.startsWith("/sign-in") ||
      path === "/forgot-password" ||
      path === "/sign-up"
    ) {
      return;
    }
    window.location.href = "/sign-in";
  },
});
