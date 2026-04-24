import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";

const RequisitionDetailPage = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const isNew = !rawId || rawId === "new";
  const id = rawId || "";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [requisition, setRequisition] = useState(null);
  const [lines, setLines] = useState([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [products, setProducts] = useState([]);

  const load = useCallback(async () => {
    if (isNew) {
      setRequisition({ status: "draft", created_at: null });
      setLines([]);
      return;
    }
    const path = branchApiPath(activeBranchId, `/requisitions/${id}`);
    if (!path) {
      setRequisition(null);
      setLines([]);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await lekuraxFetch(path);
      setRequisition(data.requisition ?? null);
      setLines(data.lines ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load requisition");
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, id]);

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
    load();
  }, [load]);

  const isDraft = String(requisition?.status || "") === "draft";
  const isSubmitted = String(requisition?.status || "") === "submitted";

  const productNameById = useMemo(() => {
    const m = new Map();
    (products ?? []).forEach((p) => m.set(String(p.id), p.name));
    return m;
  }, [products]);

  const onAddLine = async (e) => {
    e.preventDefault();
    if (isNew) {
      setError("Create the requisition first.");
      return;
    }
    const path = branchApiPath(activeBranchId, `/requisitions/${id}/lines`);
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, {
        method: "POST",
        body: {
          product_id: productId,
          quantity: Number(quantity) || 0,
        },
      });
      setProductId("");
      setQuantity("");
      await load();
    } catch (err) {
      setError(err?.message ?? "Add line failed");
    }
  };

  const onSubmit = async () => {
    if (isNew) {
      setError("Create the requisition first.");
      return;
    }
    const path = branchApiPath(activeBranchId, `/requisitions/${id}/submit`);
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST" });
      await load();
    } catch (err) {
      setError(err?.message ?? "Submit failed");
    }
  };

  const onApprove = async () => {
    if (isNew) {
      setError("Create the requisition first.");
      return;
    }
    const path = branchApiPath(activeBranchId, `/requisitions/${id}/approve`);
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST" });
      await load();
    } catch (err) {
      setError(err?.message ?? "Approve failed");
    }
  };

  const onReject = async () => {
    if (isNew) {
      setError("Create the requisition first.");
      return;
    }
    const path = branchApiPath(activeBranchId, `/requisitions/${id}/reject`);
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST" });
      await load();
    } catch (err) {
      setError(err?.message ?? "Reject failed");
    }
  };

  const onCreateNew = async () => {
    const path = branchApiPath(activeBranchId, "/requisitions");
    if (!path) return;
    setError("");
    try {
      const created = await lekuraxFetch(path, { method: "POST" });
      navigate(`/lekurax/requisitions/${created.id}`);
    } catch (err) {
      setError(err?.message ?? "Create requisition failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Procurement / Requisition detail' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view requisitions.
          </div>
        ) : null}

        <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
          <div className='d-flex align-items-center gap-2'>
            <Link to='/lekurax/requisitions' className='btn btn-sm btn-outline-secondary'>
              Back
            </Link>
            <button
              type='button'
              className='btn btn-sm btn-outline-primary'
              onClick={load}
              disabled={loading || !activeBranchId || isNew}
            >
              Refresh
            </button>
          </div>
          <button
            type='button'
            className='btn btn-sm btn-primary'
            onClick={onCreateNew}
            disabled={!activeBranchId}
          >
            {isNew ? "Create requisition" : "New requisition"}
          </button>
        </div>

        {error ? <div className='alert alert-danger py-2 mb-3'>{error}</div> : null}

        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-2'>Summary</h6>
              <div className='text-secondary-light text-sm mb-3'>
                Manage line items while in Draft, then submit for approval.
              </div>

              <div className='mb-2 text-sm'>
                <span className='text-secondary-light'>Status</span>
                <div className='fw-semibold'>{requisition?.status ?? "—"}</div>
              </div>
              <div className='mb-2 text-sm'>
                <span className='text-secondary-light'>Requisition ID</span>
                <div>
                  <code className='text-xs'>{id}</code>
                </div>
              </div>
              <div className='mb-3 text-sm'>
                <span className='text-secondary-light'>Created</span>
                <div>
                  {requisition?.created_at
                    ? String(requisition.created_at).replace("T", " ").slice(0, 19)
                    : "—"}
                </div>
              </div>

              <div className='d-grid gap-2'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={onSubmit}
                  disabled={!activeBranchId || !isDraft || lines.length === 0}
                >
                  Submit
                </button>
                <div className='d-flex gap-2'>
                  <button
                    type='button'
                    className='btn btn-outline-success w-100'
                    onClick={onApprove}
                    disabled={!activeBranchId || !isSubmitted}
                  >
                    Approve
                  </button>
                  <button
                    type='button'
                    className='btn btn-outline-danger w-100'
                    onClick={onReject}
                    disabled={!activeBranchId || !isSubmitted}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {!isDraft ? (
                <div className='alert alert-info py-2 mt-3 mb-0'>
                  This requisition is no longer editable.
                </div>
              ) : null}
            </div>

            <div className='card p-24 radius-12 mt-4'>
              <h6 className='mb-3'>Add line item</h6>
              <form onSubmit={onAddLine}>
                <label className='form-label'>Product</label>
                <select
                  className='form-select mb-2'
                  value={productId}
                  onChange={(ev) => setProductId(ev.target.value)}
                  required
                  disabled={!isDraft}
                >
                  <option value=''>Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <label className='form-label'>Quantity</label>
                <input
                  className='form-control mb-3'
                  type='number'
                  min='1'
                  value={quantity}
                  onChange={(ev) => setQuantity(ev.target.value)}
                  required
                  disabled={!isDraft}
                />
                <button
                  type='submit'
                  className='btn btn-outline-primary w-100'
                  disabled={!activeBranchId || !isDraft}
                >
                  Add line
                </button>
              </form>
            </div>
          </div>

          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <div className='d-flex align-items-center justify-content-between gap-2 mb-3'>
                <h6 className='mb-0'>Line items</h6>
                <span className='badge bg-primary-50 text-primary-600 border border-primary-100'>
                  {lines.length}
                </span>
              </div>

              <div className='table-responsive'>
                <table className='table table-hover mb-0 align-middle'>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Product ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td className='fw-medium'>
                          {productNameById.get(String(l.product_id)) ?? "—"}
                        </td>
                        <td>{l.quantity}</td>
                        <td>
                          <code className='text-xs'>{l.product_id}</code>
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={3} className='text-center text-muted py-4'>
                          {loading ? "Loading…" : "No line items yet"}
                        </td>
                      </tr>
                    ) : null}
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

export default RequisitionDetailPage;

