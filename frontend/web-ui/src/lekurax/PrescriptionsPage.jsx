import React, { useCallback, useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "./branchApi";

const PrescriptionsPage = () => {
  const { activeBranchId } = useBranch();
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [patientId, setPatientId] = useState("");
  const [rxId, setRxId] = useState("");
  const [itemProduct, setItemProduct] = useState("");
  const [itemQty, setItemQty] = useState("1");

  const loadRx = useCallback(async () => {
    const base = branchApiPath(activeBranchId, "/prescriptions");
    if (!base) {
      setItems([]);
      return;
    }
    setError("");
    try {
      const data = await lekuraxFetch(base);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load prescriptions");
    }
  }, [activeBranchId]);

  const loadRefs = useCallback(async () => {
    try {
      const [p, pr] = await Promise.all([
        lekuraxFetch("/api/v1/patients"),
        lekuraxFetch("/api/v1/products"),
      ]);
      setPatients(p.items ?? []);
      setProducts(pr.items ?? []);
    } catch {
      setPatients([]);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    loadRx();
  }, [loadRx]);

  const onCreateRx = async (e) => {
    e.preventDefault();
    const path = branchApiPath(activeBranchId, "/prescriptions");
    if (!path) return;
    setError("");
    try {
      const created = await lekuraxFetch(path, {
        method: "POST",
        body: { patient_id: patientId },
      });
      setRxId(created.id);
      await loadRx();
    } catch (err) {
      setError(err?.message ?? "Create rx failed");
    }
  };

  const onAddItem = async (e) => {
    e.preventDefault();
    if (!rxId || !activeBranchId) return;
    const path = branchApiPath(
      activeBranchId,
      `/prescriptions/${rxId}/items`
    );
    setError("");
    try {
      await lekuraxFetch(path, {
        method: "POST",
        body: {
          product_id: itemProduct,
          quantity: Number(itemQty) || 1,
        },
      });
      await loadRx();
    } catch (err) {
      setError(err?.message ?? "Add item failed");
    }
  };

  const onSubmit = async () => {
    if (!rxId || !activeBranchId) return;
    const path = branchApiPath(
      activeBranchId,
      `/prescriptions/${rxId}/submit`
    );
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST", body: {} });
      await loadRx();
    } catch (err) {
      setError(err?.message ?? "Submit failed");
    }
  };

  const onDispense = async () => {
    if (!rxId || !activeBranchId) return;
    const path = branchApiPath(
      activeBranchId,
      `/prescriptions/${rxId}/dispense`
    );
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST", body: {} });
      await loadRx();
    } catch (err) {
      setError(err?.message ?? "Dispense failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Prescriptions' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select a branch to manage prescriptions.
          </div>
        ) : null}
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12 mb-3'>
              <h6 className='mb-3'>New prescription</h6>
              <form onSubmit={onCreateRx}>
                <label className='form-label'>Patient</label>
                <select
                  className='form-select mb-3'
                  value={patientId}
                  onChange={(ev) => setPatientId(ev.target.value)}
                  required
                >
                  <option value=''>Select…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name}
                    </option>
                  ))}
                </select>
                <button
                  type='submit'
                  className='btn btn-primary w-100'
                  disabled={!activeBranchId}
                >
                  Create draft
                </button>
              </form>
            </div>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Workflow</h6>
              <label className='form-label'>Active Rx ID</label>
              <input
                className='form-control mb-2'
                value={rxId}
                onChange={(ev) => setRxId(ev.target.value)}
                placeholder='uuid'
              />
              <form onSubmit={onAddItem}>
                <label className='form-label'>Product</label>
                <select
                  className='form-select mb-2'
                  value={itemProduct}
                  onChange={(ev) => setItemProduct(ev.target.value)}
                  required
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
                  className='form-control mb-2'
                  type='number'
                  min='1'
                  value={itemQty}
                  onChange={(ev) => setItemQty(ev.target.value)}
                />
                <button type='submit' className='btn btn-outline-primary w-100 mb-2'>
                  Add line item
                </button>
              </form>
              <button
                type='button'
                className='btn btn-warning w-100 mb-2'
                onClick={onSubmit}
                disabled={!rxId}
              >
                Submit (→ ready)
              </button>
              <button
                type='button'
                className='btn btn-success w-100'
                onClick={onDispense}
                disabled={!rxId}
              >
                Dispense (FEFO)
              </button>
            </div>
          </div>
          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Branch prescriptions</h6>
              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Patient</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((rx) => (
                      <tr key={rx.id}>
                        <td>{rx.status}</td>
                        <td>{rx.patient_id}</td>
                        <td>
                          <code className='text-xs'>{rx.id}</code>
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

export default PrescriptionsPage;
