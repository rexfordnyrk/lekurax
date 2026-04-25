import React from "react";
import { NavLink } from "react-router-dom";

function PortalNav() {
  const linkClass = ({ isActive }) =>
    `btn btn-sm ${isActive ? "btn-primary" : "btn-outline-secondary"}`;

  return (
    <header
      className='border-bottom'
      style={{ background: "#fff", position: "sticky", top: 0, zIndex: 10 }}
    >
      <div className='container py-2 d-flex flex-wrap align-items-center justify-content-between gap-2'>
        <div className='d-flex align-items-center gap-2'>
          <span className='fw-semibold' style={{ color: "#111" }}>
            Patient Portal
          </span>
          <nav aria-label='Portal navigation' className='d-flex align-items-center gap-2'>
            <NavLink to='/portal' end className={linkClass}>
              Home
            </NavLink>
            <NavLink to='/portal/prescriptions' className={linkClass}>
              Prescriptions
            </NavLink>
          </nav>
        </div>
        <button type='button' className='btn btn-sm btn-outline-dark' disabled>
          Sign out
        </button>
      </div>
    </header>
  );
}

export default function PortalHomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <PortalNav />
      <main className='container py-4'>
        <div className='card p-24 radius-12'>
          <h1 className='h4 mb-2' style={{ color: "#111" }}>
            Welcome
          </h1>
          <p className='text-secondary-light mb-0'>
            Use this portal to review your prescriptions and request refills.
          </p>
        </div>

        <div className='row g-3 mt-1'>
          <div className='col-12 col-md-6'>
            <div className='card p-24 radius-12 h-100'>
              <div className='fw-semibold mb-1' style={{ color: "#111" }}>
                Prescriptions
              </div>
              <p className='text-secondary-light text-sm mb-3'>
                View current prescriptions and request a refill.
              </p>
              <NavLink to='/portal/prescriptions' className='btn btn-sm btn-primary align-self-start'>
                Go to prescriptions
              </NavLink>
            </div>
          </div>

          <div className='col-12 col-md-6'>
            <div className='card p-24 radius-12 h-100'>
              <div className='fw-semibold mb-1' style={{ color: "#111" }}>
                Support
              </div>
              <p className='text-secondary-light text-sm mb-0'>
                If something looks incorrect, contact your pharmacy or care team.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

