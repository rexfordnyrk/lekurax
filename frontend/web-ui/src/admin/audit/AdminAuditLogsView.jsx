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
    <div className="card p-24 radius-12">
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-16">
        <div>
          <h6 className="mb-0">Audit logs</h6>
          <div className="text-secondary-light mt-8">
            Filter security and operational events, then export for review.
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={load}
            disabled={loading}
          >
            <Icon icon="solar:refresh-linear" className="icon text-md me-1" />
            Refresh
          </button>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              disabled={!filtered.length}
            >
              Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button type="button" className="dropdown-item" onClick={exportJson}>
                  Export JSON
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item" onClick={exportCsv}>
                  Export CSV
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {loading ? <div className="text-secondary-light">Loading…</div> : null}

      <div className="row g-3 align-items-end mb-16">
        <div className="col-lg-4">
          <label className="form-label mb-8">Search</label>
          <input
            className="form-control"
            placeholder="Action, actor, resource, IP…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="col-lg-2">
          <label className="form-label mb-8">Action</label>
          <Form.Control
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. user.login"
          />
        </div>
        <div className="col-lg-2">
          <label className="form-label mb-8">Category</label>
          <Form.Control
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            placeholder="e.g. user"
          />
        </div>
        <div className="col-lg-2">
          <label className="form-label mb-8">From</label>
          <input
            type="datetime-local"
            className="form-control"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="col-lg-2">
          <label className="form-label mb-8">To</label>
          <input
            type="datetime-local"
            className="form-control"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive scroll-sm">
        <table className="table table-hover mb-0">
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
            {!loading
              ? filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="text-secondary-light">{formatWhen(e.created_at)}</td>
                    <td className="text-secondary-light">{e.actor_id ?? "—"}</td>
                    <td>{e.action}</td>
                    <td className="text-secondary-light">{e.resource_type ?? "—"}</td>
                    <td className="text-secondary-light">{e.ip_address ?? "—"}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
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
                <td colSpan={6} className="text-center text-secondary-light py-24">
                  No audit entries found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal show={detailsOpen} onHide={() => setDetailsOpen(false)} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Audit event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!active ? (
            <div className="text-secondary-light">No event selected.</div>
          ) : (
            <>
              <div className="d-flex flex-wrap gap-2 mb-12">
                <span className="badge bg-light text-dark border">{active.action}</span>
                <span className="badge bg-light text-dark border">
                  {active.resource_type}:{active.resource_id}
                </span>
                <span className="badge bg-light text-dark border">{active.actor_id}</span>
              </div>
              <pre className="bg-light border rounded-3 p-12 mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(active, null, 2)}
              </pre>
            </>
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

