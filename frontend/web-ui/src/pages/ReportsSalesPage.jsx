import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYyyyMmDd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function daysAgoYyyyMmDd(daysAgo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return toYyyyMmDd(d);
}

function todayYyyyMmDd() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toYyyyMmDd(d);
}

function centsLabel(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return (v / 100).toFixed(2);
}

function numberLabel(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return v.toLocaleString();
}

const ReportsSalesPage = () => {
  const { activeBranchId } = useBranch();

  const [from, setFrom] = useState(() => daysAgoYyyyMmDd(6)); // inclusive 7d window by default
  const [to, setTo] = useState(() => todayYyyyMmDd());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const abortRef = useRef(null);

  const validation = useMemo(() => {
    if (!from || !to) {
      return { ok: false, message: "Select both From and To dates." };
    }
    // Dates are normalized to YYYY-MM-DD so lexicographic compare is valid.
    if (from > to) {
      return { ok: false, message: "From date must be on or before To date." };
    }
    return { ok: true, message: "" };
  }, [from, to]);

  const queryPath = useMemo(() => {
    const qp = new URLSearchParams();
    if (from && to) {
      qp.set("from", from);
      qp.set("to", to);
    }
    return `/reports/sales/summary?${qp.toString()}`;
  }, [from, to]);

  const load = useCallback(async () => {
    if (!validation.ok) {
      setLoading(false);
      setError("");
      setSummary(null);
      return;
    }

    const path = branchApiPath(activeBranchId, queryPath);
    if (!path) {
      setSummary(null);
      setError("");
      setLoading(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError("");
    try {
      const data = await lekuraxFetch(path, { signal: ac.signal });
      setSummary(data ?? null);
    } catch (e) {
      if (e?.name === "AbortError") {
        return;
      }
      setSummary(null);
      setError(e?.message ?? "Failed to load sales summary");
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [activeBranchId, queryPath, validation.ok]);

  useEffect(() => {
    if (!activeBranchId) return;
    if (!validation.ok) return;
    load();
  }, [load]);

  const setQuickRange = (days) => {
    setFrom(daysAgoYyyyMmDd(days - 1));
    setTo(todayYyyyMmDd());
  };

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const currency = summary?.currency ?? "USD";
  const saleCount = summary?.sale_count ?? summary?.sales_count ?? summary?.count ?? null;
  const subtotalCents = summary?.subtotal_cents ?? summary?.subtotal ?? null;
  const taxCents = summary?.tax_cents ?? summary?.tax ?? null;
  const totalCents = summary?.total_cents ?? summary?.total ?? null;
  const avgTotalCents = summary?.avg_total_cents ?? summary?.avg_total ?? null;

  const fromInputId = "reports-sales-from";
  const toInputId = "reports-sales-to";
  const rangeErrorId = "reports-sales-range-error";
  const statusId = "reports-sales-status";

  return (
    <MasterLayout>
      <Breadcrumb title='Reports / Sales' />
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
                <div style={{ minWidth: 190 }}>
                  <label
                    className='form-label text-sm mb-1 text-secondary-light'
                    htmlFor={fromInputId}
                  >
                    From
                  </label>
                  <input
                    id={fromInputId}
                    type='date'
                    className='form-control form-control-sm'
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    disabled={!activeBranchId}
                    aria-invalid={!validation.ok ? "true" : "false"}
                    aria-describedby={!validation.ok ? rangeErrorId : undefined}
                  />
                </div>
                <div style={{ minWidth: 190 }}>
                  <label
                    className='form-label text-sm mb-1 text-secondary-light'
                    htmlFor={toInputId}
                  >
                    To
                  </label>
                  <input
                    id={toInputId}
                    type='date'
                    className='form-control form-control-sm'
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={!activeBranchId}
                    aria-invalid={!validation.ok ? "true" : "false"}
                    aria-describedby={!validation.ok ? rangeErrorId : undefined}
                  />
                </div>
                <div className='d-flex flex-wrap gap-2'>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary'
                    onClick={() => setQuickRange(7)}
                    disabled={!activeBranchId || loading}
                  >
                    7d
                  </button>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary'
                    onClick={() => setQuickRange(30)}
                    disabled={!activeBranchId || loading}
                  >
                    30d
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
                id={rangeErrorId}
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
                <div className='text-secondary-light text-sm mb-1'>Sale count</div>
                <div className='fw-semibold text-xl'>{numberLabel(saleCount)}</div>
                <div className='text-secondary-light text-xs mt-2'>
                  Range: {from || "—"} → {to || "—"}
                </div>
              </div>
            </div>

            <div className='col-6 col-lg-3'>
              <div className='card p-24 radius-12 h-100'>
                <div className='text-secondary-light text-sm mb-1'>Subtotal</div>
                <div className='fw-semibold text-xl'>
                  {currency} {centsLabel(subtotalCents)}
                </div>
              </div>
            </div>

            <div className='col-6 col-lg-3'>
              <div className='card p-24 radius-12 h-100'>
                <div className='text-secondary-light text-sm mb-1'>Tax</div>
                <div className='fw-semibold text-xl'>
                  {currency} {centsLabel(taxCents)}
                </div>
              </div>
            </div>

            <div className='col-6 col-lg-3'>
              <div className='card p-24 radius-12 h-100'>
                <div className='text-secondary-light text-sm mb-1'>Total</div>
                <div className='fw-semibold text-xl'>
                  {currency} {centsLabel(totalCents)}
                </div>
              </div>
            </div>

            <div className='col-12 col-lg-4'>
              <div className='card p-24 radius-12 h-100'>
                <div className='text-secondary-light text-sm mb-1'>Avg total</div>
                <div className='fw-semibold text-xl'>
                  {currency} {centsLabel(avgTotalCents)}
                </div>
                <p className='text-secondary-light text-sm mb-0 mt-2'>
                  Average of completed sales in the selected window.
                </p>
              </div>
            </div>

            {!loading && !error && activeBranchId && !summary ? (
              <div className='col-12'>
                <div className='card p-24 radius-12'>
                  <p className='text-secondary-light text-sm mb-0'>
                    No data returned for this range.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default ReportsSalesPage;

