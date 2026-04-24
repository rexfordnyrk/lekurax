import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";
import { lekuraxFetch } from "../api/lekuraxApi";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "closed", label: "Closed" },
];

const KIND_OPTIONS = [
  { value: "", label: "Any kind" },
  { value: "med_error", label: "Medication error" },
  { value: "adverse_event", label: "Adverse event" },
  { value: "security", label: "Security" },
  { value: "general", label: "General" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "Any severity" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function formatKind(kind) {
  switch (String(kind)) {
    case "med_error":
      return "Medication error";
    case "adverse_event":
      return "Adverse event";
    case "security":
      return "Security";
    case "general":
      return "General";
    default:
      return kind ? String(kind) : "—";
  }
}

function formatSeverity(sev) {
  const v = String(sev || "");
  if (!v) return "—";
  return v[0].toUpperCase() + v.slice(1);
}

function formatStatus(status) {
  switch (String(status)) {
    case "open":
      return "Open";
    case "investigating":
      return "Investigating";
    case "closed":
      return "Closed";
    default:
      return status ? String(status) : "—";
  }
}

function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

const IncidentsPage = () => {
  const { activeBranchId } = useBranch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterKind, setFilterKind] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [limit, setLimit] = useState(50);

  const [newKind, setNewKind] = useState("general");
  const [newSeverity, setNewSeverity] = useState("low");
  const [newDescription, setNewDescription] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createdId, setCreatedId] = useState("");

  const listPath = useMemo(() => {
    const base = branchApiPath(activeBranchId, "/incidents");
    if (!base) return null;
    const sp = new URLSearchParams();
    if (filterStatus) sp.set("status", filterStatus);
    if (filterKind) sp.set("kind", filterKind);
    if (filterSeverity) sp.set("severity", filterSeverity);
    if (limit) sp.set("limit", String(limit));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [activeBranchId, filterKind, filterSeverity, filterStatus, limit]);

  const load = useCallback(async () => {
    if (!listPath) {
      setItems([]);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await lekuraxFetch(listPath);
      setItems(data?.items ?? []);
    } catch (e) {
      setItems([]);
      setError(e?.message ?? "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [listPath]);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    const path = branchApiPath(activeBranchId, "/incidents");
    if (!path) return;
    const desc = newDescription.trim();
    if (!desc) return;

    setError("");
    setCreatedId("");
    setCreateBusy(true);
    try {
      const created = await lekuraxFetch(path, {
        method: "POST",
        body: {
          kind: newKind,
          severity: newSeverity,
          description: desc,
        },
      });
      setNewDescription("");
      if (created?.id) {
        setCreatedId(String(created.id));
      }
      await load();
    } catch (err) {
      setError(err?.message ?? "Create incident failed");
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Quality / Incidents' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view and report incidents.
          </div>
        ) : null}

        {error ? <div className='alert alert-danger'>{error}</div> : null}
        {createdId ? (
          <div className='alert alert-success'>
            Incident created.{" "}
            <Link to={`/lekurax/incidents/${createdId}`}>Open details</Link>
          </div>
        ) : null}

        <div className='row gy-4'>
          <div className='col-12 col-xl-4'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Report an incident</h6>
              <p className='text-secondary-light text-sm mb-3'>
                Keep details factual and privacy-preserving. Avoid patient names
                or identifiers unless your policy explicitly requires them.
              </p>
              <form onSubmit={onCreate}>
                <label className='form-label'>Kind</label>
                <select
                  className='form-select mb-2'
                  value={newKind}
                  onChange={(ev) => setNewKind(ev.target.value)}
                  disabled={!activeBranchId || createBusy}
                  required
                >
                  {KIND_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <label className='form-label'>Severity</label>
                <select
                  className='form-select mb-2'
                  value={newSeverity}
                  onChange={(ev) => setNewSeverity(ev.target.value)}
                  disabled={!activeBranchId || createBusy}
                  required
                >
                  {SEVERITY_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <label className='form-label'>Description</label>
                <textarea
                  className='form-control mb-3'
                  rows={5}
                  value={newDescription}
                  onChange={(ev) => setNewDescription(ev.target.value)}
                  disabled={!activeBranchId || createBusy}
                  placeholder='What happened, what was affected, and what you observed...'
                  required
                />

                <button
                  type='submit'
                  className='btn btn-primary w-100'
                  disabled={!activeBranchId || createBusy || !newDescription.trim()}
                >
                  {createBusy ? "Submitting…" : "Submit incident"}
                </button>
              </form>
            </div>
          </div>

          <div className='col-12 col-xl-8'>
            <div className='card p-24 radius-12 mb-4'>
              <div className='d-flex flex-wrap justify-content-between align-items-center gap-2'>
                <div>
                  <h6 className='mb-1'>Incidents</h6>
                  <p className='text-secondary-light text-sm mb-0'>
                    Filter by status, kind, severity and adjust result size.
                  </p>
                </div>
                <button
                  type='button'
                  className='btn btn-sm btn-outline-secondary'
                  onClick={load}
                  disabled={!activeBranchId || loading}
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>

              <div className='row g-3 mt-3'>
                <div className='col-12 col-md-3'>
                  <label className='form-label'>Status</label>
                  <select
                    className='form-select form-select-sm'
                    value={filterStatus}
                    onChange={(ev) => setFilterStatus(ev.target.value)}
                    disabled={!activeBranchId}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='col-12 col-md-3'>
                  <label className='form-label'>Kind</label>
                  <select
                    className='form-select form-select-sm'
                    value={filterKind}
                    onChange={(ev) => setFilterKind(ev.target.value)}
                    disabled={!activeBranchId}
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='col-12 col-md-3'>
                  <label className='form-label'>Severity</label>
                  <select
                    className='form-select form-select-sm'
                    value={filterSeverity}
                    onChange={(ev) => setFilterSeverity(ev.target.value)}
                    disabled={!activeBranchId}
                  >
                    {SEVERITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='col-12 col-md-3'>
                  <label className='form-label'>Limit</label>
                  <input
                    className='form-control form-control-sm'
                    type='number'
                    min={1}
                    max={200}
                    value={limit}
                    onChange={(ev) => {
                      const n = Number(ev.target.value);
                      setLimit(Number.isFinite(n) ? n : 50);
                    }}
                    disabled={!activeBranchId}
                  />
                </div>
              </div>
            </div>

            <div className='card p-24 radius-12'>
              <div className='table-responsive'>
                <table className='table table-hover align-middle mb-0'>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Kind</th>
                      <th>Severity</th>
                      <th>Description</th>
                      <th>Reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td>{formatStatus(it.status)}</td>
                        <td>{formatKind(it.kind)}</td>
                        <td>{formatSeverity(it.severity)}</td>
                        <td style={{ maxWidth: "34rem" }}>
                          <div className='d-flex flex-column'>
                            <Link
                              to={`/lekurax/incidents/${it.id}`}
                              className='fw-semibold text-primary-600'
                            >
                              {String(it.description || "").slice(0, 90) ||
                                "View incident"}
                              {String(it.description || "").length > 90 ? "…" : ""}
                            </Link>
                            <span className='text-secondary-light text-xs'>
                              <code className='text-xs'>{it.id}</code>
                            </span>
                          </div>
                        </td>
                        <td>{formatDateTime(it.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!items.length && activeBranchId && !loading ? (
                <p className='text-secondary-light text-sm mb-0 mt-3'>
                  No incidents match these filters.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default IncidentsPage;

