import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const InsuranceProvidersPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [payerId, setPayerId] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await lekuraxFetch("/api/v1/insurance/providers");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((p) => {
      const blob = `${p.name ?? ""} ${p.payer_id ?? ""} ${p.id ?? ""}`.toLowerCase();
      return blob.includes(query);
    });
  }, [items, q]);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await lekuraxFetch("/api/v1/insurance/providers", {
        method: "POST",
        body: { name, payer_id: payerId.trim() ? payerId.trim() : null },
      });
      setName("");
      setPayerId("");
      await load();
    } catch (err) {
      setError(err?.message ?? "Create failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Insurance / Providers' />
      <div className='dashboard-main-body'>
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12'>
              <div className='d-flex align-items-center justify-content-between gap-2 mb-3'>
                <h6 className='mb-0'>New provider</h6>
                <button
                  type='button'
                  className='btn btn-sm btn-outline-primary'
                  onClick={load}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>
              {error ? (
                <div className='alert alert-danger py-2 mb-3'>{error}</div>
              ) : null}
              <form onSubmit={onCreate}>
                <label className='form-label'>Name</label>
                <input
                  className='form-control mb-3'
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  required
                  placeholder='e.g. Acme Insurance'
                />
                <label className='form-label'>Payer ID (optional)</label>
                <input
                  className='form-control mb-3'
                  value={payerId}
                  onChange={(ev) => setPayerId(ev.target.value)}
                  placeholder='e.g. ACME-001'
                />
                <button type='submit' className='btn btn-primary w-100'>
                  Create provider
                </button>
              </form>
            </div>
          </div>

          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
                <h6 className='mb-0'>Providers</h6>
                <div className='d-flex align-items-center gap-2'>
                  <input
                    className='form-control form-control-sm'
                    style={{ minWidth: 240 }}
                    value={q}
                    onChange={(ev) => setQ(ev.target.value)}
                    placeholder='Search…'
                  />
                  <span className='badge bg-primary-50 text-primary-600 border border-primary-100'>
                    {filtered.length}
                  </span>
                </div>
              </div>
              <div className='table-responsive'>
                <table className='table table-hover mb-0 align-middle'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Payer ID</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td className='fw-medium'>{p.name}</td>
                        <td>{p.payer_id || <span className='text-muted'>—</span>}</td>
                        <td>
                          <code className='text-xs'>{p.id}</code>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className='text-center text-muted py-4'>
                          {loading ? "Loading…" : "No providers found"}
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

export default InsuranceProvidersPage;

