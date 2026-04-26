import React from "react";
import { Navigate } from "react-router-dom";

export default function AssignRolePage() {
  return <Navigate to="/admin/roles?tab=assign" replace />;
}
