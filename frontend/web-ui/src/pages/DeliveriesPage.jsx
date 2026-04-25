import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";

const STATUSES = ["created", "assigned", "picked_up", "delivered", "failed"];

function fmtWhen(ts) {
  if (!ts) return "—";
  return String(ts).replace("T", " ").slice(0, 19);
}

function shortId(id) {
  if (!id) return "—";
  return `${String(id).slice(0, 8)}…`;
}

export default function DeliveriesPage() {
  const { activeBranchId } = useBranch();

  const [couriers, setCouriers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [saleId, setSaleId] = useState("");
  const [address, setAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const abortRef = useRef(null);
  const seqRef = useRef(0);

  const deliveriesPath = useMemo(() => {
    if (!activeBranchId) return null;
    return branchApiPath(activeBranchId, "/deliveries");
  }, [activeBranchId]);

  const loadCouriers = useCallback(async () => {
    try {
      const data = await lekuraxFetch("/api/v1/couriers");
      setCouriers(data.items ?? []);
    } catch {
      // couriers are optional for viewing the board
      setCouriers([]);
    }
  }, []);

  const loadDeliveries = useCallback(async () => {
    if (!deliveriesPath) {
      setItems([]);
      return;
    }

    seqRef.current += 1;
    const seq = seqRef.current;
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError("");
    try {
      const data = await lekuraxFetch(deliveriesPath, { signal: ac.signal });
      if (seq !== seqRef.current) return;
      setItems(data.items ?? []);
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (seq !== seqRef.current) return;
      setItems([]);
      setError(e?.message ?? "Failed to load deliveries");
    } finally {
      if (abortRef.current === ac && seq === seqRef.current) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [deliveriesPath]);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  useEffect(() => {
    loadDeliveries();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDeliveries]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const st of STATUSES) m.set(st, []);
    for (const d of items) {
      const st = STATUSES.includes(d.status) ? d.status : "created";
      m.get(st).push(d);
    }
    return m;
  }, [items]);

  const createDelivery = async () => {
    if (!deliveriesPath) return;
    setCreateError("");

    const sid = saleId.trim();
    const addr = address.trim();
    if (!sid || !addr) {
      setCreateError("Sale ID and address are required.");
      return;
    }

    setCreating(true);
    try {
      await lekuraxFetch(deliveriesPath, {
        method: "POST",
        body: { sale_id: sid, address: addr },
      });
      setSaleId("");
      setAddress("");
      await loadDeliveries();
    } catch (e) {
      setCreateError(e?.message ?? "Failed to create delivery");
    } finally {
      setCreating(false);
    }
  };

  const assignCourier = async (deliveryId, courierId) => {
    if (!activeBranchId) return;
    const path = branchApiPath(activeBranchId, `/deliveries/${deliveryId}/assign`);
    try {
      await lekuraxFetch(path, { method: "POST", body: { courier_id: courierId } });
      await loadDeliveries();
    } catch (e) {
      setError(e?.message ?? "Failed to assign courier");
    }
  };

  const changeStatus = async (deliveryId, status) => {
    if (!activeBranchId) return;
    const path = branchApiPath(activeBranchId, `/deliveries/${deliveryId}/status`);
    try {
      await lekuraxFetch(path, { method: "POST", body: { status } });
      await loadDeliveries();
    } catch (e) {
      setError(e?.message ?? "Failed to change status");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Delivery / Deliveries' />

      {!activeBranchId ? (
        <div className='alert alert-warning'>
          Select an active branch (header) to view and manage deliveries.
        </div>
      ) : null}

      {error ? (
        <div className='alert alert-danger' role='alert'>
          {error}
        </div>
      ) : null}

      <div className='card p-24 radius-12 mb-4' aria-busy={loading ? "true" : "false"}>
        <div className='d-flex flex-wrap align-items-end gap-12 justify-content-between'>
          <div className='d-flex flex-wrap gap-12 align-items-end'>
            <div>
              <label className='form-label text-sm fw-semibold' htmlFor='delivery-sale-id'>
                Sale ID
              </label>
              <input
                id='delivery-sale-id'
                className='form-control form-control-sm'
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
                placeholder='UUID'
                disabled={!activeBranchId || creating}
              />
            </div>
            <div style={{ minWidth: 280 }}>
              <label className='form-label text-sm fw-semibold' htmlFor='delivery-address'>
                Address
              </label>
              <input
                id='delivery-address'
                className='form-control form-control-sm'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='Customer delivery address'
                disabled={!activeBranchId || creating}
              />
            </div>
            <button
              type='button'
              className='btn btn-sm btn-primary'
              onClick={createDelivery}
              disabled={!activeBranchId || creating}
            >
              {creating ? "Creating…" : "Create delivery"}
            </button>
          </div>

          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={loadDeliveries}
            disabled={!activeBranchId || loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {createError ? (
          <div className='alert alert-danger mt-3 mb-0 py-8' role='alert'>
            {createError}
          </div>
        ) : null}
      </div>

      <div className='row gy-4'>
        {STATUSES.map((st) => {
          const colItems = grouped.get(st) ?? [];
          return (
            <div className='col-12 col-md-6 col-xl-4 col-xxl' key={st}>
              <div className='card p-16 radius-12 h-100'>
                <div className='d-flex align-items-center justify-content-between mb-12'>
                  <div>
                    <div className='fw-semibold text-sm text-primary-light text-uppercase'>
                      {st.replace("_", " ")}
                    </div>
                    <div className='text-xs text-secondary-light'>
                      {colItems.length} item{colItems.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                {colItems.length === 0 ? (
                  <div className='text-secondary-light text-sm'>No deliveries.</div>
                ) : (
                  <div className='d-flex flex-column gap-12'>
                    {colItems.map((d) => (
                      <div key={d.id} className='border border-neutral-200 radius-8 p-12'>
                        <div className='d-flex justify-content-between gap-8'>
                          <div className='text-sm fw-semibold text-primary-light'>
                            Delivery {shortId(d.id)}
                          </div>
                          <div className='text-xs text-secondary-light'>{fmtWhen(d.created_at)}</div>
                        </div>
                        <div className='text-xs text-secondary-light mt-6'>
                          Sale: <span className='text-primary-light'>{shortId(d.sale_id)}</span>
                        </div>
                        <div className='text-xs text-secondary-light mt-6 text-truncate' title={d.address}>
                          Address: <span className='text-primary-light'>{d.address}</span>
                        </div>
                        <div className='d-flex gap-8 align-items-center mt-12 flex-wrap'>
                          <select
                            className='form-select form-select-sm'
                            value={d.courier_id ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) assignCourier(d.id, v);
                            }}
                            disabled={!activeBranchId || !couriers.length}
                            aria-label={`Assign courier for delivery ${d.id}`}
                          >
                            <option value=''>Assign courier…</option>
                            {couriers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          <select
                            className='form-select form-select-sm'
                            value={d.status ?? "created"}
                            onChange={(e) => changeStatus(d.id, e.target.value)}
                            disabled={!activeBranchId}
                            aria-label={`Change status for delivery ${d.id}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </MasterLayout>
  );
}

