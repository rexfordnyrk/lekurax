import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import { AdminRolesView } from "../../admin/roles/AdminRolesView";

export default function AdminRolesPage() {
  return (
    <MasterLayout>
      <div className="dashboard-main-body">
        <AdminRolesView />
      </div>
    </MasterLayout>
  );
}
