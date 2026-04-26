import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminAuthPoliciesView } from "../../admin/auth-policies/AdminAuthPoliciesView";

export default function AdminAuthPoliciesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Auth policies" />
      <div className="dashboard-main-body">
        <AdminAuthPoliciesView />
      </div>
    </MasterLayout>
  );
}
