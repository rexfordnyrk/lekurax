import { Icon } from "@iconify/react/dist/iconify.js";
import React from "react";
import { Link } from "react-router-dom";
import {
  Module1AuthLayout,
  module1LinkClassName,
  module1LinkStyle,
  module1PrimaryButtonProps,
} from "./Module1AuthLayout";

const inputClass =
  "form-control h-56-px radius-12 border shadow-none";
const inputStyle = { borderColor: "rgba(21,128,61,0.25)", backgroundColor: "#FAFEFB" };

const SignInLayer = ({
  tenantId = "",
  identifier = "",
  password = "",
  onTenantIdChange,
  onIdentifierChange,
  onPasswordChange,
  onSubmit,
  error = "",
  submitting = false,
}) => {
  return (
    <Module1AuthLayout
      title="Sign in to your account"
      subtitle="Welcome back. Enter your organisation ID and credentials to continue."
    >
      {error ? (
        <div
          className="alert alert-danger radius-12 mb-16 py-12 px-16 text-sm"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <form onSubmit={onSubmit}>
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
            onChange={(e) => onTenantIdChange?.(e.target.value)}
            autoComplete="organization"
            required
          />
        </div>
        <div className="icon-field mb-16">
          <span className="icon top-50 translate-middle-y text-secondary">
            <Icon icon="mage:email" />
          </span>
          <input
            type="text"
            className={inputClass}
            style={inputStyle}
            placeholder="Email or phone"
            value={identifier}
            onChange={(e) => onIdentifierChange?.(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="position-relative mb-20">
          <div className="icon-field">
            <span className="icon top-50 translate-middle-y text-secondary">
              <Icon icon="solar:lock-password-outline" />
            </span>
            <input
              type="password"
              className={inputClass}
              style={inputStyle}
              id="your-password"
              placeholder="Password"
              value={password}
              onChange={(e) => onPasswordChange?.(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <span
            className="toggle-password ri-eye-line cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light"
            data-toggle="#your-password"
          />
        </div>
        <div>
          <div className="d-flex justify-content-between gap-2 align-items-center flex-wrap">
            <div className="form-check style-check d-flex align-items-center">
              <input
                className="form-check-input border border-neutral-300"
                type="checkbox"
                defaultValue=""
                id="remeber"
              />
              <label className="form-check-label text-secondary" htmlFor="remeber">
                Remember me
              </label>
            </div>
            <Link
              to="/forgot-password"
              className={module1LinkClassName()}
              style={module1LinkStyle()}
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <button type="submit" {...module1PrimaryButtonProps(submitting, "mt-32")}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <div className="mt-16 text-center">
          <Link
            to="/sign-in/otp"
            className={`${module1LinkClassName()} text-sm`}
            style={module1LinkStyle()}
          >
            Sign in with phone code
          </Link>
        </div>
        <div className="mt-32 center-border-horizontal text-center">
          <span className="bg-white z-1 px-4 text-secondary text-sm">Or continue with</span>
        </div>
        <div className="mt-24 d-flex align-items-center gap-3">
          <button
            type="button"
            className="fw-semibold py-16 px-24 w-50 border radius-12 text-md d-flex align-items-center justify-content-center gap-12 line-height-1"
            style={{
              borderColor: "rgba(3,105,161,0.35)",
              color: "#0369A1",
              background: "#F0F9FF",
            }}
          >
            <Icon icon="ic:baseline-facebook" className="text-xl line-height-1" />
            Facebook
          </button>
          <button
            type="button"
            className="fw-semibold py-16 px-24 w-50 border radius-12 text-md d-flex align-items-center justify-content-center gap-12 line-height-1"
            style={{
              borderColor: "rgba(21,128,61,0.35)",
              color: "#15803D",
              background: "#F0FDF4",
            }}
          >
            <Icon icon="logos:google-icon" className="text-xl line-height-1" />
            Google
          </button>
        </div>
        <div className="mt-32 text-center text-sm">
          <p className="mb-0 text-secondary">
            Don&apos;t have an account?{" "}
            <Link
              to="/sign-up"
              className={module1LinkClassName()}
              style={module1LinkStyle()}
            >
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </Module1AuthLayout>
  );
};

export default SignInLayer;
