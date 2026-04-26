import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";
import { RoleUpsertModal } from "./RoleUpsertModal";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
}

function hasPerm(perms, name) {
  return Array.isArray(perms) && perms.includes(name);
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

function roleTypeLabel(r) {
  if (r?.is_system) return "System";
  return "Custom";
}

export function AdminRolesView() {
  const [perms, setPerms] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeRole, setActiveRole] = useState(null);

  const canList = hasPerm(perms, "roles.list");
  const canCreate = hasPerm(perms, "roles.create");
  const canUpdate = hasPerm(perms, "roles.update");
  const canDelete = hasPerm(perms, "roles.delete");
  const canManagePerms =
    hasPerm(perms, "roles.permissions.assign") || hasPerm(perms, "roles.permissions.revoke");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const permRes = await authzkit.users.getMyPermissions();
      const nextPerms = Array.isArray(permRes?.permissions) ? permRes.permissions : [];
      setPerms(nextPerms);

      if (!nextPerms.includes("roles.list")) {
        setRoles([]);
        return;
      }

      const items = await fetchAllPages((page) => authzkit.roles.list({ page, page_size: 200 }));
      setRoles(items);
    } catch (e) {
      setRoles([]);
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return roles.filter((r) => {
      if (typeFilter) {
        const want = typeFilter === "system";
        if (Boolean(r.is_system) !== want) return false;
      }

      if (!query) return true;
      const hay = `${r.name ?? ""} ${r.label ?? ""} ${r.description ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [roles, q, typeFilter]);

  const openCreate = () => {
    setActiveRole(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setActiveRole(r);
    setModalMode("edit");
    setModalOpen(true);
  };

  const onDeleteRole = async (r) => {
    if (!r?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete role “${r.label || r.name}”?`);
    if (!ok) return;
    setError("");
    try {
      await authzkit.roles.delete(r.id);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="row gy-4">
      <div className="col-12">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <h5 className="mb-6">Roles &amp; Permissions</h5>
            <div className="text-secondary-light">
              System roles are read-only. Custom roles can be edited and assigned permissions.
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={load} disabled={loading}>
              <Icon icon="solar:refresh-linear" className="icon text-md me-1" />
              Refresh
            </button>
            {canCreate ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>
                <Icon icon="ic:baseline-plus" className="icon text-md me-1" />
                Create role
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card p-24 radius-12">
          {!canList ? (
            <div className="alert alert-warning mb-0">
              You do not have permission to list roles for this tenant.
            </div>
          ) : null}

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <div className="row g-3 align-items-end">
            <div className="col-lg-6">
              <label className="form-label mb-8">Search</label>
              <input
                className="form-control"
                placeholder="Role name, label, or description…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={!canList}
              />
            </div>
            <div className="col-lg-3">
              <label className="form-label mb-8">Type</label>
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                disabled={!canList}
              >
                <option value="">All</option>
                <option value="system">System</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="col-lg-3">
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
                  <th>Role</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Permissions</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-secondary-light py-24">
                      Loading…
                    </td>
                  </tr>
                ) : null}

                {!loading && canList
                  ? filtered.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="fw-medium">{r.label || r.name}</div>
                          <div className="text-secondary-light text-sm">{r.name}</div>
                        </td>
                        <td className="text-secondary-light">{r.description || "—"}</td>
                        <td>
                          <span className={`badge ${r.is_system ? "bg-secondary" : "bg-primary"}`}>
                            {roleTypeLabel(r)}
                          </span>
                        </td>
                        <td className="text-secondary-light">
                          <span title="Loaded on-demand in the editor modal">View in editor</span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(r)}>
                              View
                            </button>
                            {!r.is_system && canUpdate ? (
                              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>
                                Edit
                              </button>
                            ) : null}
                            {!r.is_system && canDelete ? (
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDeleteRole(r)}>
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}

                {!loading && canList && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary-light py-24">
                      No roles found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RoleUpsertModal
        show={modalOpen}
        mode={modalMode}
        role={activeRole}
        canManagePermissions={canManagePerms}
        onHide={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

