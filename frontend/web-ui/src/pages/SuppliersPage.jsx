import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const SuppliersPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await lekuraxFetch("/api/v1/suppliers");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load suppliers");
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
    return items.filter((s) => {
      return (
        (s.name ?? "").toLowerCase().includes(query) ||
        (s.contact_email ?? "").toLowerCase().includes(query) ||
        (s.contact_phone ?? "").toLowerCase().includes(query) ||
        (s.id ?? "").toLowerCase().includes(query)
      );
    });
  }, [items, q]);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await lekuraxFetch("/api/v1/suppliers", {
        method: "POST",
        body: {
          name,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
        },
      });
      setName("");
      setContactEmail("");
      setContactPhone("");
      await load();
    } catch (err) {
      setError(err?.message ?? "Create failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Suppliers' />
      <div className='dashboard-main-body'>
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12'>
              <div className='d-flex align-items-center justify-content-between gap-2 mb-3'>
                <h6 className='mb-0'>New supplier</h6>
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
                  placeholder='e.g. Continental Pharma Ltd'
                />
                <div className='row'>
                  <div className='col-12'>
                    <label className='form-label'>Contact email (optional)</label>
                    <input
                      className='form-control mb-3'
                      value={contactEmail}
                      onChange={(ev) => setContactEmail(ev.target.value)}
                      placeholder='supplier@example.com'
                      type='email'
                    />
                  </div>
                  <div className='col-12'>
                    <label className='form-label'>Contact phone (optional)</label>
                    <input
                      className='form-control mb-3'
                      value={contactPhone}
                      onChange={(ev) => setContactPhone(ev.target.value)}
                      placeholder='+1 555 0100'
                    />
                  </div>
                </div>
                <button type='submit' className='btn btn-primary w-100'>
                  Create supplier
                </button>
              </form>
              <hr />
              <div className='small text-muted'>
                Tip: use the search on the right to quickly find suppliers by name,
                email, phone, or ID.
              </div>
            </div>
          </div>

          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
                <h6 className='mb-0'>Directory</h6>
                <div className='d-flex align-items-center gap-2'>
                  <input
                    className='form-control form-control-sm'
                    style={{ minWidth: 240 }}
                    value={q}
                    onChange={(ev) => setQ(ev.target.value)}
                    placeholder='Search suppliers...'
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
                      <th className='d-none d-md-table-cell'>Email</th>
                      <th className='d-none d-md-table-cell'>Phone</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td className='fw-medium'>{s.name}</td>
                        <td className='d-none d-md-table-cell'>
                          {s.contact_email ? (
                            <a href={`mailto:${s.contact_email}`}>
                              {s.contact_email}
                            </a>
                          ) : (
                            <span className='text-muted'>—</span>
                          )}
                        </td>
                        <td className='d-none d-md-table-cell'>
                          {s.contact_phone ? s.contact_phone : (
                            <span className='text-muted'>—</span>
                          )}
                        </td>
                        <td>
                          <code className='text-xs'>{s.id}</code>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className='text-center text-muted py-4'>
                          {loading ? "Loading…" : "No suppliers found"}
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

export default SuppliersPage;

