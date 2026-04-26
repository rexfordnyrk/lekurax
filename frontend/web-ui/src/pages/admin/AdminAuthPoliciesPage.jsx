import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";

export default function AdminAuthPoliciesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Auth policies" />
      <div className="dashboard-main-body">
        <div className="card p-24 radius-12">
          <h6 className="mb-0">Auth policies</h6>
          <p className="text-secondary-light mt-12 mb-0">
            Coming next: password, MFA, and session policy cards with a single save flow.
          </p>
        </div>
      </div>
    </MasterLayout>
  );
}
