import { authzkit } from "../auth/authzkitClient";
import { getActiveBranchId } from "../branch/branchStorage";

function baseUrl() {
  const raw = import.meta.env.VITE_LEKURAX_API_BASE_URL;
  if (!raw) {
    throw new Error(
      "[config] VITE_LEKURAX_API_BASE_URL is not set. Add it to frontend/web-ui/.env.local (see .env.example).",
    );
  }
  return raw;
}

/**
 * @param {string} path
 * @param {RequestInit & { body?: object }} [options]
 */
export async function lekuraxFetch(path, options = {}) {
  const { method = "GET", headers = {}, body, ...rest } = options;
  const h = new Headers(headers);
  if (authzkit.accessToken) {
    h.set("Authorization", `Bearer ${authzkit.accessToken}`);
  }
  const bid = getActiveBranchId();
  if (bid) {
    h.set("X-Branch-Id", bid);
  }
  if (body !== undefined && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return null;
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}
