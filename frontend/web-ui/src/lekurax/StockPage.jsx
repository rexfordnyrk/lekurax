import React, { useCallback, useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "./branchApi";

const StockPage = () => {
  const { activeBranchId } = useBranch();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [productId, setProductId] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [adjProductId, setAdjProductId] = useState("");
  const [adjBatchId, setAdjBatchId] = useState("");
  const [adjDelta, setAdjDelta] = useState("");
  const [adjReason, setAdjReason] = useState("CORRECTION");
  const [adjNote, setAdjNote] = useState("");
  const [nearExpiry, setNearExpiry] = useState([]);
  const [nearExpiryDays, setNearExpiryDays] = useState(30);

  const loadStock = useCallback(async () => {
    const path = branchApiPath(activeBranchId, "/stock");
    if (!path) {
      setItems([]);
      return;
    }
    setError("");
    try {
      const data = await lekuraxFetch(path);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load stock");
    }
  }, [activeBranchId]);

  const loadNearExpiry = useCallback(async () => {
    const path = branchApiPath(
      activeBranchId,
      `/stock/near-expiry?days=${encodeURIComponent(String(nearExpiryDays))}`,
    );
    if (!path) {
      setNearExpiry([]);
      return;
    }
    try {
      const data = await lekuraxFetch(path);
      setNearExpiry(data.items ?? []);
    } catch {
      setNearExpiry([]);
    }
  }, [activeBranchId, nearExpiryDays]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await lekuraxFetch("/api/v1/products");
      setProducts(data.items ?? []);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  useEffect(() => {
    loadNearExpiry();
  }, [loadNearExpiry]);

  const onReceive = async (e) => {
    e.preventDefault();
    const path = branchApiPath(activeBranchId, "/stock/receive");
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, {
        method: "POST",
        body: {
          product_id: productId,
          batch_no: batchNo,
          quantity: Number(quantity) || 0,
          expires_on: expiresOn || null,
        },
      });
      setBatchNo("");
      setQuantity("");
      setExpiresOn("");
      await loadStock();
      await loadNearExpiry();
    } catch (err) {
      setError(err?.message ?? "Receive failed");
    }
  };

  const batchesForProduct = items.filter(
    (row) => String(row.product_id) === adjProductId,
  );

  const onAdjust = async (e) => {
    e.preventDefault();
    const path = branchApiPath(activeBranchId, "/stock/adjust");
    if (!path || !adjProductId) return;
    const delta = Number(adjDelta);
    if (!delta) {
      setError("Adjustment delta must be non-zero.");
      return;
    }
    setError("");
    const body = {
      product_id: adjProductId,
      delta,
      reason_code: adjReason.trim() || "CORRECTION",
      note: adjNote.trim() ? adjNote.trim() : null,
    };
    if (adjBatchId) {
      body.stock_batch_id = adjBatchId;
    }
    try {
      await lekuraxFetch(path, { method: "POST", body });
      setAdjDelta("");
      setAdjNote("");
      setAdjBatchId("");
      await loadStock();
      await loadNearExpiry();
    } catch (err) {
      setError(err?.message ?? "Adjust failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Inventory / Stock' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view and receive stock.
          </div>
        ) : null}
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Receive stock</h6>
              {error ? (
                <div className='alert alert-danger py-2 mb-3'>{error}</div>
              ) : null}
              <form onSubmit={onReceive}>
                <label className='form-label'>Product</label>
                <select
                  className='form-select mb-2'
                  value={productId}
                  onChange={(ev) => setProductId(ev.target.value)}
                  required
                >
                  <option value=''>Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <label className='form-label'>Batch number</label>
                <input
                  className='form-control mb-2'
                  value={batchNo}
                  onChange={(ev) => setBatchNo(ev.target.value)}
                  required
                />
                <label className='form-label'>Quantity</label>
                <input
                  className='form-control mb-2'
                  type='number'
                  min='1'
                  value={quantity}
                  onChange={(ev) => setQuantity(ev.target.value)}
                  required
                />
                <label className='form-label'>Expires on (optional)</label>
                <input
                  className='form-control mb-3'
                  type='date'
                  value={expiresOn}
                  onChange={(ev) => setExpiresOn(ev.target.value)}
                />
                <button
                  type='submit'
                  className='btn btn-primary w-100'
                  disabled={!activeBranchId}
                >
                  Receive
                </button>
              </form>
            </div>
            <div className='card p-24 radius-12 mt-4'>
              <h6 className='mb-3'>Adjust stock</h6>
              <p className='text-secondary-light text-sm mb-3'>
                Negative delta removes quantity (e.g. waste). Server picks the
                oldest batch by expiry if you leave batch as Auto.
              </p>
              <form onSubmit={onAdjust}>
                <label className='form-label'>Product</label>
                <select
                  className='form-select mb-2'
                  value={adjProductId}
                  onChange={(ev) => {
                    setAdjProductId(ev.target.value);
                    setAdjBatchId("");
                  }}
                  required
                >
                  <option value=''>Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <label className='form-label'>Batch (optional)</label>
                <select
                  className='form-select mb-2'
                  value={adjBatchId}
                  onChange={(ev) => setAdjBatchId(ev.target.value)}
                  disabled={!adjProductId}
                >
                  <option value=''>Auto (FIFO by expiry)</option>
                  {batchesForProduct.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_no} — qty {b.quantity_on_hand}
                    </option>
                  ))}
                </select>
                <label className='form-label'>Delta (+/- units)</label>
                <input
                  className='form-control mb-2'
                  type='number'
                  value={adjDelta}
                  onChange={(ev) => setAdjDelta(ev.target.value)}
                  required
                />
                <label className='form-label'>Reason code</label>
                <input
                  className='form-control mb-2'
                  value={adjReason}
                  onChange={(ev) => setAdjReason(ev.target.value)}
                  required
                />
                <label className='form-label'>Note (optional)</label>
                <input
                  className='form-control mb-3'
                  value={adjNote}
                  onChange={(ev) => setAdjNote(ev.target.value)}
                />
                <button
                  type='submit'
                  className='btn btn-outline-primary w-100'
                  disabled={!activeBranchId}
                >
                  Apply adjustment
                </button>
              </form>
            </div>
          </div>
          <div className='col-lg-8'>
            <div className='card p-24 radius-12 mb-4'>
              <div className='d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3'>
                <h6 className='mb-0'>Near expiry</h6>
                <div className='d-flex align-items-center gap-2'>
                  <label className='form-label mb-0 text-sm text-secondary-light'>
                    Days
                  </label>
                  <input
                    type='number'
                    min='1'
                    max='365'
                    className='form-control form-control-sm'
                    style={{ width: "5rem" }}
                    value={nearExpiryDays}
                    onChange={(ev) =>
                      setNearExpiryDays(Number(ev.target.value) || 30)
                    }
                  />
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary'
                    onClick={() => loadNearExpiry()}
                    disabled={!activeBranchId}
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <p className='text-secondary-light text-sm mb-3'>
                Batches with expiry on or before today + window, with quantity
                &gt; 0.
              </p>
              <div className='table-responsive'>
                <table className='table table-sm table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch</th>
                      <th>Qty</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearExpiry.map((row) => (
                      <tr key={row.id}>
                        <td>{row.product_name}</td>
                        <td>{row.batch_no}</td>
                        <td>{row.quantity_on_hand}</td>
                        <td>
                          {row.expires_on
                            ? String(row.expires_on).slice(0, 10)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!nearExpiry.length && activeBranchId ? (
                <p className='text-secondary-light text-sm mb-0 mt-2'>
                  No batches in this window.
                </p>
              ) : null}
            </div>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>On hand</h6>
              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch</th>
                      <th>Qty</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id}>
                        <td>{row.product_name}</td>
                        <td>{row.batch_no}</td>
                        <td>{row.quantity_on_hand}</td>
                        <td>
                          {row.expires_on
                            ? String(row.expires_on).slice(0, 10)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default StockPage;
