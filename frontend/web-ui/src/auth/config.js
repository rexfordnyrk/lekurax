const rawAuthzBaseUrl = import.meta.env.VITE_AUTHZ_BASE_URL;
if (!rawAuthzBaseUrl) {
  throw new Error(
    "[config] VITE_AUTHZ_BASE_URL is not set. Add it to frontend/web-ui/.env.local (see .env.example).",
  );
}

export const AUTHZ_BASE_URL = rawAuthzBaseUrl;

// localStorage keys will be: "lekurax:access_token", "lekurax:refresh_token", etc.
export const AUTHZ_TOKEN_PREFIX = import.meta.env.VITE_AUTHZ_TOKEN_PREFIX ?? "lekurax";
