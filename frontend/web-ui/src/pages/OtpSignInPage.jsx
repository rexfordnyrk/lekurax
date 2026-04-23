import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authzkit } from "../auth/authzkitClient";
import { useAuth } from "../auth/AuthContext";
import { userFacingAuthError } from "../auth/userFacingAuthError";

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
      await refreshMe();
      navigate("/");
    } catch (err) {
      setError(userFacingAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className='auth bg-base d-flex flex-wrap'>
      <div className='auth-left d-lg-block d-none'>
        <div className='d-flex align-items-center flex-column h-100 justify-content-center'>
          <img src='assets/images/auth/auth-img.png' alt='' />
        </div>
      </div>
      <div className='auth-right py-32 px-24 d-flex flex-column justify-content-center'>
        <div className='max-w-464-px mx-auto w-100'>
          <div>
            <Link to='/' className='mb-40 max-w-290-px'>
              <img src='assets/images/logo.png' alt='' />
            </Link>
            <h4 className='mb-12'>Sign in with phone</h4>
            <p className='mb-32 text-secondary-light text-lg'>
              Enter your tenant and phone number. We will send you a one-time code.
            </p>
          </div>
          {error ? (
            <div
              className='alert alert-danger radius-12 mb-16 py-12 px-16 text-sm'
              role='alert'
            >
              {error}
            </div>
          ) : null}
          {!otpSent ? (
            <form onSubmit={handleRequestOtp}>
              <div className='icon-field mb-16'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='mdi:identifier' />
                </span>
                <input
                  type='text'
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='Tenant ID'
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  autoComplete='organization'
                  required
                />
              </div>
              <div className='icon-field mb-16'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='solar:phone-linear' />
                </span>
                <input
                  type='tel'
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='Phone (E.164)'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete='tel'
                  required
                />
              </div>
              <button
                type='submit'
                className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-16'
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className='icon-field mb-16'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='solar:key-linear' />
                </span>
                <input
                  type='text'
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='One-time code'
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete='one-time-code'
                  required
                />
              </div>
              <button
                type='submit'
                className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-16'
                disabled={submitting}
              >
                {submitting ? "Verifying…" : "Verify and sign in"}
              </button>
              <button
                type='button'
                className='btn btn-outline-secondary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-12'
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
          <div className='mt-32 text-center text-sm'>
            <Link to='/sign-in' className='text-primary-600 fw-semibold'>
              Back to password sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OtpSignInPage;
