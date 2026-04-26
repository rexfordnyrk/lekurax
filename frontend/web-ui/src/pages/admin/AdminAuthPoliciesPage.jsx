import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import { AdminAuthPoliciesView } from "../../admin/auth-policies/AdminAuthPoliciesView";

export default function AdminAuthPoliciesPage() {
  return (
    <MasterLayout>
      <div className="dashboard-main-body">
        <AdminAuthPoliciesView />
      </div>
    </MasterLayout>
  );
}
