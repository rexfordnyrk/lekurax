import React, { useMemo, useState } from "react";
import { Modal, Button, Alert } from "react-bootstrap";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";
import "../ui/m1Modal.css";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
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

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function roleLine(u) {
  const roles = Array.isArray(u?.roles) ? u.roles : [];
  if (!roles.length) return "—";
  return roles
    .map((r) => (r.label || r.name || r.id || "").toString())
    .filter(Boolean)
    .join(", ");
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

  const statusBadgeClass =
    user?.status === "active" ? "badge-success" : user?.status === "suspended" ? "badge-warning" : "badge-neutral";

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      scrollable
      backdropClassName="m1-modal-backdrop"
      dialogClassName="m1-modal-dialog--wide"
      contentClassName="m1-modal-skin"
    >
      <Modal.Header closeButton={false} className="m1-modal-header rounded-0">
        <Modal.Title as="h2" className="m1-modal-title">
          User Details
        </Modal.Title>
        <button type="button" className="m1-modal-close" onClick={onHide} aria-label="Close">
          <i className="ri-close-line" aria-hidden />
        </button>
      </Modal.Header>
      <Modal.Body className="m1-modal-body">
        {!user ? (
          <div className="text-secondary-light">No user selected.</div>
        ) : (
          <>
            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="m1-user-detail-hero">
              <div className="m1-user-detail-avatar">{initials(user)}</div>
              <div className="m1-user-detail-hero-main">
                <h3 className="m1-user-detail-name">{fullName(user)}</h3>
                <div className="m1-user-detail-email">{user.email ?? "—"}</div>
                {user.phone_number ? (
                  <div className="m1-user-detail-email">{user.phone_number}</div>
                ) : null}
                <div className="m1-user-detail-meta">
                  <span className={`badge ${statusBadgeClass}`}>{user.status ?? "—"}</span>
                </div>
              </div>
              {canUpdate ? (
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  className="d-inline-flex align-items-center gap-2"
                  onClick={() => onEdit?.(user)}
                  disabled={busy}
                >
                  <i className="ri-edit-line" aria-hidden />
                  Edit
                </Button>
              ) : null}
            </div>

            <div className="m1-form-grid">
              <div className="m1-form-group">
                <span className="m1-form-label">Role</span>
                <div className="m1-user-readonly">{roleLine(user)}</div>
              </div>
              <div className="m1-form-group">
                <span className="m1-form-label">Branch</span>
                <div className="m1-user-readonly">{branchLabel}</div>
              </div>
              <div className="m1-form-group">
                <span className="m1-form-label">Last Login</span>
                <div className="m1-user-readonly">{formatWhen(lastLoginAt)}</div>
              </div>
              <div className="m1-form-group">
                <span className="m1-form-label">MFA Status</span>
                <div className="m1-user-readonly">
                  <span className={`badge ${user.mfa_enabled ? "badge-success" : "badge-warning"}`}>
                    {user.mfa_enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="m1-form-group m1-form-group--full">
                <span className="m1-form-label">Active sessions (24h)</span>
                <div className="m1-user-readonly">{activeSessionCount ?? "—"}</div>
              </div>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="m1-modal-footer m1-modal-footer--split rounded-0">
        <div className="d-flex gap-2 me-auto">
          {canDelete ? (
            <Button variant="outline-danger" size="sm" onClick={onDelete} disabled={busy || !user}>
              <i className="ri-user-unfollow-line me-1" aria-hidden />
              Deactivate
            </Button>
          ) : null}
        </div>
        <div className="d-flex gap-2">
          <Button variant="secondary" type="button" onClick={onHide} disabled={busy}>
            Close
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
