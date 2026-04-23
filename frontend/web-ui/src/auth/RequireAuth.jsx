import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { bootstrapping, isAuthenticated } = useAuth();

  if (bootstrapping) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
}
