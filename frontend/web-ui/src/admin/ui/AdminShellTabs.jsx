import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./adminShell.css";

const TABS = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/roles", label: "Roles & Permissions" },
  { to: "/admin/audit", label: "Audit Logs" },
  { to: "/admin/auth-policies", label: "Auth Policies" },
];

export function AdminShellTabs() {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/admin")) return null;

  return (
    <div className="admin-shell-tabs">
      <div className="admin-shell-tabs-inner">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `admin-shell-tab ${isActive ? "active" : ""}`
            }
            aria-current={pathname === t.to ? "page" : undefined}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

