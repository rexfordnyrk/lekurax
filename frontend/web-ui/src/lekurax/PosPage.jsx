import React, { useCallback, useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "./branchApi";

const PosPage = () => {
  const { activeBranchId } = useBranch();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [lines, setLines] = useState([
    { product_id: "", quantity: 1, is_rx: false },
  ]);
  const [quote, setQuote] = useState(null);
  const [rxLink, setRxLink] = useState("");
  const [checkoutOk, setCheckoutOk] = useState("");

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

  const updateLine = (idx, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, { product_id: "", quantity: 1, is_rx: false }]);
  };

  const onQuote = async (e) => {
    e.preventDefault();
    setError("");
    setCheckoutOk("");
    const bodyLines = lines
      .filter((l) => l.product_id)
      .map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity) || 1,
        is_rx: !!l.is_rx,
      }));
    if (!bodyLines.length) return;
    try {
      const q = await lekuraxFetch("/api/v1/pricing/quote", {
        method: "POST",
        body: { lines: bodyLines },
      });
      setQuote(q);
    } catch (err) {
      setQuote(null);
      setError(err?.message ?? "Quote failed");
    }
  };

  const onCheckout = async (e) => {
    e.preventDefault();
    const path = branchApiPath(activeBranchId, "/sales");
    if (!path) return;
    setError("");
    setCheckoutOk("");
    const bodyLines = lines
      .filter((l) => l.product_id)
      .map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity) || 1,
        is_rx: !!l.is_rx,
      }));
    if (!bodyLines.length) return;
    try {
      await lekuraxFetch(path, {
        method: "POST",
        body: {
          prescription_id: rxLink || null,
          patient_id: null,
          currency: "USD",
          lines: bodyLines,
        },
      });
      setQuote(null);
      setCheckoutOk("Sale recorded. View it under Lekurax → Sales history.");
      setLines([{ product_id: "", quantity: 1, is_rx: false }]);
      setRxLink("");
    } catch (err) {
      setError(err?.message ?? "Checkout failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='POS' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select a branch to record sales.
          </div>
        ) : null}
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        {checkoutOk ? (
          <div className='alert alert-success py-2'>{checkoutOk}</div>
        ) : null}
        <div className='card p-24 radius-12'>
          <h6 className='mb-3'>Cart</h6>
          <p className='text-secondary-light text-sm mb-3'>
            Set product prices on the Products page first. Optionally add a default
            tax rule under Tax (or POST /api/v1/tax-rules).
          </p>
          <label className='form-label'>Linked prescription ID (optional)</label>
          <input
            className='form-control mb-3'
            value={rxLink}
            onChange={(ev) => setRxLink(ev.target.value)}
            placeholder='After dispense, link sale to Rx'
          />
          {lines.map((line, idx) => (
            <div key={idx} className='row g-2 align-items-end mb-2'>
              <div className='col-md-5'>
                <select
                  className='form-select'
                  value={line.product_id}
                  onChange={(ev) =>
                    updateLine(idx, "product_id", ev.target.value)
                  }
                >
                  <option value=''>Product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='col-md-3'>
                <input
                  type='number'
                  min='1'
                  className='form-control'
                  value={line.quantity}
                  onChange={(ev) =>
                    updateLine(idx, "quantity", ev.target.value)
                  }
                />
              </div>
              <div className='col-md-2'>
                <label className='form-check small mb-0'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={line.is_rx}
                    onChange={(ev) =>
                      updateLine(idx, "is_rx", ev.target.checked)
                    }
                  />
                  <span className='form-check-label'>Rx line</span>
                </label>
              </div>
            </div>
          ))}
          <button
            type='button'
            className='btn btn-light btn-sm mb-3'
            onClick={addLine}
          >
            + Line
          </button>
          <div className='d-flex flex-wrap gap-2'>
            <button className='btn btn-outline-primary' onClick={onQuote}>
              Quote totals
            </button>
            <button
              className='btn btn-primary'
              onClick={onCheckout}
              disabled={!activeBranchId}
            >
              Complete sale
            </button>
          </div>
          {quote ? (
            <div className='mt-3 p-3 bg-neutral-50 radius-8'>
              <div>Subtotal (cents): {quote.subtotal_cents}</div>
              <div>Tax (cents): {quote.tax_cents}</div>
              <div className='fw-semibold'>
                Total (cents): {quote.total_cents}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </MasterLayout>
  );
};

export default PosPage;
