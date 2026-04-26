import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import { AdminUsersView } from "../../admin/users/AdminUsersView";

export default function AdminUsersPage() {
  return (
    <MasterLayout>
      <div className="dashboard-main-body">
        <AdminUsersView />
      </div>
    </MasterLayout>
  );
}
