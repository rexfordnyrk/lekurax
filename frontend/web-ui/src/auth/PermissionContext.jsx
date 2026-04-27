import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authzkit } from './authzkitClient.js';
import {
  clearPermissionCache,
  permissionGranted,
  permissionGrantedAll,
  permissionGrantedAny,
  seedCachedPermissions,
} from './permissions.js';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const location = useLocation();
  const [permissions, setPermissions] = useState([]);
  const [roleNames, setRoleNames] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authzkit.isAuthenticated) {
      clearPermissionCache();
      setPermissions([]);
      setRoleNames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await authzkit.users.getMyPermissions();
      const perms = Array.isArray(data?.permissions) ? data.permissions : [];
      seedCachedPermissions(perms);
      setPermissions(perms);
      setRoleNames(Array.isArray(data?.roles) ? data.roles : []);
    } catch {
      clearPermissionCache();
      setPermissions([]);
      setRoleNames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [location.pathname, load]);

  const hasPermission = useCallback(name => permissionGranted(permissions, name), [permissions]);
  const hasAny = useCallback(names => permissionGrantedAny(permissions, names), [permissions]);
  const hasAll = useCallback(names => permissionGrantedAll(permissions, names), [permissions]);

  const value = useMemo(
    () => ({ permissions, roleNames, loading, hasPermission, hasAny, hasAll, refresh: load }),
    [permissions, roleNames, loading, hasPermission, hasAny, hasAll, load]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}

export function usePermissionsOptional() {
  return useContext(PermissionContext);
}
