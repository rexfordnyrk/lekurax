import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";
import { useAuth } from "../../auth/AuthContext";
import { UserUpsertModal } from "./UserUpsertModal";
import { UserDetailsModal } from "./UserDetailsModal";

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

function KpiCard({ title, value, hint }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card p-16 radius-12 h-100">
        <div className="text-secondary-light text-sm mb-6">{title}</div>
        <div className="fw-semibold text-xl">{value}</div>
        {hint ? <div className="text-secondary-light text-xs mt-8">{hint}</div> : null}
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

  const canListUsers = hasPerm(perms, "users.list");
  const canCreateUser = hasPerm(perms, "users.create");
  const canView = hasPerm(perms, "users.view");
  const canUpdate = hasPerm(perms, "users.update");
  const canDelete = hasPerm(perms, "users.delete");
  const canAssignRoles = hasPerm(perms, "users.roles.assign");
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

  const openCreate = () => {
    setUpsertMode("create");
    setUpsertUser(null);
    setUpsertOpen(true);
  };

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

  return (
    <div className="row gy-4">
      <div className="col-12">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <h5 className="mb-6">User Accounts</h5>
            <div className="text-secondary-light">
              Tenant-scoped directory, RBAC posture, and lightweight security signals.
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={refreshAll} disabled={loading}>
              <Icon icon="solar:refresh-linear" className="icon text-md me-1" />
              Refresh
            </button>
            {canCreateUser || perms.length === 0 ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>
                <Icon icon="ic:baseline-plus" className="icon text-md me-1" />
                Add user
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="row g-3">
          <KpiCard title="Total users" value={String(kpis.total)} />
          <KpiCard title="Active users" value={String(kpis.active)} />
          <KpiCard title="MFA enabled" value={String(kpis.mfa)} />
          <KpiCard
            title="Active sessions"
            value={kpis.activeSessions == null ? "—" : String(kpis.activeSessions)}
            hint={
              kpis.activeSessions == null
                ? "Requires audit visibility; approximated from recent successful logins."
                : "Approximation: distinct users with a login in the last 24h."
            }
          />
        </div>
      </div>

      <div className="col-12">
        <div className="card p-24 radius-12">
          {!canListUsers ? (
            <div className="alert alert-warning mb-0">
              You do not have permission to list users for this tenant.
            </div>
          ) : null}

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <div className="row g-3 align-items-end">
            <div className="col-lg-4">
              <label className="form-label mb-8">Search</label>
              <input
                className="form-control"
                placeholder="Name, email, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-lg-3">
              <label className="form-label mb-8">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={!canListUsers}
              >
                <option value="">All</option>
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="pending_email_verification">pending_email_verification</option>
              </select>
            </div>
            <div className="col-lg-3">
              <label className="form-label mb-8">Role</label>
              <input
                className="form-control"
                placeholder="Filter by role name…"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={!canListUsers}
              />
            </div>
            <div className="col-lg-2">
              <label className="form-label mb-8">More</label>
              <button type="button" className="btn btn-outline-secondary w-100" disabled>
                More filters
              </button>
            </div>
          </div>

          <div className="table-responsive scroll-sm mt-16">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>MFA</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-secondary-light py-24">
                      Loading…
                    </td>
                  </tr>
                ) : null}

                {!loading && canListUsers
                  ? filtered.map((u) => (
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
                              <div className="fw-medium">{fullName(u)}</div>
                              <div className="text-secondary-light text-sm">{u.email ?? "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-secondary-light">{roleSummary(u)}</td>
                        <td className="text-secondary-light">{branchLabelForUser(u)}</td>
                        <td>
                          <span
                            className={`badge ${
                              u.status === "active" ? "bg-success" : u.status === "suspended" ? "bg-danger" : "bg-warning text-dark"
                            }`}
                          >
                            {u.status ?? "—"}
                          </span>
                        </td>
                        <td className="text-secondary-light">{formatShortWhen(lastLoginForUser(u))}</td>
                        <td className="text-secondary-light">{u.mfa_enabled ? "Enabled" : "Disabled"}</td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            {canView ? (
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openDetails(u)}>
                                View
                              </button>
                            ) : null}
                            {canUpdate ? (
                              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(u)}>
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
                    <td colSpan={7} className="text-center text-secondary-light py-24">
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
