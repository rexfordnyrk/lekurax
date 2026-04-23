import React, { useCallback, useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const TaxRulesPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("Sales tax");
  const [rateBps, setRateBps] = useState("825");
  const [rx, setRx] = useState(true);
  const [otc, setOtc] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await lekuraxFetch("/api/v1/tax-rules");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load tax rules");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await lekuraxFetch("/api/v1/tax-rules", {
        method: "POST",
        body: {
          name,
          rate_bps: Number(rateBps) || 0,
          applies_to_prescription: rx,
          applies_to_otc: otc,
        },
      });
      await load();
    } catch (err) {
      setError(err?.message ?? "Create failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Tax rules' />
      <div className='dashboard-main-body'>
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>New rule</h6>
              {error ? (
                <div className='alert alert-danger py-2 mb-3'>{error}</div>
              ) : null}
              <p className='text-sm text-secondary-light mb-3'>
                Rate is basis points (100 = 1%). Example: 825 = 8.25%.
              </p>
              <form onSubmit={onCreate}>
                <label className='form-label'>Name</label>
                <input
                  className='form-control mb-2'
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                />
                <label className='form-label'>Rate (bps)</label>
                <input
                  className='form-control mb-2'
                  type='number'
                  min='0'
                  value={rateBps}
                  onChange={(ev) => setRateBps(ev.target.value)}
                />
                <label className='form-check mb-2'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={otc}
                    onChange={(ev) => setOtc(ev.target.checked)}
                  />
                  <span className='form-check-label ms-2'>Applies to OTC</span>
                </label>
                <label className='form-check mb-3'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={rx}
                    onChange={(ev) => setRx(ev.target.checked)}
                  />
                  <span className='form-check-label ms-2'>
                    Applies to Rx lines
                  </span>
                </label>
                <button type='submit' className='btn btn-primary w-100'>
                  Save rule
                </button>
              </form>
            </div>
          </div>
          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Active rules</h6>
              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Bps</th>
                      <th>OTC</th>
                      <th>Rx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>{r.rate_bps}</td>
                        <td>{r.applies_to_otc ? "Yes" : "No"}</td>
                        <td>{r.applies_to_prescription ? "Yes" : "No"}</td>
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

export default TaxRulesPage;
