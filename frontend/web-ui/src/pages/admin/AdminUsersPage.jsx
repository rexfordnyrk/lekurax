import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminUsersView } from "../../admin/users/AdminUsersView";

export default function AdminUsersPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Users" />
      <div className="dashboard-main-body">
        <AdminUsersView />
      </div>
    </MasterLayout>
  );
}
