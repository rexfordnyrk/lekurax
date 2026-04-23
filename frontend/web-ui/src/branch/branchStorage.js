const KEY = "lekurax:active_branch_id";

export function getActiveBranchId() {
  return localStorage.getItem(KEY);
}

export function setActiveBranchId(id) {
  localStorage.setItem(KEY, id);
}
