import { Icon } from "@iconify/react/dist/iconify.js";
import React from "react";
import { Link } from "react-router-dom";

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
    <section className='auth forgot-password-page bg-base d-flex flex-wrap'>
      <div className='auth-left d-lg-block d-none'>
        <div className='d-flex align-items-center flex-column h-100 justify-content-center'>
          <img src='assets/images/auth/forgot-pass-img.png' alt='' />
        </div>
      </div>
      <div className='auth-right py-32 px-24 d-flex flex-column justify-content-center'>
        <div className='max-w-464-px mx-auto w-100'>
          <div>
            <h4 className='mb-12'>Forgot Password</h4>
            <p className='mb-32 text-secondary-light text-lg'>
              Enter your tenant and the email or phone associated with your account. We will send
              reset instructions by email or SMS when available.
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
          {sent ? (
            <div className='text-center'>
              <div className='mb-32'>
                <img src='assets/images/auth/envelop-icon.png' alt='' />
              </div>
              <h6 className='mb-12'>Check your email or SMS</h6>
              <p className='text-secondary-light text-sm mb-0'>
                If an account matches what you entered, you will receive instructions to reset your
                password shortly.
              </p>
              <div className='text-center'>
                <Link to='/sign-in' className='text-primary-600 fw-bold mt-24 d-inline-block'>
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className='icon-field mb-16'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='mdi:identifier' />
                </span>
                <input
                  type='text'
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='Tenant ID'
                  value={tenantId}
                  onChange={(e) => onTenantIdChange?.(e.target.value)}
                  autoComplete='organization'
                  required
                />
              </div>
              <div className='icon-field'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='mage:email' />
                </span>
                <input
                  type='text'
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='Email or phone'
                  value={identifier}
                  onChange={(e) => onIdentifierChange?.(e.target.value)}
                  autoComplete='username'
                  required
                />
              </div>
              <button
                type='submit'
                className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32'
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Continue"}
              </button>
              <div className='text-center'>
                <Link to='/sign-in' className='text-primary-600 fw-bold mt-24 d-inline-block'>
                  Back to Sign In
                </Link>
              </div>
              <div className='mt-120 text-center text-sm'>
                <p className='mb-0'>
                  Already have an account?{" "}
                  <Link to='/sign-in' className='text-primary-600 fw-semibold'>
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ForgotPasswordLayer;
