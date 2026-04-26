import { Icon } from "@iconify/react/dist/iconify.js";
import React from "react";
import { Link } from "react-router-dom";
import {
  Module1AuthLayout,
  module1LinkClassName,
  module1LinkStyle,
  module1PrimaryButtonProps,
} from "./Module1AuthLayout";

const inputClass = "form-control h-56-px radius-12 border shadow-none";
const inputStyle = { borderColor: "rgba(21,128,61,0.25)", backgroundColor: "#FAFEFB" };

const ForgotPasswordLayer = ({
  tenantId = "",
  identifier = "",
  onTenantIdChange,
  onIdentifierChange,
  onSubmit,
  error = "",
  submitting = false,
  sent = false,
}) => {
  return (
    <Module1AuthLayout
      title="Forgot password"
      subtitle="Enter your organisation ID and the email or phone on your account. We will send reset instructions when available."
      leftImageSrc="assets/images/auth/forgot-pass-img.png"
    >
      {error ? (
        <div
          className="alert alert-danger radius-12 mb-16 py-12 px-16 text-sm"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {sent ? (
        <div className="text-center">
          <div className="mb-32">
            <img src="assets/images/auth/envelop-icon.png" alt="" />
          </div>
          <h6 className="mb-12 fw-semibold">Check your email or SMS</h6>
          <p className="text-secondary text-sm mb-0">
            If an account matches what you entered, you will receive instructions to reset your
            password shortly.
          </p>
          <div className="text-center">
            <Link
              to="/sign-in"
              className={`${module1LinkClassName()} fw-semibold mt-24 d-inline-block`}
              style={module1LinkStyle()}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
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
          <div className="icon-field">
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
          <button type="submit" {...module1PrimaryButtonProps(submitting, "mt-32")}>
            {submitting ? "Sending…" : "Continue"}
          </button>
          <div className="text-center">
            <Link
              to="/sign-in"
              className={`${module1LinkClassName()} fw-semibold mt-24 d-inline-block`}
              style={module1LinkStyle()}
            >
              Back to sign in
            </Link>
          </div>
          <div className="mt-120 text-center text-sm">
            <p className="mb-0 text-secondary">
              Already have an account?{" "}
              <Link
                to="/sign-in"
                className={module1LinkClassName()}
                style={module1LinkStyle()}
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      )}
    </Module1AuthLayout>
  );
};

export default ForgotPasswordLayer;
