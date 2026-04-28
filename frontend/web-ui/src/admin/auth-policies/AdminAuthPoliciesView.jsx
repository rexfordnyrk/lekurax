import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Alert, Button, Form } from "react-bootstrap";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";
import { usePermissions } from "../../auth/PermissionContext.jsx";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Request failed";
}

function getHostForLookup() {
  if (typeof window === "undefined") return "";
  // backend expects host string (may include port)
  return window.location.host;
}

export function AdminAuthPoliciesView() {
  const { hasPermission } = usePermissions();
  const canUpdatePolicies = hasPermission("tenant.settings.update");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password policy
  const [minLength, setMinLength] = useState(12);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireLower, setRequireLower] = useState(true);
  const [requireDigit, setRequireDigit] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(false);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(5);
  const [lockoutDurationMins, setLockoutDurationMins] = useState(15);

  // MFA policy
  const [mfaPolicy, setMfaPolicy] = useState("optional"); // required | optional | disabled
  const [allowPasswordlessOtp, setAllowPasswordlessOtp] = useState(false);
  const [autoCreateOnOtp, setAutoCreateOnOtp] = useState(false);

  // Session policy (not yet in TenantConfig in authz backend)
  const [sessionIdleMins, setSessionIdleMins] = useState(30);
  const [sessionMaxAgeHours, setSessionMaxAgeHours] = useState(24);
  const [sessionDeviceLimit, setSessionDeviceLimit] = useState(5);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const lookup = await authzkit.tenants.lookupByDomain(getHostForLookup());
      if (!lookup?.tenant_id) throw new Error("Tenant could not be resolved for this host");

      const cfg = lookup?.config ?? {};
      const pwd = cfg.password_policy ?? null;
      if (pwd) {
        setMinLength(Number(pwd.min_length ?? 12));
        setRequireUpper(Boolean(pwd.require_uppercase));
        // authz uses require_digit / require_special_char; UI shows lower too as a frontend-level option.
        setRequireLower(true);
        setRequireDigit(Boolean(pwd.require_digit));
        setRequireSpecial(Boolean(pwd.require_special_char));
        setMaxFailedAttempts(Number(pwd.max_failed_attempts ?? 5));
        setLockoutDurationMins(Number(pwd.lockout_duration ?? 15));
      }

      setMfaPolicy(String(cfg.mfa_policy ?? "optional"));
      setAllowPasswordlessOtp(Boolean(cfg.allow_passwordless_otp));
      setAutoCreateOnOtp(Boolean(cfg.auto_create_on_otp));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sessionUnsupportedMessage = useMemo(() => {
    return "Session policy fields are not present in the current Authz tenant config API. This section is shown for consolidation, but saving session settings is not supported yet.";
  }, []);

  const onSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      if (!canUpdatePolicies) throw new Error("You do not have permission to update tenant policies.");

      await authzkit.tenants.updateMyConfig({
        mfa_policy: mfaPolicy,
        allow_passwordless_otp: Boolean(allowPasswordlessOtp),
        auto_create_on_otp: Boolean(autoCreateOnOtp),
        password_policy: {
          min_length: Number(minLength),
          require_uppercase: Boolean(requireUpper),
          require_digit: Boolean(requireDigit),
          require_special_char: Boolean(requireSpecial),
          max_failed_attempts: Number(maxFailedAttempts),
          lockout_duration: Number(lockoutDurationMins),
        },
      });

      setSuccess("Policies saved.");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-area">
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header m1-card-header">
          <h3 className="card-title">Auth policies</h3>
          <div className="m1-card-header-export">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onSave}
              disabled={loading || saving || !canUpdatePolicies}
            >
              <Icon icon="solar:diskette-linear" className="icon text-md" />
              Save policies
            </button>
          </div>
        </div>
        <div className="card-body">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}
          {!canUpdatePolicies ? (
            <Alert variant="warning" className="mb-0">
              You don’t have <code>tenant.settings.update</code>, so this page is read-only.
            </Alert>
          ) : null}
        </div>
      </div>

      <div className="row gy-4">

      <div className="col-lg-4">
        <div className="card h-100">
          <div className="card-header">
            <h3 className="card-title">Password policy</h3>
          </div>
          <div className="card-body">
            <div className="text-secondary-light mb-16">
              Enforce minimum complexity and lockout thresholds.
            </div>

            <div className="row g-3">
            <div className="col-12">
              <Form.Group controlId="auth-policy-min-length">
                <Form.Label>Minimum length</Form.Label>
                <Form.Control
                  type="number"
                  min={6}
                  value={minLength}
                  onChange={(e) => setMinLength(e.target.value)}
                  disabled={!canUpdatePolicies}
                />
              </Form.Group>
            </div>

            <div className="col-12">
              <Form.Check
                id="auth-policy-upper"
                type="switch"
                label="Require uppercase"
                checked={requireUpper}
                onChange={(e) => setRequireUpper(e.target.checked)}
                disabled={!canUpdatePolicies}
              />
              <Form.Check
                id="auth-policy-lower"
                type="switch"
                label="Require lowercase (UI hint)"
                checked={requireLower}
                onChange={(e) => setRequireLower(e.target.checked)}
                disabled
              />
              <Form.Check
                id="auth-policy-digit"
                type="switch"
                label="Require digits"
                checked={requireDigit}
                onChange={(e) => setRequireDigit(e.target.checked)}
                disabled={!canUpdatePolicies}
              />
              <Form.Check
                id="auth-policy-special"
                type="switch"
                label="Require symbols"
                checked={requireSpecial}
                onChange={(e) => setRequireSpecial(e.target.checked)}
                disabled={!canUpdatePolicies}
              />
            </div>

            <div className="col-6">
              <Form.Group controlId="auth-policy-max-fail">
                <Form.Label>Max failed attempts</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={maxFailedAttempts}
                  onChange={(e) => setMaxFailedAttempts(e.target.value)}
                  disabled={!canUpdatePolicies}
                />
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group controlId="auth-policy-lockout">
                <Form.Label>Lockout (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={lockoutDurationMins}
                  onChange={(e) => setLockoutDurationMins(e.target.value)}
                  disabled={!canUpdatePolicies}
                />
              </Form.Group>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card h-100">
          <div className="card-header">
            <h3 className="card-title">MFA policy</h3>
          </div>
          <div className="card-body">
            <div className="text-secondary-light mb-16">
              Control whether MFA is required and how OTP onboarding behaves.
            </div>

            <div className="row g-3">
            <div className="col-12">
              <Form.Group controlId="auth-policy-mfa">
                <Form.Label>MFA policy</Form.Label>
                <Form.Select value={mfaPolicy} onChange={(e) => setMfaPolicy(e.target.value)} disabled={!canUpdatePolicies}>
                  <option value="required">required</option>
                  <option value="optional">optional</option>
                  <option value="disabled">disabled</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-12">
              <Form.Check
                id="auth-policy-allow-otp"
                type="switch"
                label="Allow passwordless OTP"
                checked={allowPasswordlessOtp}
                onChange={(e) => setAllowPasswordlessOtp(e.target.checked)}
                disabled={!canUpdatePolicies}
              />
              <Form.Check
                id="auth-policy-auto-create"
                type="switch"
                label="Auto-create user on OTP"
                checked={autoCreateOnOtp}
                onChange={(e) => setAutoCreateOnOtp(e.target.checked)}
                disabled={!canUpdatePolicies || !allowPasswordlessOtp}
              />
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card h-100">
          <div className="card-header">
            <h3 className="card-title">Session policy</h3>
          </div>
          <div className="card-body">
            <div className="text-secondary-light mb-12">{sessionUnsupportedMessage}</div>

            <div className="row g-3">
            <div className="col-12">
              <Form.Group controlId="auth-policy-idle">
                <Form.Label>Idle timeout (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={sessionIdleMins}
                  onChange={(e) => setSessionIdleMins(e.target.value)}
                  disabled
                />
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group controlId="auth-policy-max-age">
                <Form.Label>Max session age (hours)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={sessionMaxAgeHours}
                  onChange={(e) => setSessionMaxAgeHours(e.target.value)}
                  disabled
                />
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group controlId="auth-policy-device-limit">
                <Form.Label>Device/session limit</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={sessionDeviceLimit}
                  onChange={(e) => setSessionDeviceLimit(e.target.value)}
                  disabled
                />
              </Form.Group>
            </div>
          </div>

          <div className="mt-16">
            <Button variant="outline-secondary" size="sm" disabled>
              Configure sessions
            </Button>
          </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

