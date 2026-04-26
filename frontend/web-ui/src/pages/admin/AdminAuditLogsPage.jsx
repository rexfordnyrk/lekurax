import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";

export default function AdminAuditLogsPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Audit logs" />
      <div className="dashboard-main-body">
        <div className="card p-24 radius-12">
          <h6 className="mb-0">Audit logs</h6>
          <p className="text-secondary-light mt-12 mb-0">
            Coming next: filters, export, and event detail panel.
          </p>
        </div>
      </div>
    </MasterLayout>
  );
}
