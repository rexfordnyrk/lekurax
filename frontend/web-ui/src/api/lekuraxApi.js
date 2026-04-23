import { authzkit } from "../auth/authzkitClient";
import { getActiveBranchId } from "../branch/branchStorage";

function baseUrl() {
  return import.meta.env.VITE_LEKURAX_API_BASE_URL ?? "";
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
  return res.json();
}
