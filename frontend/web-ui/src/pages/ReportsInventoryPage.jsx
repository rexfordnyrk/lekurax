import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";

function numberLabel(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return v.toLocaleString();
}

function clampDays(n) {
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(365, Math.trunc(n)));
}

function safeText(v) {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s ? s : "—";
}

function expiryUrgencyBadge(daysUntilExpiry) {
  const d = Number(daysUntilExpiry);
  if (!Number.isFinite(d)) {
    return { label: "Unknown", className: "badge text-bg-secondary" };
  }
  if (d <= 0) return { label: "Expired", className: "badge text-bg-danger" };
  if (d <= 7) return { label: `${d}d`, className: "badge text-bg-danger" };
  if (d <= 30) return { label: `${d}d`, className: "badge text-bg-warning" };
  return { label: `${d}d`, className: "badge text-bg-success" };
}

const ReportsInventoryPage = () => {
  const { activeBranchId } = useBranch();

  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const abortRef = useRef(null);
  const requestSeqRef = useRef(0);

  const daysNum = useMemo(() => clampDays(Number(days)), [days]);
  const validation = useMemo(() => {
    const raw = Number(days);
    if (!Number.isFinite(raw)) {
      return { ok: false, message: "Enter a number of days between 1 and 365." };
    }
    if (raw < 1 || raw > 365) {
      return { ok: false, message: "Days must be between 1 and 365." };
    }
    return { ok: true, message: "" };
  }, [days]);

  const queryPath = useMemo(() => {
    return `/reports/inventory/near-expiry?days=${encodeURIComponent(daysNum)}`;
  }, [daysNum]);

  const load = useCallback(async () => {
    if (!validation.ok) {
      requestSeqRef.current += 1;
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
      setError("");
      setData(null);
      return;
    }

    const path = branchApiPath(activeBranchId, queryPath);
    if (!path) {
      requestSeqRef.current += 1;
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = null;
      setData(null);
      setError("");
      setLoading(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ac = new AbortController();
    abortRef.current = ac;
    const requestSeq = (requestSeqRef.current += 1);

    setLoading(true);
    setError("");
    try {
      const res = await lekuraxFetch(path, { signal: ac.signal });
      if (requestSeqRef.current !== requestSeq || abortRef.current !== ac) return;
      setData(res ?? null);
    } catch (e) {
      if (e?.name === "AbortError") {
        return;
      }
      if (requestSeqRef.current !== requestSeq || abortRef.current !== ac) return;
      setData(null);
      setError(e?.message ?? "Failed to load inventory report");
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        if (requestSeqRef.current !== requestSeq) return;
        setLoading(false);
      }
    }
  }, [activeBranchId, queryPath, validation.ok]);

  useEffect(() => {
    if (!activeBranchId) return;
    if (!validation.ok) return;
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const daysInputId = "reports-inventory-days";
  const daysErrorId = "reports-inventory-days-error";
  const statusId = "reports-inventory-status";

  const items = data?.items ?? [];
  const summary = data?.summary ?? null;

  const totalItems = summary?.items ?? items?.length ?? null;
  const totalQty = summary?.total_quantity ?? null;

  const soonest = useMemo(() => {
    if (!Array.isArray(items) || !items.length) return null;
    let best = null;
    for (const it of items) {
      const d = Number(it?.days_until_expiry);
      if (!Number.isFinite(d)) continue;
      if (best === null || d < best) best = d;
    }
    return best;
  }, [items]);

  return (
    <MasterLayout>
      <Breadcrumb title='Reports / Inventory' />

      {!activeBranchId ? (
        <div className='alert alert-warning'>
          Select an active branch (header) to view reports for that branch.
        </div>
      ) : null}

      <div className='row gy-4'>
        <div className='col-12'>
          <div className='card p-24 radius-12' aria-busy={loading ? "true" : "false"}>
            <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
              <div className='d-flex flex-wrap align-items-end gap-3'>
                <div style={{ minWidth: 220 }}>
                  <label
                    className='form-label text-sm mb-1 text-secondary-light'
                    htmlFor={daysInputId}
                  >
                    Near-expiry window (days)
                  </label>
                  <input
                    id={daysInputId}
                    type='number'
                    inputMode='numeric'
                    className='form-control form-control-sm'
                    min={1}
                    max={365}
                    step={1}
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    disabled={!activeBranchId}
                    aria-invalid={!validation.ok ? "true" : "false"}
                    aria-describedby={!validation.ok ? daysErrorId : undefined}
                  />
                </div>
                <div className='d-flex flex-wrap gap-2'>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary'
                    onClick={() => setDays("30")}
                    disabled={!activeBranchId || loading}
                  >
                    30d
                  </button>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary'
                    onClick={() => setDays("60")}
                    disabled={!activeBranchId || loading}
                  >
                    60d
                  </button>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary'
                    onClick={() => setDays("90")}
                    disabled={!activeBranchId || loading}
                  >
                    90d
                  </button>
                </div>
              </div>

              <div className='d-flex align-items-center gap-2'>
                <span
                  id={statusId}
                  className='text-sm text-secondary-light'
                  role='status'
                  aria-live='polite'
                >
                  {loading ? "Loading…" : ""}
                </span>
                <button
                  type='button'
                  className='btn btn-sm btn-primary'
                  onClick={() => load()}
                  disabled={!activeBranchId || loading || !validation.ok}
                >
                  Refresh
                </button>
              </div>
            </div>

            {!validation.ok && activeBranchId ? (
              <div
                id={daysErrorId}
                className='text-danger text-sm mt-2'
                role='alert'
                aria-live='polite'
              >
                {validation.message}
              </div>
            ) : null}

            {error ? (
              <div className='alert alert-danger mt-3 mb-0' role='alert' aria-live='polite'>
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className='col-12'>
          <div className='row g-3'>
            <div className='col-6 col-lg-3'>
              <div className='card p-24 radius-12 h-100'>
                <div className='text-secondary-light text-sm mb-1'>Items near expiry</div>
                <div className='fw-semibold text-xl'>{numberLabel(totalItems)}</div>
                <div className='text-secondary-light text-xs mt-2'>
                  Window: {numberLabel(daysNum)} days
                </div>
              </div>
            </div>
            <div className='col-6 col-lg-3'>
              <div className='card p-24 radius-12 h-100'>
                <div className='text-secondary-light text-sm mb-1'>Total quantity</div>
                <div className='fw-semibold text-xl'>{numberLabel(totalQty)}</div>
              </div>
            </div>
            <div className='col-12 col-lg-6'>
              <div className='card p-24 radius-12 h-100'>
                <div className='text-secondary-light text-sm mb-1'>Most urgent batch</div>
                <div className='fw-semibold text-xl'>
                  {soonest === null ? "—" : soonest <= 0 ? "Expired" : `${soonest} days`}
                </div>
                <p className='text-secondary-light text-sm mb-0 mt-2'>
                  Based on the minimum <span className='fw-semibold'>days until expiry</span>{" "}
                  across returned items.
                </p>
              </div>
            </div>

            {!loading && !error && activeBranchId && data && Array.isArray(items) && items.length === 0 ? (
              <div className='col-12'>
                <div className='card p-24 radius-12'>
                  <p className='text-secondary-light text-sm mb-0'>
                    No near-expiry inventory found for this window.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className='col-12'>
          <div className='card p-0 radius-12 overflow-hidden'>
            <div className='p-24 border-bottom border-neutral-200 d-flex align-items-center justify-content-between gap-2 flex-wrap'>
              <div>
                <h6 className='mb-0'>Near-expiry inventory</h6>
                <div className='text-secondary-light text-sm'>
                  Sorted by urgency (days until expiry).
                </div>
              </div>
            </div>
            <div className='table-responsive'>
              <table className='table mb-0'>
                <thead>
                  <tr>
                    <th scope='col'>Product</th>
                    <th scope='col'>Batch</th>
                    <th scope='col'>Expires on</th>
                    <th scope='col' className='text-end'>
                      Qty on hand
                    </th>
                    <th scope='col'>Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(items) && items.length ? (
                    [...items]
                      .sort((a, b) => {
                        const da = Number(a?.days_until_expiry);
                        const db = Number(b?.days_until_expiry);
                        if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
                        if (Number.isFinite(da)) return -1;
                        if (Number.isFinite(db)) return 1;
                        return 0;
                      })
                      .map((it, idx) => {
                        const badge = expiryUrgencyBadge(it?.days_until_expiry);
                        return (
                          <tr key={`${safeText(it?.batch_no)}-${safeText(it?.product_name)}-${idx}`}>
                            <td className='fw-medium'>{safeText(it?.product_name)}</td>
                            <td>{safeText(it?.batch_no)}</td>
                            <td>{safeText(it?.expires_on)}</td>
                            <td className='text-end'>{numberLabel(it?.quantity_on_hand)}</td>
                            <td>
                              <span className={badge.className}>{badge.label}</span>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={5} className='text-center text-secondary-light py-24'>
                        {activeBranchId
                          ? loading
                            ? "Loading…"
                            : error
                              ? "Failed to load."
                              : "No data."
                          : "Select a branch to view inventory reports."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default ReportsInventoryPage;

