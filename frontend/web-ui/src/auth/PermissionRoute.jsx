import { Navigate, useLocation } from 'react-router-dom';
import { authzkit } from './authzkitClient.js';
import { usePermissions } from './PermissionContext.jsx';

/**
 * Guards a route by permission.
 *
 * @param {string} [permission] - Single permission name required
 * @param {string[]} [anyOf]    - User must have at least one
 * @param {string[]} [allOf]    - User must have every one
 * @param {string} [redirectTo] - Where to send on denial (default "/")
 * @param {React.ReactNode} children
 */
export default function PermissionRoute({ permission, anyOf, allOf, redirectTo = '/', children }) {
  const location = useLocation();
  const { loading, hasPermission, hasAny, hasAll } = usePermissions();

  if (!authzkit.isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const required = permission || anyOf?.length || allOf?.length;
  if (!required) return <>{children}</>;

  let allowed = true;
  if (permission) allowed = hasPermission(permission);
  else if (anyOf?.length) allowed = hasAny(anyOf);
  else if (allOf?.length) allowed = hasAll(allOf);

  if (!allowed) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
