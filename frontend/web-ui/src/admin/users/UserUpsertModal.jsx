import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";
import "../ui/m1Modal.css";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
}

/** Mockup password hint: min 8 + upper, lower, number */
function validateCreatePassword(p) {
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(p)) return "Password must include an uppercase letter.";
  if (!/[a-z]/.test(p)) return "Password must include a lowercase letter.";
  if (!/[0-9]/.test(p)) return "Password must include a number.";
  return "";
}

/** Real branch UUID for APIs; empty or "All branches" sentinel → omit. */
function resolvedBranchId(value) {
  if (!value || value === "__all__") return undefined;
  return value;
}

export function UserUpsertModal({
  show,
  mode,
  tenantId,
  user,
  canAssignRoles,
  canAssignBranch = false,
  branchOptions = [],
  onHide,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState("");
  const [branchId, setBranchId] = useState("");

  const [requireMfa, setRequireMfa] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const hasBranchChoices = branchOptions.length > 0;

  useEffect(() => {
    if (!show) return;

    setError("");
    setSubmitting(false);
    setPassword("");
    setPasswordConfirm("");
    setRequireMfa(false);
    setSendWelcomeEmail(true);

    if (isEdit && user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone_number ?? "");
      setRoleId("");
      setBranchId("");
      setRequireMfa(Boolean(user.mfa_enabled));
      setSendWelcomeEmail(false);
      return;
    }

    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleId("");
    setBranchId("");
    setRequireMfa(false);
    setSendWelcomeEmail(true);
  }, [show, isEdit, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      if (!show || !canAssignRoles) {
        setRoles([]);
        return;
      }

      try {
        const collected = [];
        let page = 1;
        for (let i = 0; i < 20; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const res = await authzkit.roles.list({ page, page_size: 100 });
          const batch = Array.isArray(res?.items) ? res.items : [];
          collected.push(...batch);

          const meta = res?.meta;
          const total = Number(meta?.total ?? collected.length);
          const pageSize = Number(meta?.page_size ?? batch.length);
          if (!meta || page * pageSize >= total || batch.length === 0) break;
          page += 1;
        }

        if (!cancelled) {
          setRoles(collected);
        }
      } catch {
        if (!cancelled) setRoles([]);
      }
    }

    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [show, canAssignRoles]);

  const title = useMemo(() => (isEdit ? "Edit User Account" : "Create New User"), [isEdit]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isEdit) {
        if (!user?.id) throw new Error("Missing user id");
        await authzkit.users.update(user.id, {
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone_number: phone || null,
        });
      } else {
        if (!tenantId) throw new Error("Missing tenant id");
        if (!email?.trim()) {
          throw new Error("Email address is required.");
        }

        const pwd = password.trim();
        const pwd2 = passwordConfirm.trim();
        if (pwd !== pwd2) {
          throw new Error("Passwords do not match.");
        }
        const pwdErr = validateCreatePassword(pwd);
        if (pwdErr) throw new Error(pwdErr);

        if (canAssignRoles && roles.length > 0 && !roleId) {
          throw new Error("Please select a role.");
        }

        if (hasBranchChoices && !branchId) {
          throw new Error("Please select a branch assignment.");
        }

        const { user: created } = await authzkit.auth.register({
          tenant_id: tenantId,
          first_name: firstName,
          last_name: lastName,
          email: email.trim(),
          phone_number: phone?.trim() || undefined,
          password: pwd,
        });

        const uid = created?.id;
        const roleBranch = resolvedBranchId(branchId);

        if (uid && roleId) {
          await authzkit.users.assignRole(uid, {
            role_id: roleId,
            ...(roleBranch ? { branch_id: roleBranch } : {}),
          });
        }

        const bu = resolvedBranchId(branchId);
        if (uid && bu && canAssignBranch) {
          try {
            await authzkit.branches.assignUser(bu, uid);
          } catch (assignErr) {
            console.warn(assignErr);
          }
        }

        if (requireMfa && uid) {
          console.info("Require MFA requested for new user; tenant policy and user enrollment still apply.");
        }
        if (!sendWelcomeEmail && uid) {
          console.info("Welcome email preference noted; server may still send verification when configured.");
        }
      }

      onSaved?.();
      onHide?.();
    } catch (err) {
      setError(err?.message ? String(err.message) : errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      backdropClassName="m1-modal-backdrop"
      dialogClassName="m1-modal-dialog"
      contentClassName="m1-modal-skin"
    >
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton={false} className="m1-modal-header rounded-0">
          <Modal.Title as="h6" className="m1-modal-title">
            {title}
          </Modal.Title>
          <button type="button" className="m1-modal-close" onClick={onHide} aria-label="Close">
            <i className="ri-close-line" aria-hidden />
          </button>
        </Modal.Header>
        <Modal.Body className="m1-modal-body">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          {isEdit ? (
            <div className="m1-form-grid">
              <div className="m1-form-group">
                <label htmlFor="admin-user-first-name" className="m1-form-label m1-form-label--required">
                  First Name
                </label>
                <Form.Control
                  id="admin-user-first-name"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="m1-form-group">
                <label htmlFor="admin-user-last-name" className="m1-form-label m1-form-label--required">
                  Last Name
                </label>
                <Form.Control
                  id="admin-user-last-name"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
              <div className="m1-form-group">
                <label htmlFor="admin-user-email" className="m1-form-label">
                  Email Address
                </label>
                <Form.Control
                  id="admin-user-email"
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="m1-form-group">
                <label htmlFor="admin-user-phone" className="m1-form-label">
                  Phone Number
                </label>
                <Form.Control
                  id="admin-user-phone"
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="m1-form-grid">
                <div className="m1-form-group">
                  <label htmlFor="admin-user-first-name" className="m1-form-label m1-form-label--required">
                    First Name
                  </label>
                  <Form.Control
                    id="admin-user-first-name"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="m1-form-group">
                  <label htmlFor="admin-user-last-name" className="m1-form-label m1-form-label--required">
                    Last Name
                  </label>
                  <Form.Control
                    id="admin-user-last-name"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </div>

                <div className="m1-form-group">
                  <label htmlFor="admin-user-email" className="m1-form-label m1-form-label--required">
                    Email Address
                  </label>
                  <Form.Control
                    id="admin-user-email"
                    type="email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="m1-form-group">
                  <label htmlFor="admin-user-phone" className="m1-form-label">
                    Phone Number
                  </label>
                  <Form.Control
                    id="admin-user-phone"
                    value={phone}
                    onChange={(ev) => setPhone(ev.target.value)}
                    placeholder="+1 (555) 000-0000"
                    autoComplete="tel"
                  />
                </div>

                {canAssignRoles ? (
                  <div className="m1-form-group">
                    <label htmlFor="admin-user-role" className="m1-form-label m1-form-label--required">
                      Role
                    </label>
                    <Form.Select
                      id="admin-user-role"
                      value={roleId}
                      onChange={(ev) => setRoleId(ev.target.value)}
                      required={roles.length > 0}
                      disabled={roles.length === 0}
                    >
                      <option value="">Select role…</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {(r.label || r.name || r.id).toString()}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                ) : (
                  <div className="m1-form-group">
                    <span className="m1-form-label m1-form-label--required">Role</span>
                    <Form.Select disabled value="">
                      <option>Requires users.roles.assign</option>
                    </Form.Select>
                  </div>
                )}

                <div className="m1-form-group">
                  <label htmlFor="admin-user-branch" className="m1-form-label m1-form-label--required">
                    Branch Assignment
                  </label>
                  <Form.Select
                    id="admin-user-branch"
                    value={branchId}
                    onChange={(ev) => setBranchId(ev.target.value)}
                    required={hasBranchChoices}
                    disabled={!hasBranchChoices}
                  >
                    <option value="">Select branch…</option>
                    <option value="__all__">All branches</option>
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <div className="m1-form-group">
                  <label htmlFor="admin-user-password" className="m1-form-label m1-form-label--required">
                    Password
                  </label>
                  <Form.Control
                    id="admin-user-password"
                    type="password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    autoComplete="new-password"
                  />
                  <span className="m1-form-help">
                    Minimum 8 characters, include uppercase, lowercase, number
                  </span>
                </div>
                <div className="m1-form-group">
                  <label htmlFor="admin-user-password2" className="m1-form-label m1-form-label--required">
                    Confirm Password
                  </label>
                  <Form.Control
                    id="admin-user-password2"
                    type="password"
                    value={passwordConfirm}
                    onChange={(ev) => setPasswordConfirm(ev.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="m1-form-grid m1-form-grid--single m1-form-stack">
                <div className="m1-checkbox-group">
                  <input
                    type="checkbox"
                    id="admin-user-require-mfa"
                    checked={requireMfa}
                    onChange={(ev) => setRequireMfa(ev.target.checked)}
                  />
                  <label htmlFor="admin-user-require-mfa">Require Multi-Factor Authentication (MFA)</label>
                </div>
                <div className="m1-checkbox-group">
                  <input
                    type="checkbox"
                    id="admin-user-send-welcome"
                    checked={sendWelcomeEmail}
                    onChange={(ev) => setSendWelcomeEmail(ev.target.checked)}
                  />
                  <label htmlFor="admin-user-send-welcome">Send welcome email with login credentials</label>
                </div>
                <p className="m1-form-help mb-0">
                  A verification email is sent automatically for new addresses when tenant email delivery is configured.
                  MFA is completed by the user from their profile according to tenant policy.
                </p>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="m1-modal-footer rounded-0">
          <Button variant="secondary" type="button" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
