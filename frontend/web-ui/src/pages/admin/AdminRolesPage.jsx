import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";

export default function AdminRolesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Roles" />
      <div className="dashboard-main-body">
        <div className="card p-24 radius-12">
          <h6 className="mb-0">Roles &amp; Permissions</h6>
          <p className="text-secondary-light mt-12 mb-0">
            Coming next: roles table, permission editor, and assignment workflows.
          </p>
        </div>
      </div>
    </MasterLayout>
  );
}
