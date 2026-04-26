import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminRolesView } from "../../admin/roles/AdminRolesView";

export default function AdminRolesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Roles" />
      <div className="dashboard-main-body">
        <AdminRolesView />
      </div>
    </MasterLayout>
  );
}
