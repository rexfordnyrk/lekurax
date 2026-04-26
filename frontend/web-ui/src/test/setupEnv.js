// Vitest loads `setupFiles` before test modules are evaluated.
// `src/auth/config.js` throws if `VITE_AUTHZ_BASE_URL` is missing, so ensure a safe default for tests.
if (!process.env.VITE_AUTHZ_BASE_URL) {
  process.env.VITE_AUTHZ_BASE_URL = "http://localhost:9999";
}
