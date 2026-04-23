import { AuthzKitClient } from "@authzkit/client";
import { AUTHZ_BASE_URL } from "./config";
import { tokenStore } from "./storage";

export const authzkit = new AuthzKitClient({
  baseUrl: AUTHZ_BASE_URL,
  tokenStore,
  onAuthFailure: () => {
    window.location.href = "/sign-in";
  },
});
