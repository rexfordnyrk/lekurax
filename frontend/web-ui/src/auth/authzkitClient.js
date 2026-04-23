import { AuthzKitClient } from "@authzkit/client";
import { AUTHZ_BASE_URL } from "./config";
import { tokenStore } from "./storage";

export const authzkit = new AuthzKitClient({
  baseUrl: AUTHZ_BASE_URL,
  tokenStore,
  onAuthFailure: () => {
    if (!window.location.pathname.startsWith("/sign-in")) {
      window.location.href = "/sign-in";
    }
  },
});
