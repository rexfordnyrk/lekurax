import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import { AuthzKitApiError } from "@authzkit/client";
import { authzkit } from "../../auth/authzkitClient";

function errorMessage(error) {
  if (error instanceof AuthzKitApiError) return `${error.message} (${error.code})`;
  return error?.message ?? "Failed to load audit logs";
}

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function toIsoOrEmpty(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsvRow(cells) {
  return (
    cells
      .map((c) => {
        const s = c == null ? "" : String(c);
        const escaped = s.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",") + "\n"
  );
}

export function AdminAuditLogsView() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await authzkit.auditLogs.list({
        page: 1,
        page_size: 200,
        ...(action ? { action } : {}),
        ...(resourceType ? { resource_type: resourceType } : {}),
        ...(from ? { from: toIsoOrEmpty(from) } : {}),
        ...(to ? { to: toIsoOrEmpty(to) } : {}),
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setItems([]);
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [action, from, resourceType, to]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((e) => {
      const hay = `${e?.action ?? ""} ${e?.actor_id ?? ""} ${e?.resource_type ?? ""} ${e?.resource_id ?? ""} ${e?.ip_address ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [items, q]);

  const exportJson = () => {
    downloadText(
      `audit-logs-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(filtered, null, 2),
      "application/json"
    );
  };

  const exportCsv = () => {
    let out = "";
    out += toCsvRow([
      "timestamp",
      "action",
      "actor_id",
      "resource_type",
      "resource_id",
      "ip_address",
    ]);
    for (const e of filtered) {
      out += toCsvRow([
        e.created_at,
        e.action,
        e.actor_id,
        e.resource_type,
        e.resource_id,
        e.ip_address ?? "",
      ]);
    }
    downloadText(
      `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      out,
      "text/csv"
    );
  };

  const openDetails = (e) => {
    setActive(e);
    setDetailsOpen(true);
  };

  return (
    <div className="content-area">
      <div className="filters-bar">
        <div className="search-input">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <input
          className="filter-select"
          placeholder="Action (e.g. user.login)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <input
          className="filter-select"
          placeholder="Category (e.g. user)"
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
        />
        <input
          type="datetime-local"
          className="filter-select"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="datetime-local"
          className="filter-select"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Audit logs</h3>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={load}
              disabled={loading}
            >
              <Icon icon="solar:refresh-linear" className="icon text-md" />
              Refresh
            </button>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-secondary btn-sm dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                disabled={!filtered.length}
              >
                <i className="ri-download-line" />
                Export
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={exportJson}
                  >
                    Export JSON
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={exportCsv}
                  >
                    Export CSV
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {error ? (
          <div className="card-body">
            <Alert variant="danger" className="mb-0">
              {error}
            </Alert>
          </div>
        ) : null}

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="m1-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>IP</th>
                  <th className="text-end">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, color: "rgba(15,23,42,0.6)" }}>
                      Loading…
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((e) => (
                      <tr key={e.id}>
                        <td>{formatWhen(e.created_at)}</td>
                        <td>{e.actor_id ?? "—"}</td>
                        <td>{e.action}</td>
                        <td>{e.resource_type ?? "—"}</td>
                        <td>{e.ip_address ?? "—"}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openDetails(e)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "rgba(15,23,42,0.6)" }}>
                      No audit entries found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        show={detailsOpen}
        onHide={() => setDetailsOpen(false)}
        centered
        size="lg"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Audit event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!active ? (
            <div className="text-secondary-light">No event selected.</div>
          ) : (
            <pre
              className="bg-light border rounded-3 p-12 mb-0"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {JSON.stringify(active, null, 2)}
            </pre>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

