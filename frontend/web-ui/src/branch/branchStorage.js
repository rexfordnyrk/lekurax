const KEY = "lekurax:active_branch_id";

export function getActiveBranchId() {
  const raw = localStorage.getItem(KEY);
  const v = raw?.trim();
  return v ? v : null;
}

export function setActiveBranchId(id) {
  localStorage.setItem(KEY, id);
}

export function clearActiveBranchId() {
  localStorage.removeItem(KEY);
}
