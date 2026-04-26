import React, { useMemo, useState } from "react";
import { Modal, Button, Badge, ListGroup, Alert } from "react-bootstrap";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
}

function fullName(u) {
  const name = `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim();
  return name || u?.email || u?.phone_number || u?.id || "User";
}

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

export function UserDetailsModal({
  show,
  user,
  branchLabel,
  activeSessionCount,
  lastLoginAt,
  canUpdate,
  canDelete,
  onHide,
  onEdit,
  onChanged,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const roles = useMemo(() => (Array.isArray(user?.roles) ? user.roles : []), [user]);

  async function onDelete() {
    if (!user?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Deactivate this user? This can be reversed only by restoring the account from Authz.");
    if (!ok) return;

    setError("");
    setBusy(true);
    try {
      await authzkit.users.delete(user.id);
      await onChanged?.();
      onHide?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>User details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!user ? (
          <div className="text-secondary-light">No user selected.</div>
        ) : (
          <>
            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
              <div>
                <div className="fw-semibold text-lg">{fullName(user)}</div>
                <div className="text-secondary-light">{user.email ?? "—"}</div>
                <div className="text-secondary-light">{user.phone_number ?? ""}</div>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <Badge bg={user.status === "active" ? "success" : user.status === "suspended" ? "danger" : "secondary"}>
                  {user.status ?? "unknown"}
                </Badge>
                <Badge bg={user.mfa_enabled ? "primary" : "secondary"}>
                  MFA {user.mfa_enabled ? "on" : "off"}
                </Badge>
              </div>
            </div>

            <ListGroup variant="flush" className="mt-16">
              <ListGroup.Item className="px-0">
                <div className="text-secondary-light text-sm">Branch</div>
                <div className="fw-medium">{branchLabel}</div>
              </ListGroup.Item>
              <ListGroup.Item className="px-0">
                <div className="text-secondary-light text-sm">Last login (approx.)</div>
                <div className="fw-medium">{formatWhen(lastLoginAt)}</div>
              </ListGroup.Item>
              <ListGroup.Item className="px-0">
                <div className="text-secondary-light text-sm">Active sessions (24h, approx.)</div>
                <div className="fw-medium">{activeSessionCount ?? "—"}</div>
              </ListGroup.Item>
            </ListGroup>

            <div className="mt-16">
              <div className="text-secondary-light text-sm mb-8">Roles</div>
              {roles.length ? (
                <div className="d-flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <Badge key={r.id ?? `${r.name}-${r.label}`} bg="light" text="dark" className="border">
                      {(r.label || r.name || r.id || "role").toString()}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-secondary-light">No roles on this user (yet).</div>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex flex-wrap gap-2 justify-content-between">
        <div className="d-flex gap-2">
          <Button variant="light" onClick={onHide} disabled={busy}>
            Close
          </Button>
          {canUpdate ? (
            <Button
              variant="outline-primary"
              onClick={() => {
                onEdit?.(user);
              }}
              disabled={busy || !user}
            >
              Edit
            </Button>
          ) : null}
        </div>

        <div className="d-flex gap-2">
          {canDelete ? (
            <Button variant="outline-danger" onClick={onDelete} disabled={busy || !user}>
              Deactivate
            </Button>
          ) : null}
        </div>
      </Modal.Footer>
    </Modal>
  );
}
