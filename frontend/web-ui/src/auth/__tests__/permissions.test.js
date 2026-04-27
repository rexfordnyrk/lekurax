import { describe, it, expect, beforeEach } from 'vitest';
import {
  permissionGranted,
  permissionGrantedAny,
  permissionGrantedAll,
  seedCachedPermissions,
  clearPermissionCache,
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
});

describe('permissionGrantedAll', () => {
  it('returns true when all permissions match', () => {
    expect(permissionGrantedAll(['users.list', 'roles.list'], ['users.list', 'roles.list'])).toBe(true);
  });
  it('returns false when one is missing', () => {
    expect(permissionGrantedAll(['users.list'], ['users.list', 'roles.list'])).toBe(false);
  });
});

describe('cache', () => {
  beforeEach(() => clearPermissionCache());

  it('seedCachedPermissions stores permissions', () => {
    seedCachedPermissions(['users.list']);
    expect(permissionGranted(['users.list'], 'users.list')).toBe(true);
  });
});
