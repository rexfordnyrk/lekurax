import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
}

export function UserUpsertModal({
  show,
  mode,
  tenantId,
  user,
  canAssignRoles,
  onHide,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show) return;

    setError("");
    setSubmitting(false);
    setPassword("");

    if (isEdit && user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone_number ?? "");
      setRoleId("");
      return;
    }

    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleId("");
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
        // Keep this bounded; role cardinality should be small.
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

  const title = useMemo(() => (isEdit ? "Edit user" : "Add user"), [isEdit]);

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
        const { user: created } = await authzkit.auth.register({
          tenant_id: tenantId,
          first_name: firstName,
          last_name: lastName,
          email: email || undefined,
          phone_number: phone || undefined,
          password: password || undefined,
        });

        if (roleId && created?.id) {
          await authzkit.users.assignRole(created.id, { role_id: roleId });
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
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="row g-3">
            <div className="col-md-6">
              <Form.Group controlId="admin-user-first-name">
                <Form.Label>First name</Form.Label>
                <Form.Control
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  required
                  autoComplete="given-name"
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group controlId="admin-user-last-name">
                <Form.Label>Last name</Form.Label>
                <Form.Control
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  required
                  autoComplete="family-name"
                />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group controlId="admin-user-email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  autoComplete="email"
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group controlId="admin-user-phone">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  placeholder="+15550100"
                  autoComplete="tel"
                />
              </Form.Group>
            </div>

            {!isEdit ? (
              <div className="col-md-6">
                <Form.Group controlId="admin-user-password">
                  <Form.Label>Password (optional)</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    autoComplete="new-password"
                  />
                  <Form.Text className="text-secondary-light">
                    Leave blank to create an OTP-only account (when phone is used).
                  </Form.Text>
                </Form.Group>
              </div>
            ) : null}

            {!isEdit && canAssignRoles ? (
              <div className="col-md-6">
                <Form.Group controlId="admin-user-role">
                  <Form.Label>Initial role (optional)</Form.Label>
                  <Form.Select value={roleId} onChange={(ev) => setRoleId(ev.target.value)}>
                    <option value="">— None —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {(r.label || r.name || r.id).toString()}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            ) : null}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" type="button" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create user"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
