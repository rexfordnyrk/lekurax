import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";
import { usePermissions } from "../../auth/PermissionContext.jsx";
import { RoleUpsertModal } from "./RoleUpsertModal";
import { useAdminShell } from "../ui/AdminShellContext";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
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
  const { setHeaderActions } = useAdminShell();
  const { hasPermission } = usePermissions();

  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeRole, setActiveRole] = useState(null);

  const canList = hasPermission("roles.list");
  const canCreate = hasPermission("roles.create");
  const canUpdate = hasPermission("roles.update");
  const canDelete = hasPermission("roles.delete");
  const canManagePerms =
    hasPermission("roles.permissions.assign") || hasPermission("roles.permissions.revoke");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!canList) {
        setRoles([]);
        setLoading(false);
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
  }, [canList]);

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

  const openCreate = useCallback(() => {
    setActiveRole(null);
    setModalMode("create");
    setModalOpen(true);
  }, []);

  const openEdit = (r) => {
    setActiveRole(r);
    setModalMode("edit");
    setModalOpen(true);
  };

  useEffect(() => {
    setHeaderActions(
      <div className="admin-shell-header-buttons d-flex align-items-center gap-2 flex-wrap justify-content-end">
        {canCreate ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="ri-add-line" />
            <span className="ms-1">Create Custom Role</span>
          </button>
        ) : null}
      </div>
    );
    return () => setHeaderActions(null);
  }, [canCreate, openCreate, setHeaderActions]);

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
    <div className="content-area">
      <div className="filters-bar">
        <div className="search-input">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="Search roles by name, label, or description..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={!canList}
          />
        </div>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          disabled={!canList}
        >
          <option value="">All Types</option>
          <option value="system">System</option>
          <option value="custom">Custom</option>
        </select>
        <button type="button" className="btn btn-secondary btn-sm" disabled>
          <i className="ri-filter-3-line" />
          More Filters
        </button>
      </div>

      <div className="card">
        <div className="card-header m1-card-header">
          <h3 className="card-title">Roles &amp; Permissions ({filtered.length})</h3>
        </div>

        {!canList ? (
          <div className="card-body">
            <div className="alert alert-warning mb-0">
              You do not have permission to list roles for this tenant.
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
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Permissions</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: "rgba(15,23,42,0.6)" }}>
                      Loading…
                    </td>
                  </tr>
                ) : null}

                {!loading && canList
                  ? filtered.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="user-name">{r.label || r.name}</div>
                          <div className="user-email">{r.name}</div>
                        </td>
                        <td>{r.description || "—"}</td>
                        <td>
                          <span className={`badge ${r.is_system ? "badge-info" : "badge-neutral"}`}>
                            {roleTypeLabel(r)}
                          </span>
                        </td>
                        <td>
                          <span className="user-email" title="Loaded in editor modal">
                            View in editor
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEdit(r)}
                            >
                              View
                            </button>
                            {!r.is_system && canUpdate ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => openEdit(r)}
                              >
                                Edit
                              </button>
                            ) : null}
                            {!r.is_system && canDelete ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onDeleteRole(r)}
                              >
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
                    <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "rgba(15,23,42,0.6)" }}>
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

