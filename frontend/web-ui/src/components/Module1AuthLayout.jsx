import { Icon } from "@iconify/react/dist/iconify.js";
import React from "react";
import { Link } from "react-router-dom";

/** Module 1 spec: pharmacy green, trust blue, soft mint background */
const COLORS = {
  bg: "#F0FDF4",
  panel: "linear-gradient(145deg, #15803D 0%, #0d9488 55%, #0369A1 100%)",
  accent: "#0369A1",
  primary: "#15803D",
};

export function Module1AuthLayout({
  title,
  subtitle,
  children,
  leftImageSrc = "assets/images/auth/auth-img.png",
  showLogo = true,
}) {
  return (
    <section
      className="d-flex flex-wrap min-vh-100"
      style={{
        background: COLORS.bg,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div
        className="d-none d-lg-flex col-lg-5 align-items-stretch justify-content-center p-0 position-relative overflow-hidden"
        style={{ background: COLORS.panel }}
      >
        <div
          className="position-absolute w-100 h-100 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 45%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.2) 0, transparent 40%)",
          }}
        />
        <div className="d-flex align-items-center justify-content-center p-40 position-relative" style={{ zIndex: 1 }}>
          {leftImageSrc ? (
            <img src={leftImageSrc} alt="" className="img-fluid" style={{ maxWidth: 420 }} />
          ) : null}
        </div>
      </div>

      <div className="col-12 col-lg-7 py-40 px-24 d-flex align-items-center justify-content-center">
        <div className="w-100" style={{ maxWidth: 464 }}>
          <div
            className="card border-0 shadow-sm p-32 radius-12 bg-white"
            style={{ borderRadius: 12, border: "1px solid rgba(21,128,61,0.12)" }}
          >
            {showLogo ? (
              <Link to="/" className="d-inline-flex align-items-center gap-2 mb-24 text-decoration-none">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-2 text-white fw-bold"
                  style={{
                    width: 40,
                    height: 40,
                    background: COLORS.primary,
                    fontSize: 14,
                  }}
                >
                  P
                </span>
                <span className="fw-semibold text-dark">Pharmaco</span>
              </Link>
            ) : null}

            <h4 className="mb-12 fw-semibold text-dark">{title}</h4>
            {subtitle ? (
              <p className="mb-32 text-secondary" style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
                {subtitle}
              </p>
            ) : null}

            {children}
          </div>

          <p className="text-center text-secondary mt-24 mb-0" style={{ fontSize: 12 }}>
            <Icon icon="solar:shield-check-linear" className="me-1 align-text-bottom" />
            Secure sign-in powered by your organisation&apos;s Authz tenant.
          </p>
        </div>
      </div>
    </section>
  );
}

export function module1PrimaryButtonProps(disabled, extraClassName = "") {
  return {
    className: `btn w-100 fw-semibold text-white radius-12 py-16 border-0 ${extraClassName}`.trim(),
    style: {
      backgroundColor: COLORS.primary,
      opacity: disabled ? 0.65 : 1,
      borderRadius: 12,
    },
    disabled,
  };
}

export function module1LinkClassName() {
  return "fw-medium text-decoration-none";
}

export function module1LinkStyle() {
  return { color: COLORS.accent };
}
