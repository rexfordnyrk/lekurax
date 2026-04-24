import React, { useCallback, useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "./branchApi";

function centsLabel(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return (v / 100).toFixed(2);
}

const SalesPage = () => {
  const { activeBranchId } = useBranch();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    const path = branchApiPath(activeBranchId, "/sales");
    if (!path) {
      setItems([]);
      return;
    }
    setError("");
    try {
      const data = await lekuraxFetch(path);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load sales");
      setItems([]);
    }
  }, [activeBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (saleId) => {
    const path = branchApiPath(activeBranchId, `/sales/${saleId}`);
    if (!path) return;
    setDetailError("");
    setDetail(null);
    try {
      const data = await lekuraxFetch(path);
      setDetail(data);
    } catch (e) {
      setDetailError(e?.message ?? "Failed to load sale");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='POS / Sales history' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view sales for that branch.
          </div>
        ) : null}
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        <div className='row gy-4'>
          <div className='col-lg-7'>
            <div className='card p-24 radius-12'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h6 className='mb-0'>Recent sales (last 100)</h6>
                <button
                  type='button'
                  className='btn btn-sm btn-outline-secondary'
                  onClick={() => load()}
                  disabled={!activeBranchId}
                >
                  Refresh
                </button>
              </div>
              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.created_at
                            ? String(row.created_at).replace("T", " ").slice(0, 19)
                            : "—"}
                        </td>
                        <td>
                          {row.currency ?? "USD"} {centsLabel(row.total_cents)}
                        </td>
                        <td>{row.status ?? "—"}</td>
                        <td>
                          <button
                            type='button'
                            className='btn btn-link btn-sm p-0'
                            onClick={() => openDetail(row.id)}
                          >
                            Lines
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!items.length && activeBranchId ? (
                  <p className='text-secondary-light text-sm mb-0 mt-2'>
                    No sales yet. Complete a sale from POS.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className='col-lg-5'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Sale detail</h6>
              {detailError ? (
                <div className='alert alert-danger py-2'>{detailError}</div>
              ) : null}
              {!detail ? (
                <p className='text-secondary-light text-sm mb-0'>
                  Choose &quot;Lines&quot; on a row to load line items.
                </p>
              ) : (
                <>
                  <p className='text-sm mb-2'>
                    <span className='text-secondary-light'>Sale ID:</span>{" "}
                    {detail.sale?.id}
                  </p>
                  <p className='text-sm mb-3'>
                    <span className='text-secondary-light'>Totals:</span> sub{" "}
                    {centsLabel(detail.sale?.subtotal_cents)}, tax{" "}
                    {centsLabel(detail.sale?.tax_cents)}, total{" "}
                    {centsLabel(detail.sale?.total_cents)}
                  </p>
                  <div className='table-responsive'>
                    <table className='table table-sm mb-0'>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Line</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.lines ?? []).map((ln) => (
                          <tr key={ln.id}>
                            <td className='text-truncate' style={{ maxWidth: 140 }}>
                              {ln.product_id}
                            </td>
                            <td>{ln.quantity}</td>
                            <td>{centsLabel(ln.line_total_cents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default SalesPage;
