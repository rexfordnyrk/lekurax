import React from "react";
import { Navigate } from "react-router-dom";

export default function UsersListPage() {
  return <Navigate to="/admin/users" replace />;
}
