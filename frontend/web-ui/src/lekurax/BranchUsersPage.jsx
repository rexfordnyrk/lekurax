import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuthzKitApiError } from "@authzkit/client";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { authzkit } from "../auth/authzkitClient";

function asItemList(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}

function userLabel(u) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  return u.email || u.phone_number || u.id;
}

const BranchUsersPage = () => {
  const { branchId } = useParams();
  const [branchName, setBranchName] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState(null);

  const assignedIds = useMemo(
    () => new Set(assigned.map((u) => u.id)),
    [assigned],
  );

  const load = useCallback(async () => {
    if (!branchId) return;
    setError("");
    try {
      const [b, branchUsers, allUsers] = await Promise.all([
        authzkit.branches.get(branchId).catch(() => null),
        authzkit.branches.listUsers(branchId, { page: 1, page_size: 200 }),
        authzkit.users.list({ page: 1, page_size: 200 }),
      ]);
      setBranchName(b?.name ?? "");
      setAssigned(asItemList(branchUsers));
      setTenantUsers(asItemList(allUsers));
    } catch (e) {
      const msg =
        e instanceof AuthzKitApiError
          ? `${e.message} (${e.code})`
          : e?.message ?? "Failed to load";
      setError(msg);
      setAssigned([]);
      setTenantUsers([]);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const onAssign = async (userId) => {
    if (!branchId) return;
    setBusyUserId(userId);
    setError("");
    try {
      await authzkit.branches.assignUser(branchId, userId);
      await load();
    } catch (e) {
      const msg =
        e instanceof AuthzKitApiError
          ? `${e.message} (${e.code})`
          : e?.message ?? "Assign failed";
      setError(msg);
    } finally {
      setBusyUserId(null);
    }
  };

  const onUnassign = async (userId) => {
    if (!branchId) return;
    setBusyUserId(userId);
    setError("");
    try {
      await authzkit.branches.unassignUser(branchId, userId);
      await load();
    } catch (e) {
      const msg =
        e instanceof AuthzKitApiError
          ? `${e.message} (${e.code})`
          : e?.message ?? "Unassign failed";
      setError(msg);
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Branch members' />
      <div className='dashboard-main-body'>
        <div className='mb-3'>
          <Link to='/lekurax/branches' className='btn btn-sm btn-outline-secondary'>
            ← Branches
          </Link>
        </div>
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        <div className='card p-24 radius-12'>
          <h6 className='mb-2'>Users for branch</h6>
          <p className='text-secondary-light text-sm mb-3'>
            <code className='text-xs'>{branchId}</code>
            {branchName ? (
              <>
                {" "}
                — <span className='fw-medium'>{branchName}</span>
              </>
            ) : null}
          </p>
          <p className='text-secondary-light text-sm mb-3'>
            Non–tenant-admin users must be assigned here (or via Authz API) before
            Lekurax can enforce branch membership for them.
          </p>
          <div className='table-responsive'>
            <table className='table table-hover mb-0'>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tenantUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{userLabel(u)}</td>
                    <td>{u.email ?? "—"}</td>
                    <td>{u.status ?? "—"}</td>
                    <td className='text-end'>
                      {assignedIds.has(u.id) ? (
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-danger'
                          disabled={busyUserId === u.id}
                          onClick={() => onUnassign(u.id)}
                        >
                          Unassign
                        </button>
                      ) : (
                        <button
                          type='button'
                          className='btn btn-sm btn-primary'
                          disabled={busyUserId === u.id}
                          onClick={() => onAssign(u.id)}
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default BranchUsersPage;
