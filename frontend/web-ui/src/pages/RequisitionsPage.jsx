import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";

const statusBadge = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "bg-success-50 text-success-600 border border-success-100";
  if (s === "rejected") return "bg-danger-50 text-danger-600 border border-danger-100";
  if (s === "submitted") return "bg-warning-50 text-warning-600 border border-warning-100";
  return "bg-secondary-50 text-secondary-600 border border-secondary-100";
};

const RequisitionsPage = () => {
  const { activeBranchId } = useBranch();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    const path = branchApiPath(activeBranchId, "/requisitions");
    if (!path) {
      setItems([]);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await lekuraxFetch(path);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (items ?? []).filter((r) => {
      const s = String(r.status || "").toLowerCase();
      if (status !== "all" && s !== status) return false;
      if (!query) return true;
      const blob = `${r.id} ${r.status} ${r.created_at ?? ""}`.toLowerCase();
      return blob.includes(query);
    });
  }, [items, q, status]);

  return (
    <MasterLayout>
      <Breadcrumb title='Procurement / Requisitions' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view requisitions.
          </div>
        ) : null}

        <div className='card p-24 radius-12'>
          <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
            <div>
              <h6 className='mb-1'>Requisitions</h6>
              <div className='text-secondary-light text-sm'>
                Draft → Submitted → Approved/Rejected
              </div>
            </div>
            <div className='d-flex align-items-center gap-2'>
              <Link
                to='/lekurax/requisitions/new'
                className='btn btn-sm btn-primary'
              >
                New requisition
              </Link>
              <button
                type='button'
                className='btn btn-sm btn-outline-primary'
                onClick={load}
                disabled={loading || !activeBranchId}
              >
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className='alert alert-danger py-2 mb-3'>{error}</div>
          ) : null}

          <div className='row g-2 align-items-end mb-3'>
            <div className='col-12 col-md-6'>
              <label className='form-label text-sm'>Search</label>
              <input
                className='form-control'
                value={q}
                onChange={(ev) => setQ(ev.target.value)}
                placeholder='ID, status…'
              />
            </div>
            <div className='col-12 col-md-3'>
              <label className='form-label text-sm'>Status</label>
              <select
                className='form-select'
                value={status}
                onChange={(ev) => setStatus(ev.target.value)}
              >
                <option value='all'>All</option>
                <option value='draft'>Draft</option>
                <option value='submitted'>Submitted</option>
                <option value='approved'>Approved</option>
                <option value='rejected'>Rejected</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>
            <div className='col-12 col-md-3 d-flex justify-content-md-end'>
              <div className='text-secondary-light text-sm'>
                Total:{" "}
                <span className='fw-semibold text-dark'>{filtered.length}</span>
              </div>
            </div>
          </div>

          <div className='table-responsive'>
            <table className='table table-hover mb-0 align-middle'>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Created</th>
                  <th>ID</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className={`badge ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className='text-secondary-light'>
                      {r.created_at ? String(r.created_at).replace("T", " ").slice(0, 19) : "—"}
                    </td>
                    <td>
                      <code className='text-xs'>{r.id}</code>
                    </td>
                    <td className='text-end'>
                      <Link
                        to={`/lekurax/requisitions/${r.id}`}
                        className='btn btn-sm btn-outline-primary'
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className='text-center text-muted py-4'>
                      {loading ? "Loading…" : "No requisitions found"}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default RequisitionsPage;

