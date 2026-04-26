import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import { AdminAuditLogsView } from "../../admin/audit/AdminAuditLogsView";

export default function AdminAuditLogsPage() {
  return (
    <MasterLayout>
      <div className="dashboard-main-body">
        <AdminAuditLogsView />
      </div>
    </MasterLayout>
  );
}
