import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";
import { lekuraxFetch } from "../api/lekuraxApi";

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

function formatDate(v) {
  if (!v) return "—";
  return String(v).slice(0, 10);
}

const IncidentDetailPage = () => {
  const { id } = useParams();
  const { activeBranchId } = useBranch();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [capaAction, setCapaAction] = useState("");
  const [capaOwnerUserId, setCapaOwnerUserId] = useState("");
  const [capaDueOn, setCapaDueOn] = useState("");
  const [capaBusy, setCapaBusy] = useState(false);
  const [capaCreated, setCapaCreated] = useState(null);
  const [capaCreatedList, setCapaCreatedList] = useState([]);

  const listPath = useMemo(() => {
    const base = branchApiPath(activeBranchId, "/incidents");
    if (!base) return null;
    return `${base}?limit=200`;
  }, [activeBranchId]);

  const loadIncidentFromList = useCallback(async () => {
    if (!listPath || !id) {
      setIncident(null);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await lekuraxFetch(listPath);
      const items = data?.items ?? [];
      const found = items.find((x) => String(x.id) === String(id)) ?? null;
      setIncident(found);
      if (!found) {
        setError("Incident not found in this branch (or outside current filters).");
      }
    } catch (e) {
      setIncident(null);
      setError(e?.message ?? "Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [id, listPath]);

  useEffect(() => {
    loadIncidentFromList();
  }, [loadIncidentFromList]);

  const onCreateCAPA = async (e) => {
    e.preventDefault();
    const path = branchApiPath(activeBranchId, `/incidents/${id}/capa`);
    if (!path) return;

    const action = capaAction.trim();
    if (!action) return;

    setError("");
    setCapaCreated(null);
    setCapaBusy(true);
    try {
      const body = { action };
      const owner = capaOwnerUserId.trim();
      const dueOn = capaDueOn.trim();
      if (owner) body.owner_user_id = owner;
      if (dueOn) body.due_on = dueOn;

      const created = await lekuraxFetch(path, { method: "POST", body });
      setCapaAction("");
      setCapaOwnerUserId("");
      setCapaDueOn("");
      setCapaCreated(created ?? { action });
      setCapaCreatedList((prev) => [created ?? { action }, ...prev].slice(0, 10));
      await loadIncidentFromList();
    } catch (err) {
      setError(err?.message ?? "Create CAPA action failed");
    } finally {
      setCapaBusy(false);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Quality / Incident detail' />
      <div className='dashboard-main-body'>
        <div className='d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3'>
          <div className='d-flex flex-column'>
            <h5 className='mb-1'>Incident</h5>
            <span className='text-secondary-light text-sm'>
              <Link to='/lekurax/incidents' className='text-primary-600'>
                Back to incidents
              </Link>
              <span className='mx-2'>·</span>
              <code className='text-xs'>{id}</code>
            </span>
          </div>
          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={loadIncidentFromList}
            disabled={!activeBranchId || loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view incident details and create CAPA actions.
          </div>
        ) : null}

        {error ? <div className='alert alert-danger'>{error}</div> : null}
        {capaCreated ? (
          <div className='alert alert-success'>
            CAPA action created{capaCreated?.id ? ` (#${String(capaCreated.id).slice(0, 8)})` : ""}.
          </div>
        ) : null}

        <div className='row gy-4'>
          <div className='col-12 col-xl-7'>
            <div className='card p-24 radius-12'>
              <div className='d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3'>
                <div>
                  <h6 className='mb-1'>Summary</h6>
                  <p className='text-secondary-light text-sm mb-0'>
                    Branch-scoped incident record used for internal improvement.
                  </p>
                </div>
                <span className='badge bg-primary-50 text-primary-600 border border-primary-100'>
                  {incident ? formatStatus(incident.status) : "—"}
                </span>
              </div>

              {incident ? (
                <>
                  <div className='row g-3 mb-2'>
                    <div className='col-12 col-md-4'>
                      <div className='text-secondary-light text-xs'>Kind</div>
                      <div className='fw-semibold'>{formatKind(incident.kind)}</div>
                    </div>
                    <div className='col-12 col-md-4'>
                      <div className='text-secondary-light text-xs'>Severity</div>
                      <div className='fw-semibold'>{formatSeverity(incident.severity)}</div>
                    </div>
                    <div className='col-12 col-md-4'>
                      <div className='text-secondary-light text-xs'>Reported</div>
                      <div className='fw-semibold'>{formatDateTime(incident.created_at)}</div>
                    </div>
                  </div>
                  <hr />
                  <div>
                    <div className='text-secondary-light text-xs mb-1'>Description</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{incident.description}</div>
                  </div>
                </>
              ) : (
                <p className='text-secondary-light text-sm mb-0'>
                  {loading ? "Loading incident…" : "No incident loaded."}
                </p>
              )}
            </div>
          </div>

          <div className='col-12 col-xl-5'>
            <div className='card p-24 radius-12 mb-4'>
              <h6 className='mb-2'>Create CAPA action</h6>
              <p className='text-secondary-light text-sm mb-3'>
                Use specific, measurable actions. Assign an owner user ID if available and set a due date.
              </p>
              <form onSubmit={onCreateCAPA}>
                <label className='form-label'>Action</label>
                <textarea
                  className='form-control mb-2'
                  rows={4}
                  value={capaAction}
                  onChange={(ev) => setCapaAction(ev.target.value)}
                  disabled={!activeBranchId || capaBusy}
                  placeholder='e.g., Update SOP, retrain staff, add double-check step...'
                  required
                />
                <label className='form-label'>Owner user ID (optional)</label>
                <input
                  className='form-control mb-2'
                  value={capaOwnerUserId}
                  onChange={(ev) => setCapaOwnerUserId(ev.target.value)}
                  disabled={!activeBranchId || capaBusy}
                  placeholder='uuid'
                />
                <label className='form-label'>Due on (optional)</label>
                <input
                  className='form-control mb-3'
                  type='date'
                  value={capaDueOn}
                  onChange={(ev) => setCapaDueOn(ev.target.value)}
                  disabled={!activeBranchId || capaBusy}
                />
                <button
                  type='submit'
                  className='btn btn-primary w-100'
                  disabled={!activeBranchId || capaBusy || !capaAction.trim()}
                >
                  {capaBusy ? "Creating…" : "Create CAPA action"}
                </button>
              </form>
            </div>

            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>CAPA actions (this session)</h6>
              <p className='text-secondary-light text-sm mb-3'>
                The backend does not provide a CAPA list endpoint yet, so this view shows actions created in this session.
              </p>
              {!capaCreatedList.length ? (
                <p className='text-secondary-light text-sm mb-0'>No CAPA actions created yet.</p>
              ) : (
                <ul className='list-group'>
                  {capaCreatedList.map((a, idx) => (
                    <li key={a?.id ?? `${idx}`} className='list-group-item'>
                      <div className='d-flex justify-content-between align-items-start gap-2'>
                        <div style={{ whiteSpace: "pre-wrap" }}>{a?.action ?? "—"}</div>
                        <span className='badge bg-neutral-100 text-secondary-light border border-neutral-200'>
                          {a?.status ? String(a.status) : "open"}
                        </span>
                      </div>
                      <div className='text-secondary-light text-xs mt-2'>
                        <span className='me-3'>
                          Due: <span className='fw-semibold'>{formatDate(a?.due_on)}</span>
                        </span>
                        <span>
                          Owner:{" "}
                          <span className='fw-semibold'>
                            {a?.owner_user_id ? String(a.owner_user_id) : "—"}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default IncidentDetailPage;

