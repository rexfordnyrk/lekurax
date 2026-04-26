import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
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

function initials(u) {
  const fn = (u?.first_name ?? "").trim();
  const ln = (u?.last_name ?? "").trim();
  const a = fn.charAt(0) || (u?.email ?? "").charAt(0) || "?";
  const b = ln.charAt(0) || (u?.email ?? "").charAt(1) || "";
  return `${a}${b}`.toUpperCase();
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
      <Breadcrumb title="Branch members" />
      <div className="dashboard-main-body">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-16">
          <div>
            <h5 className="mb-6">Branch members</h5>
            <div className="text-secondary-light">
              Assign tenant users to this branch so Lekurax can enforce membership where required.
            </div>
          </div>
          <Link
            to="/lekurax/branches"
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
          >
            <Icon icon="solar:arrow-left-linear" className="icon text-md" />
            Branches
          </Link>
        </div>

        {error ? <div className="alert alert-danger mb-16">{error}</div> : null}

        <div className="card p-24 radius-12">
          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-16">
            <div>
              <h6 className="mb-0">Directory</h6>
              <p className="text-secondary-light text-sm mb-0 mt-8">
                <span className="fw-medium text-dark">{branchName || "Branch"}</span>
                <span className="text-secondary-light"> · </span>
                <code className="text-xs">{branchId}</code>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2"
              onClick={load}
            >
              <Icon icon="solar:refresh-linear" className="icon text-md" />
              Refresh
            </button>
          </div>

          <div className="table-responsive scroll-sm">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th className="text-end">Branch access</th>
                </tr>
              </thead>
              <tbody>
                {tenantUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="d-flex align-items-center gap-12">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-semibold"
                          style={{
                            width: 40,
                            height: 40,
                            background: "#DCFCE7",
                            color: "#166534",
                            fontSize: 12,
                          }}
                        >
                          {initials(u)}
                        </div>
                        <div>
                          <div className="fw-medium">{userLabel(u)}</div>
                          <div className="text-secondary-light text-sm">{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-secondary-light">{u.email ?? "—"}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.status === "active"
                            ? "bg-success"
                            : u.status === "suspended"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                        }`}
                      >
                        {u.status ?? "—"}
                      </span>
                    </td>
                    <td className="text-end">
                      {assignedIds.has(u.id) ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyUserId === u.id}
                          onClick={() => onUnassign(u.id)}
                        >
                          Unassign
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
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
