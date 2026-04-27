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
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!authzkit.isAuthenticated) {
        if (!cancelled) {
          clearPermissionCache();
          setPermissions([]);
          setRoleNames([]);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const data = await authzkit.users.getMyPermissions();
        if (!cancelled) {
          const perms = Array.isArray(data?.permissions) ? data.permissions : [];
          seedCachedPermissions(perms);
          setPermissions(perms);
          setRoleNames(Array.isArray(data?.roles) ? data.roles : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[PermissionContext] Failed to load permissions:', err);
          clearPermissionCache();
          setPermissions([]);
          setRoleNames([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [location.pathname, refreshKey]);

  const hasPermission = useCallback(name => permissionGranted(permissions, name), [permissions]);
  const hasAny = useCallback(names => permissionGrantedAny(permissions, names), [permissions]);
  const hasAll = useCallback(names => permissionGrantedAll(permissions, names), [permissions]);

  const value = useMemo(
    () => ({ permissions, roleNames, loading, hasPermission, hasAny, hasAll, refresh }),
    [permissions, roleNames, loading, hasPermission, hasAny, hasAll, refresh]
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
