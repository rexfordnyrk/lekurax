import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminAuditLogsView } from "../../admin/audit/AdminAuditLogsView";

export default function AdminAuditLogsPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Audit logs" />
      <div className="dashboard-main-body">
        <AdminAuditLogsView />
      </div>
    </MasterLayout>
  );
}
