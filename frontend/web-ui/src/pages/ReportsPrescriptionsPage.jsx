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

function numberLabel(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return v.toLocaleString();
}

function safeText(v) {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s ? s : "—";
}

function normalizeStatusLabel(s) {
  const raw = safeText(s);
  if (raw === "—") return raw;
  return raw
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

const ReportsPrescriptionsPage = () => {
  const { activeBranchId } = useBranch();

  const [from, setFrom] = useState(() => daysAgoYyyyMmDd(6)); // inclusive 7d window by default
  const [to, setTo] = useState(() => todayYyyyMmDd());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const abortRef = useRef(null);
  const requestSeqRef = useRef(0);

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
    return `/reports/prescriptions/volume?${qp.toString()}`;
  }, [from, to]);

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
      setError(e?.message ?? "Failed to load prescriptions report");
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

  const setQuickRange = (days) => {
    setFrom(daysAgoYyyyMmDd(days - 1));
    setTo(todayYyyyMmDd());
  };

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const fromInputId = "reports-rx-from";
  const toInputId = "reports-rx-to";
  const rangeErrorId = "reports-rx-range-error";
  const statusId = "reports-rx-status";

  const totalCount = data?.metrics?.total_count ?? null;
  const byStatus = Array.isArray(data?.by_status) ? data.by_status : [];
  const maxCount = useMemo(() => {
    let m = 0;
    for (const row of byStatus) {
      const c = Number(row?.count);
      if (Number.isFinite(c) && c > m) m = c;
    }
    return m;
  }, [byStatus]);

  return (
    <MasterLayout>
      <Breadcrumb title='Reports / Prescriptions' />

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
                  <label className='form-label text-sm mb-1 text-secondary-light' htmlFor={toInputId}>
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
              <div id={rangeErrorId} className='text-danger text-sm mt-2' role='alert' aria-live='polite'>
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
                <div className='text-secondary-light text-sm mb-1'>Total prescriptions</div>
                <div className='fw-semibold text-xl'>{numberLabel(totalCount)}</div>
                <div className='text-secondary-light text-xs mt-2'>
                  Range: {from || "—"} → {to || "—"}
                </div>
              </div>
            </div>
            <div className='col-12 col-lg-9'>
              <div className='card p-24 radius-12 h-100'>
                <div className='d-flex align-items-center justify-content-between gap-2 flex-wrap'>
                  <div>
                    <div className='text-secondary-light text-sm mb-1'>By status</div>
                    <div className='text-secondary-light text-xs'>
                      Bar lengths are relative to the max status count in this range.
                    </div>
                  </div>
                </div>

                {!loading && !error && activeBranchId && data && byStatus.length === 0 ? (
                  <div className='text-secondary-light text-sm mt-3'>No status breakdown returned.</div>
                ) : null}

                <div className='mt-3 d-flex flex-column gap-2'>
                  {byStatus
                    .slice()
                    .sort((a, b) => Number(b?.count ?? 0) - Number(a?.count ?? 0))
                    .map((row, idx) => {
                      const c = Number(row?.count);
                      const pct =
                        maxCount > 0 && Number.isFinite(c) ? Math.max(0, Math.min(100, (c / maxCount) * 100)) : 0;
                      const pctRounded = Math.round(pct);
                      const label = normalizeStatusLabel(row?.status);
                      return (
                        <div key={`${safeText(row?.status)}-${idx}`} className='d-flex align-items-center gap-3'>
                          <div style={{ width: 160 }} className='text-sm fw-medium'>
                            {label}
                          </div>
                          <div className='flex-grow-1'>
                            <div
                              className='progress'
                              role='progressbar'
                              aria-label={`${label} count`}
                              aria-valuenow={pctRounded}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuetext={`${numberLabel(c)} prescriptions (${pctRounded}% of max)`}
                              style={{ height: 10 }}
                            >
                              <div className='progress-bar bg-primary' style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div style={{ width: 90 }} className='text-end text-sm text-secondary-light'>
                            {numberLabel(c)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {!loading && !error && activeBranchId && data && (totalCount === 0 || totalCount === "0") ? (
              <div className='col-12'>
                <div className='card p-24 radius-12'>
                  <p className='text-secondary-light text-sm mb-0'>
                    No prescriptions found for this range.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className='col-12'>
          <div className='card p-0 radius-12 overflow-hidden'>
            <div className='p-24 border-bottom border-neutral-200'>
              <h6 className='mb-0'>Status breakdown (table)</h6>
            </div>
            <div className='table-responsive'>
              <table className='table mb-0'>
                <thead>
                  <tr>
                    <th scope='col'>Status</th>
                    <th scope='col' className='text-end'>
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byStatus.length ? (
                    byStatus
                      .slice()
                      .sort((a, b) => Number(b?.count ?? 0) - Number(a?.count ?? 0))
                      .map((row, idx) => (
                        <tr key={`${safeText(row?.status)}-${idx}`}>
                          <td className='fw-medium'>{normalizeStatusLabel(row?.status)}</td>
                          <td className='text-end'>{numberLabel(row?.count)}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={2} className='text-center text-secondary-light py-24'>
                        {activeBranchId
                          ? loading
                            ? "Loading…"
                            : error
                              ? "Failed to load."
                              : "No data."
                          : "Select a branch to view prescriptions reports."}
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

export default ReportsPrescriptionsPage;

