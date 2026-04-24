import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const InsurancePlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [providerId, setProviderId] = useState("");
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [p1, p2] = await Promise.all([
        lekuraxFetch("/api/v1/insurance/plans"),
        lekuraxFetch("/api/v1/insurance/providers"),
      ]);
      setPlans(p1.items ?? []);
      setProviders(p2.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load plans");
      setPlans([]);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const providerName = useMemo(() => {
    const m = new Map();
    (providers ?? []).forEach((p) => m.set(String(p.id), p.name));
    return m;
  }, [providers]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return plans;
    return plans.filter((pl) => {
      const blob = `${pl.name ?? ""} ${providerName.get(String(pl.provider_id)) ?? ""} ${pl.id ?? ""}`.toLowerCase();
      return blob.includes(query);
    });
  }, [plans, providerName, q]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!providerId) return;
    setError("");
    try {
      await lekuraxFetch(`/api/v1/insurance/providers/${providerId}/plans`, {
        method: "POST",
        body: { name },
      });
      setName("");
      await load();
    } catch (err) {
      setError(err?.message ?? "Create failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Insurance / Plans' />
      <div className='dashboard-main-body'>
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12'>
              <div className='d-flex align-items-center justify-content-between gap-2 mb-3'>
                <h6 className='mb-0'>New plan</h6>
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
                <label className='form-label'>Provider</label>
                <select
                  className='form-select mb-2'
                  value={providerId}
                  onChange={(ev) => setProviderId(ev.target.value)}
                  required
                >
                  <option value=''>Select…</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <label className='form-label'>Plan name</label>
                <input
                  className='form-control mb-3'
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  required
                  placeholder='e.g. Acme Silver'
                />
                <button type='submit' className='btn btn-primary w-100'>
                  Create plan
                </button>
              </form>
            </div>
          </div>

          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
                <h6 className='mb-0'>Plans</h6>
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
                      <th>Plan</th>
                      <th>Provider</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((pl) => (
                      <tr key={pl.id}>
                        <td className='fw-medium'>{pl.name}</td>
                        <td>{providerName.get(String(pl.provider_id)) ?? "—"}</td>
                        <td>
                          <code className='text-xs'>{pl.id}</code>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className='text-center text-muted py-4'>
                          {loading ? "Loading…" : "No plans found"}
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

export default InsurancePlansPage;

