import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAdminShell } from "./AdminShellContext";
import "./adminShell.css";

export function AdminShellHeader({ breadcrumb = [], title, actions: actionsProp = null }) {
  const { headerActions } = useAdminShell();
  const actions = headerActions ?? actionsProp;

  return (
    <div className="admin-shell-header">
      <div className="admin-shell-header-inner">
        <div className="admin-shell-title">
          <div className="admin-shell-breadcrumb">
            {breadcrumb.map((b, idx) => {
              const isLast = idx === breadcrumb.length - 1;
              return (
                <React.Fragment key={`${b.label}-${idx}`}>
                  {idx > 0 ? (
                    <Icon
                      icon="ri:arrow-right-s-line"
                      className="admin-shell-breadcrumb-sep"
                    />
                  ) : null}
                  {b.to && !isLast ? (
                    <Link to={b.to} className="admin-shell-breadcrumb-link">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="admin-shell-breadcrumb-current">
                      {b.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="admin-shell-h1" role="heading" aria-level={1}>
            {title}
          </div>
        </div>

        <div className="admin-shell-actions">{actions}</div>
      </div>
    </div>
  );
}

