import React, { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Form, Modal } from "react-bootstrap";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
}

function normalizeRoleName(name) {
  return (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

function groupPermissions(perms) {
  const groups = new Map();
  for (const p of perms) {
    const module = p?.module ?? "general";
    const category = p?.category ?? "general";
    const key = `${module}::${category}`;
    const current = groups.get(key) ?? { module, category, items: [] };
    current.items.push(p);
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort((a, b) => {
    const am = a.module.localeCompare(b.module);
    if (am !== 0) return am;
    return a.category.localeCompare(b.category);
  });
}

function toPermissionNameList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p) => p?.name).filter((n) => typeof n === "string" && n.length > 0);
}

export function RoleUpsertModal({
  show,
  mode,
  role,
  canManagePermissions,
  onHide,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const [allPermissions, setAllPermissions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [original, setOriginal] = useState(new Set());
  const [permSearch, setPermSearch] = useState("");

  const [loadingRole, setLoadingRole] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => (isEdit ? "Edit role" : "Create role"), [isEdit]);

  useEffect(() => {
    if (!show) return;
    setError("");
    setSubmitting(false);
    setPermSearch("");

    if (!isEdit) {
      setName("");
      setLabel("");
      setDescription("");
      setSelected(new Set());
      setOriginal(new Set());
      return;
    }

    setName(role?.name ?? "");
    setLabel(role?.label ?? "");
    setDescription(role?.description ?? "");
  }, [show, isEdit, role]);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissionRegistry() {
      if (!show || !canManagePermissions) {
        setAllPermissions([]);
        return;
      }
      setLoadingPerms(true);
      try {
        const items = await fetchAllPages((page) =>
          authzkit.permissions.list({ page, page_size: 200 })
        );
        if (!cancelled) setAllPermissions(items);
      } catch {
        if (!cancelled) setAllPermissions([]);
      } finally {
        if (!cancelled) setLoadingPerms(false);
      }
    }

    loadPermissionRegistry();
    return () => {
      cancelled = true;
    };
  }, [show, canManagePermissions]);

  useEffect(() => {
    let cancelled = false;

    async function loadRolePermissions() {
      if (!show || !isEdit || !canManagePermissions) return;
      if (!role?.id) return;
      setLoadingRole(true);
      setError("");
      try {
        const full = await authzkit.roles.get(role.id);
        const direct = toPermissionNameList(full?.permissions);
        const next = new Set(direct);
        if (!cancelled) {
          setSelected(next);
          setOriginal(new Set(direct));
        }
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoadingRole(false);
      }
    }

    loadRolePermissions();
    return () => {
      cancelled = true;
    };
  }, [show, isEdit, role, canManagePermissions]);

  const groups = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const filtered = q
      ? allPermissions.filter((p) => {
          const hay = `${p?.name ?? ""} ${p?.label ?? ""} ${p?.module ?? ""} ${p?.category ?? ""}`.toLowerCase();
          return hay.includes(q);
        })
      : allPermissions;
    return groupPermissions(filtered);
  }, [allPermissions, permSearch]);

  function togglePermission(nameToToggle) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nameToToggle)) next.delete(nameToToggle);
      else next.add(nameToToggle);
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!label.trim()) throw new Error("Role label is required");

      if (!isEdit) {
        const roleName = normalizeRoleName(name);
        if (!roleName) throw new Error("Role name is required");

        const created = await authzkit.roles.create({
          name: roleName,
          label: label.trim(),
          description: description.trim() || "",
        });

        const permsToAssign = Array.from(selected);
        if (canManagePermissions && permsToAssign.length) {
          await authzkit.roles.assignPermissions(created.id, permsToAssign);
        }
      } else {
        if (!role?.id) throw new Error("Missing role id");

        await authzkit.roles.update(role.id, {
          label: label.trim(),
          description: description.trim() || "",
        });

        if (canManagePermissions) {
          const now = new Set(selected);
          const before = new Set(original);

          const toAssign = Array.from(now).filter((p) => !before.has(p));
          const toRevoke = Array.from(before).filter((p) => !now.has(p));

          if (toAssign.length) await authzkit.roles.assignPermissions(role.id, toAssign);
          if (toRevoke.length) await authzkit.roles.revokePermissions(role.id, toRevoke);
        }
      }

      onSaved?.();
      onHide?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="xl" backdrop="static">
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="row g-3">
            <div className="col-md-4">
              <Form.Group controlId="admin-role-name">
                <Form.Label>Role name</Form.Label>
                <Form.Control
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="e.g. store_manager"
                  disabled={isEdit}
                  required={!isEdit}
                />
                <Form.Text className="text-secondary-light">
                  Machine name; cannot be changed after creation.
                </Form.Text>
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group controlId="admin-role-label">
                <Form.Label>Label</Form.Label>
                <Form.Control
                  value={label}
                  onChange={(ev) => setLabel(ev.target.value)}
                  placeholder="e.g. Store Manager"
                  required
                />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group controlId="admin-role-type">
                <Form.Label>Type</Form.Label>
                <div>
                  <Badge bg={role?.is_system ? "secondary" : "primary"}>
                    {role?.is_system ? "System" : "Custom"}
                  </Badge>
                </div>
              </Form.Group>
            </div>

            <div className="col-12">
              <Form.Group controlId="admin-role-description">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={description}
                  onChange={(ev) => setDescription(ev.target.value)}
                  placeholder="Optional: what this role is for…"
                />
              </Form.Group>
            </div>
          </div>

          <div className="mt-20">
            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-12">
              <div className="fw-semibold">Permissions</div>
              {!canManagePermissions ? (
                <div className="text-secondary-light text-sm">
                  You don’t have permission to manage role permissions.
                </div>
              ) : null}
            </div>

            {canManagePermissions ? (
              <div className="card p-16 radius-12">
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-12">
                  <div className="text-secondary-light text-sm">
                    Selected: <span className="fw-semibold">{selected.size}</span>
                  </div>
                  <div style={{ minWidth: 260 }}>
                    <Form.Control
                      value={permSearch}
                      onChange={(ev) => setPermSearch(ev.target.value)}
                      placeholder="Search permissions…"
                    />
                  </div>
                </div>

                {loadingPerms || loadingRole ? (
                  <div className="text-secondary-light">Loading permissions…</div>
                ) : null}

                {!loadingPerms && groups.length === 0 ? (
                  <div className="text-secondary-light">No permissions found.</div>
                ) : null}

                {!loadingPerms
                  ? groups.map((g) => (
                      <div key={`${g.module}::${g.category}`} className="mb-16">
                        <div className="d-flex align-items-center gap-2 mb-8">
                          <span className="fw-semibold">{g.module}</span>
                          <span className="text-secondary-light">/</span>
                          <span className="text-secondary-light">{g.category}</span>
                        </div>

                        <div className="row g-2">
                          {g.items
                            .slice()
                            .sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""))
                            .map((p) => {
                              const pname = p?.name ?? "";
                              const checked = selected.has(pname);
                              return (
                                <div key={p.id ?? pname} className="col-sm-6 col-lg-4">
                                  <div className="border rounded-3 p-2 h-100">
                                    <Form.Check
                                      type="checkbox"
                                      id={`perm-${pname}`}
                                      checked={checked}
                                      onChange={() => togglePermission(pname)}
                                      label={
                                        <div>
                                          <div className="fw-medium">{p.label || pname}</div>
                                          <div className="text-secondary-light text-xs">{pname}</div>
                                        </div>
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" type="button" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create role"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
