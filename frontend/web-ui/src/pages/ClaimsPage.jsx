import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";

const badgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "paid")
    return "bg-success-50 text-success-600 border border-success-100";
  if (s === "approved")
    return "bg-primary-50 text-primary-600 border border-primary-100";
  if (s === "rejected")
    return "bg-danger-50 text-danger-600 border border-danger-100";
  if (s === "submitted")
    return "bg-warning-50 text-warning-600 border border-warning-100";
  return "bg-secondary-50 text-secondary-600 border border-secondary-100";
};

const ClaimsPage = () => {
  const { activeBranchId } = useBranch();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    const path = branchApiPath(activeBranchId, "/claims");
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
      setError(e?.message ?? "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (items ?? []).filter((c) => {
      const s = String(c.status || "").toLowerCase();
      if (status !== "all" && s !== status) return false;
      if (!query) return true;
      const blob = `${c.id} ${c.status} ${c.sale_id} ${c.plan_id}`.toLowerCase();
      return blob.includes(query);
    });
  }, [items, q, status]);

  return (
    <MasterLayout>
      <Breadcrumb title='Insurance / Claims' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view claims.
          </div>
        ) : null}

        <div className='card p-24 radius-12'>
          <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
            <div>
              <h6 className='mb-1'>Claims queue</h6>
              <div className='text-secondary-light text-sm'>
                Draft → Submitted → Approved/Rejected → Paid
              </div>
            </div>
            <button
              type='button'
              className='btn btn-sm btn-outline-primary'
              onClick={load}
              disabled={loading || !activeBranchId}
            >
              Refresh
            </button>
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
                placeholder='Claim ID, sale ID, plan ID…'
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
                <option value='paid'>Paid</option>
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
                  <th>Sale</th>
                  <th className='d-none d-lg-table-cell'>Plan</th>
                  <th>ID</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`badge ${badgeClass(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <code className='text-xs'>{c.sale_id}</code>
                    </td>
                    <td className='d-none d-lg-table-cell'>
                      <code className='text-xs'>{c.plan_id}</code>
                    </td>
                    <td>
                      <code className='text-xs'>{c.id}</code>
                    </td>
                    <td className='text-end'>
                      <Link
                        to={`/lekurax/claims/${c.id}`}
                        className='btn btn-sm btn-outline-primary'
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='text-center text-muted py-4'>
                      {loading ? "Loading…" : "No claims found"}
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

export default ClaimsPage;

