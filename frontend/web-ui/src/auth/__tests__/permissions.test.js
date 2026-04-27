import { describe, it, expect, beforeEach } from 'vitest';
import {
  permissionGranted,
  permissionGrantedAny,
  permissionGrantedAll,
  seedCachedPermissions,
  clearPermissionCache,
  getCachedPermissions,
} from '../permissions.js';

describe('permissionGranted', () => {
  it('returns false for empty permissions', () => {
    expect(permissionGranted([], 'users.list')).toBe(false);
  });
  it('returns true when wildcard * is present', () => {
    expect(permissionGranted(['*'], 'users.list')).toBe(true);
  });
  it('returns true for exact match', () => {
    expect(permissionGranted(['users.list', 'roles.list'], 'users.list')).toBe(true);
  });
  it('returns false for no match', () => {
    expect(permissionGranted(['roles.list'], 'users.list')).toBe(false);
  });
  it('returns true when name is empty (no permission required)', () => {
    expect(permissionGranted([], '')).toBe(true);
  });
  it('returns false for null permissions', () => {
    expect(permissionGranted(null, 'users.list')).toBe(false);
  });
});

describe('permissionGrantedAny', () => {
  it('returns true when at least one permission matches', () => {
    expect(permissionGrantedAny(['users.list'], ['users.list', 'roles.list'])).toBe(true);
  });
  it('returns false when none match', () => {
    expect(permissionGrantedAny(['audit.view'], ['users.list', 'roles.list'])).toBe(false);
  });
  it('returns true for empty required list', () => {
    expect(permissionGrantedAny([], [])).toBe(true);
  });
  it('returns true for null required list', () => {
    expect(permissionGrantedAny(['users.list'], null)).toBe(true);
  });
});

describe('permissionGrantedAll', () => {
  it('returns true when all permissions match', () => {
    expect(permissionGrantedAll(['users.list', 'roles.list'], ['users.list', 'roles.list'])).toBe(true);
  });
  it('returns false when one is missing', () => {
    expect(permissionGrantedAll(['users.list'], ['users.list', 'roles.list'])).toBe(false);
  });
  it('returns true for null required list', () => {
    expect(permissionGrantedAll(['users.list'], null)).toBe(true);
  });
});

describe('cache', () => {
  beforeEach(() => clearPermissionCache());

  it('getCachedPermissions returns null before any seed', () => {
    expect(getCachedPermissions()).toBeNull();
  });

  it('seedCachedPermissions stores permissions retrievable via getCachedPermissions', () => {
    seedCachedPermissions(['users.list']);
    expect(getCachedPermissions()).toEqual(['users.list']);
  });

  it('getCachedPermissions returns null after cache is cleared', () => {
    seedCachedPermissions(['users.list']);
    clearPermissionCache();
    expect(getCachedPermissions()).toBeNull();
  });
});
