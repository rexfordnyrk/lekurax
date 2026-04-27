import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";
import { useAuth } from "../../auth/AuthContext";
import { UserUpsertModal } from "./UserUpsertModal";
import { UserDetailsModal } from "./UserDetailsModal";
import { useAdminShell } from "../ui/AdminShellContext";
import "../ui/adminShell.css";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
}

function hasPerm(perms, name) {
  return Array.isArray(perms) && perms.includes(name);
}

function fullName(u) {
  const name = `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim();
  return name || u?.email || u?.phone_number || u?.id || "User";
}

function initials(u) {
  const fn = (u?.first_name ?? "").trim();
  const ln = (u?.last_name ?? "").trim();
  const a = fn.charAt(0) || (u?.email ?? "").charAt(0) || "?";
  const b = ln.charAt(0) || (u?.email ?? "").charAt(1) || "";
  return `${a}${b}`.toUpperCase();
}

function formatShortWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function fetchAllPages(fetchPage) {
  const out = [];
  let page = 1;

  for (let safety = 0; safety < 50; safety += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchPage(page);
    const batch = Array.isArray(res?.items) ? res.items : [];
    out.push(...batch);

    const meta = res?.meta;
    const total = Number(meta?.total ?? out.length);
    const pageSize = Number(meta?.page_size ?? batch.length);
    if (!meta || page * pageSize >= total || batch.length === 0) break;
    page += 1;
  }

  return out;
}

function roleSummary(u) {
  const roles = Array.isArray(u?.roles) ? u.roles : [];
  if (!roles.length) return "—";
  const labels = roles
    .map((r) => (r.label || r.name || r.id || "").toString())
    .filter(Boolean);
  const joined = labels.slice(0, 2).join(", ");
  return labels.length > 2 ? `${joined} +${labels.length - 2}` : joined;
}

/** Same card chrome as AI dashboard `UnitCountOne`, values from live KPIs */
function UsersUnitCountRow({ kpis }) {
  const total = kpis.total;
  const activePct = total > 0 ? Math.round((kpis.active / total) * 100) : null;
  const mfaPct = total > 0 ? Math.round((kpis.mfa / total) * 100) : null;
  const sessionsLabel =
    kpis.activeSessions == null
      ? "Grant audit.view to surface login-based counts"
      : "Distinct users with a login in the last 24 hours";

  return (
    <div className="admin-users-kpi-row">
      <div>
        <div className="card shadow-none border bg-gradient-start-1 h-100">
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-primary-light mb-1">Total Users</p>
                <h6 className="mb-0">{total.toLocaleString()}</h6>
              </div>
              <div className="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                <Icon icon="gridicons:multiple-users" className="text-white text-2xl mb-0" />
              </div>
            </div>
            <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
              Accounts returned from the user directory
            </p>
          </div>
        </div>
      </div>
      <div>
        <div className="card shadow-none border bg-gradient-start-2 h-100">
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-primary-light mb-1">Active Users</p>
                <h6 className="mb-0">{kpis.active.toLocaleString()}</h6>
              </div>
              <div className="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                <Icon icon="solar:user-check-bold" className="text-white text-2xl mb-0" />
              </div>
            </div>
            <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
              {activePct == null ? "—" : `${activePct}% of directory users with status active`}
            </p>
          </div>
        </div>
      </div>
      <div>
        <div className="card shadow-none border bg-gradient-start-3 h-100">
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-primary-light mb-1">MFA Enabled</p>
                <h6 className="mb-0">{kpis.mfa.toLocaleString()}</h6>
              </div>
              <div className="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                <Icon icon="ri:shield-check-line" className="text-white text-2xl mb-0" />
              </div>
            </div>
            <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
              {mfaPct == null ? "—" : `${mfaPct}% of directory users with MFA on`}
            </p>
          </div>
        </div>
      </div>
      <div>
        <div className="card shadow-none border bg-gradient-start-4 h-100">
          <div className="card-body p-20">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p className="fw-medium text-primary-light mb-1">Active Sessions</p>
                <h6 className="mb-0">
                  {kpis.activeSessions == null ? "—" : kpis.activeSessions.toLocaleString()}
                </h6>
              </div>
              <div className="w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center">
                <Icon icon="solar:clock-circle-bold" className="text-white text-2xl mb-0" />
              </div>
            </div>
            <p className="fw-medium text-sm text-primary-light mt-12 mb-0">{sessionsLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersView() {
  const { me } = useAuth();
  const tenantId = me?.user?.tenant_id ?? null;

  const [perms, setPerms] = useState([]);
  const [branchesById, setBranchesById] = useState(new Map());

  const [users, setUsers] = useState([]);
  const [loginAtByUserId, setLoginAtByUserId] = useState(new Map());

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState("create");
  const [upsertUser, setUpsertUser] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);

  const { setHeaderActions } = useAdminShell();

  const canListUsers = hasPerm(perms, "users.list");
  const canCreateUser = hasPerm(perms, "users.create");
  const canView = hasPerm(perms, "users.view");
  const canUpdate = hasPerm(perms, "users.update");
  const canDelete = hasPerm(perms, "users.delete");
  const canAssignRoles = hasPerm(perms, "users.roles.assign");
  const canAssignBranch = hasPerm(perms, "branches.users.assign");
  const canViewAudit = hasPerm(perms, "audit.view");

  const loadBranches = useCallback(async () => {
    try {
      const items = await fetchAllPages((page) => authzkit.branches.list({ page, page_size: 200 }));
      const map = new Map(items.map((b) => [b.id, b.name ?? b.id]));
      setBranchesById(map);
    } catch {
      setBranchesById(new Map());
    }
  }, []);

  const loadAuditLoginIndex = useCallback(async () => {
    if (!canViewAudit) {
      setLoginAtByUserId(new Map());
      return;
    }

    try {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const items = await fetchAllPages((page) =>
        authzkit.auditLogs.list({
          page,
          page_size: 200,
          action: "user.login",
          from,
        })
      );

      const best = new Map();
      for (const row of items) {
        const actor = row.actor_id;
        if (!actor) continue;
        const ts = row.created_at;
        if (!ts) continue;
        const prev = best.get(actor);
        if (!prev || Date.parse(ts) > Date.parse(prev)) best.set(actor, ts);
      }
      setLoginAtByUserId(best);
    } catch {
      setLoginAtByUserId(new Map());
    }
  }, [canViewAudit]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const permRes = await authzkit.users.getMyPermissions();
      const nextPerms = Array.isArray(permRes?.permissions) ? permRes.permissions : [];
      setPerms(nextPerms);

      if (!nextPerms.includes("users.list")) {
        setUsers([]);
        return;
      }

      const items = await fetchAllPages((page) =>
        authzkit.users.list({
          page,
          page_size: 200,
          ...(status ? { status } : {}),
        })
      );

      setUsers(items);
    } catch (e) {
      setUsers([]);
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadAuditLoginIndex();
  }, [loadAuditLoginIndex]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadUsers(), loadAuditLoginIndex()]);
  }, [loadAuditLoginIndex, loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const roleQ = role.trim().toLowerCase();

    return users.filter((u) => {
      if (q) {
        const name = fullName(u).toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        const phone = (u.phone_number ?? "").toLowerCase();
        const ok = name.includes(q) || email.includes(q) || phone.includes(q);
        if (!ok) return false;
      }

      if (roleQ) {
        const roles = Array.isArray(u?.roles) ? u.roles : [];
        const okRole = roles.some((r) => {
          const hay = `${r?.name ?? ""} ${r?.label ?? ""}`.toLowerCase();
          return hay.includes(roleQ);
        });
        if (!okRole) return false;
      }

      return true;
    });
  }, [users, search, role]);

  const branchOptions = useMemo(() => {
    return [...branchesById.entries()]
      .map(([id, name]) => ({ id, name: name ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [branchesById]);

  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const mfa = users.filter((u) => Boolean(u.mfa_enabled)).length;

    let activeSessions = null;
    if (canViewAudit) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const actors = new Set();
      for (const u of users) {
        const ts = loginAtByUserId.get(u.id);
        if (!ts) continue;
        if (Date.parse(ts) >= cutoff) actors.add(u.id);
      }
      activeSessions = actors.size;
    }

    return { total, active, mfa, activeSessions };
  }, [canViewAudit, loginAtByUserId, users]);

  const openCreate = useCallback(() => {
    setUpsertMode("create");
    setUpsertUser(null);
    setUpsertOpen(true);
  }, []);

  const exportUsersCsv = useCallback(() => {
    if (!canListUsers) return;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Name", "Email", "Role", "Branch", "Status", "Last Login", "MFA"];
    const rows = filtered.map((u) => {
      const branch = !u?.branch_id ? "—" : branchesById.get(u.branch_id) ?? u.branch_id;
      const lastLogin = formatShortWhen(loginAtByUserId.get(u.id) ?? null);
      return [
        fullName(u),
        u.email ?? "",
        roleSummary(u),
        branch,
        u.status ?? "—",
        lastLogin,
        u.mfa_enabled ? "Enabled" : "Disabled",
      ]
        .map(esc)
        .join(",");
    });
    const csv = [headers.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [branchesById, canListUsers, filtered, loginAtByUserId]);

  const openEdit = (u) => {
    setUpsertMode("edit");
    setUpsertUser(u);
    setUpsertOpen(true);
  };

  const openDetails = (u) => {
    setDetailsUser(u);
    setDetailsOpen(true);
  };

  const branchLabelForUser = (u) => {
    if (!u?.branch_id) return "—";
    return branchesById.get(u.branch_id) ?? u.branch_id;
  };

  const lastLoginForUser = (u) => loginAtByUserId.get(u.id) ?? null;

  const activeSessionsForUser = (u) => {
    if (!canViewAudit) return null;
    const ts = lastLoginForUser(u);
    if (!ts) return 0;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return Date.parse(ts) >= cutoff ? 1 : 0;
  };

  useEffect(() => {
    setHeaderActions(
      <div className="admin-shell-header-buttons d-flex align-items-center gap-2 flex-wrap justify-content-end">
        {canCreateUser || perms.length === 0 ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="ri-add-line" />
            <span className="ms-1">Add User</span>
          </button>
        ) : null}
      </div>
    );
    return () => setHeaderActions(null);
  }, [canCreateUser, openCreate, perms.length, setHeaderActions]);

  return (
    <div className="content-area">
      <UsersUnitCountRow kpis={kpis} />

      <div className="filters-bar">
        <div className="search-input">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!canListUsers}
          />
        </div>
        <input
          className="filter-select"
          placeholder="Role..."
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={!canListUsers}
        />
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={!canListUsers}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending_email_verification">Pending verification</option>
        </select>
        <button type="button" className="btn btn-secondary btn-sm" disabled>
          <i className="ri-filter-3-line" />
          More Filters
        </button>
      </div>

      <div className="card">
        <div className="card-header m1-card-header">
          <h3 className="card-title">User Accounts ({filtered.length})</h3>
          <div className="m1-card-header-export">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={exportUsersCsv}
              disabled={!canListUsers || loading}
            >
              <i className="ri-download-2-line" />
              <span className="ms-1">Export</span>
            </button>
          </div>
        </div>

        {!canListUsers ? (
          <div className="card-body">
            <div className="alert alert-warning mb-0">
              You do not have permission to list users for this tenant.
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="card-body">
            <div className="alert alert-danger mb-0">{error}</div>
          </div>
        ) : null}

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="m1-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>MFA</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 16, color: "rgba(15,23,42,0.6)" }}>
                      Loading…
                    </td>
                  </tr>
                ) : null}

                {!loading && canListUsers
                  ? filtered.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar">{initials(u)}</div>
                            <div className="user-info">
                              <div className="user-name">{fullName(u)}</div>
                              <div className="user-email">{u.email ?? "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td>{roleSummary(u)}</td>
                        <td>{branchLabelForUser(u)}</td>
                        <td>
                          <span
                            className={`badge ${
                              u.status === "active"
                                ? "badge-success"
                                : u.status === "suspended"
                                  ? "badge-warning"
                                  : "badge-neutral"
                            }`}
                          >
                            {u.status ?? "—"}
                          </span>
                        </td>
                        <td>{formatShortWhen(lastLoginForUser(u))}</td>
                        <td>
                          <span className={`badge ${u.mfa_enabled ? "badge-success" : "badge-warning"}`}>
                            {u.mfa_enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            {canView ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => openDetails(u)}
                              >
                                View
                              </button>
                            ) : null}
                            {canUpdate ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => openEdit(u)}
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}

                {!loading && canListUsers && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "rgba(15,23,42,0.6)" }}>
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <UserUpsertModal
        show={upsertOpen}
        mode={upsertMode === "edit" ? "edit" : "create"}
        tenantId={tenantId}
        user={upsertUser}
        canAssignRoles={canAssignRoles}
        canAssignBranch={canAssignBranch}
        branchOptions={branchOptions}
        onHide={() => setUpsertOpen(false)}
        onSaved={refreshAll}
      />

      <UserDetailsModal
        show={detailsOpen}
        user={detailsUser}
        branchLabel={detailsUser ? branchLabelForUser(detailsUser) : "—"}
        activeSessionCount={detailsUser ? activeSessionsForUser(detailsUser) : null}
        lastLoginAt={detailsUser ? lastLoginForUser(detailsUser) : null}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onHide={() => setDetailsOpen(false)}
        onEdit={(u) => {
          setDetailsOpen(false);
          openEdit(u);
        }}
        onChanged={refreshAll}
      />
    </div>
  );
}
