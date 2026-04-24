/**
 * @param {string | null | undefined} branchId
 * @param {string} path path after /api/v1/branches/:branch_id e.g. "/stock"
 */
export function branchApiPath(branchId, path) {
  if (!branchId) {
    return null;
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `/api/v1/branches/${branchId}${suffix}`;
}
