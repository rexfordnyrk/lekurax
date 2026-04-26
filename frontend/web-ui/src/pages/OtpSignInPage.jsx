import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authzkit } from "../auth/authzkitClient";
import { useAuth } from "../auth/AuthContext";
import { userFacingAuthError } from "../auth/userFacingAuthError";
import {
  Module1AuthLayout,
  module1LinkClassName,
  module1LinkStyle,
  module1PrimaryButtonProps,
} from "../components/Module1AuthLayout";

const inputClass = "form-control h-56-px radius-12 border shadow-none";
const inputStyle = { borderColor: "rgba(21,128,61,0.25)", backgroundColor: "#FAFEFB" };

const OtpSignInPage = () => {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authzkit.auth.requestOtpLogin({ phone, tenant_id: tenantId });
      setOtpSent(true);
    } catch (err) {
      setError(userFacingAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authzkit.auth.verifyOtp({ phone, code, tenant_id: tenantId });
      try {
        await refreshMe();
        navigate("/");
      } catch (err) {
        if (authzkit.isAuthenticated) {
          try {
            await authzkit.auth.logout();
          } catch {
            // ignore
          }
        }
        setError(userFacingAuthError(err));
      }
    } catch (err) {
      setError(userFacingAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Module1AuthLayout
      title="Sign in with phone"
      subtitle="Enter your organisation ID and phone number. We will send a one-time code to verify you."
    >
      {error ? (
        <div
          className="alert alert-danger radius-12 mb-16 py-12 px-16 text-sm"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {!otpSent ? (
        <form onSubmit={handleRequestOtp}>
          <div className="icon-field mb-16">
            <span className="icon top-50 translate-middle-y text-secondary">
              <Icon icon="mdi:identifier" />
            </span>
            <input
              type="text"
              className={inputClass}
              style={inputStyle}
              placeholder="Tenant ID"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              autoComplete="organization"
              required
            />
          </div>
          <div className="icon-field mb-16">
            <span className="icon top-50 translate-middle-y text-secondary">
              <Icon icon="solar:phone-linear" />
            </span>
            <input
              type="tel"
              className={inputClass}
              style={inputStyle}
              placeholder="Phone (E.164)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>
          <button type="submit" {...module1PrimaryButtonProps(submitting, "mt-16")}>
            {submitting ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <div className="icon-field mb-16">
            <span className="icon top-50 translate-middle-y text-secondary">
              <Icon icon="solar:key-linear" />
            </span>
            <input
              type="text"
              className={inputClass}
              style={inputStyle}
              placeholder="One-time code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              required
            />
          </div>
          <button type="submit" {...module1PrimaryButtonProps(submitting, "mt-16")}>
            {submitting ? "Verifying…" : "Verify and sign in"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-12"
            disabled={submitting}
            onClick={() => {
              setOtpSent(false);
              setCode("");
              setError("");
            }}
          >
            Use a different number
          </button>
        </form>
      )}
      <div className="mt-32 text-center text-sm">
        <Link
          to="/sign-in"
          className={module1LinkClassName()}
          style={module1LinkStyle()}
        >
          Back to password sign in
        </Link>
      </div>
    </Module1AuthLayout>
  );
};

export default OtpSignInPage;
