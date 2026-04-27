const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let _cachedPerms = null;
let _lastFetchedAt = 0;

export function permissionGranted(perms, required) {
  if (required === '') return true;
  if (!Array.isArray(perms) || perms.length === 0) return false;
  if (perms.includes('*')) return true;
  return perms.includes(required);
}

export function permissionGrantedAny(perms, requiredAny) {
  if (!Array.isArray(requiredAny) || requiredAny.length === 0) return true;
  return requiredAny.some(p => permissionGranted(perms, p));
}

export function permissionGrantedAll(perms, requiredAll) {
  if (!Array.isArray(requiredAll) || requiredAll.length === 0) return true;
  return requiredAll.every(p => permissionGranted(perms, p));
}

export function seedCachedPermissions(permsArray) {
  if (!Array.isArray(permsArray)) return;
  _cachedPerms = permsArray;
  _lastFetchedAt = Date.now();
}

export function clearPermissionCache() {
  _cachedPerms = null;
  _lastFetchedAt = 0;
}

export function getCachedPermissions() {
  if (_cachedPerms && Date.now() - _lastFetchedAt <= CACHE_TTL_MS) {
    return _cachedPerms;
  }
  _cachedPerms = null;
  _lastFetchedAt = 0;
  return null;
}
