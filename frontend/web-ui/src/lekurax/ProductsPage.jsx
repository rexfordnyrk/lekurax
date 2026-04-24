import React, { useCallback, useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const ProductsPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [isRx, setIsRx] = useState(false);
  const [priceProductId, setPriceProductId] = useState("");
  const [priceCents, setPriceCents] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await lekuraxFetch("/api/v1/products");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load products");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await lekuraxFetch("/api/v1/products", {
        method: "POST",
        body: { name, is_prescription: isRx, is_controlled: false },
      });
      setName("");
      setIsRx(false);
      await load();
    } catch (err) {
      setError(err?.message ?? "Create failed");
    }
  };

  const onSetPrice = async (e) => {
    e.preventDefault();
    if (!priceProductId) return;
    setError("");
    try {
      await lekuraxFetch(`/api/v1/products/${priceProductId}/price`, {
        method: "PUT",
        body: {
          currency: "USD",
          unit_price_cents: Number(priceCents) || 0,
        },
      });
      setPriceCents("");
      await load();
    } catch (err) {
      setError(err?.message ?? "Price update failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Products' />
      <div className='dashboard-main-body'>
        <div className='row gy-4'>
          <div className='col-lg-5'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>New product</h6>
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
                />
                <label className='form-check mb-3'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={isRx}
                    onChange={(ev) => setIsRx(ev.target.checked)}
                  />
                  <span className='form-check-label ms-2'>Prescription (Rx)</span>
                </label>
                <button type='submit' className='btn btn-primary w-100'>
                  Create
                </button>
              </form>
              <hr />
              <h6 className='mb-3'>Set price (USD cents)</h6>
              <form onSubmit={onSetPrice}>
                <label className='form-label'>Product ID</label>
                <input
                  className='form-control mb-2'
                  value={priceProductId}
                  onChange={(ev) => setPriceProductId(ev.target.value)}
                  placeholder='uuid'
                />
                <label className='form-label'>Unit price (cents)</label>
                <input
                  className='form-control mb-3'
                  type='number'
                  min='0'
                  value={priceCents}
                  onChange={(ev) => setPriceCents(ev.target.value)}
                />
                <button type='submit' className='btn btn-outline-primary w-100'>
                  Save price
                </button>
              </form>
            </div>
          </div>
          <div className='col-lg-7'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Catalog</h6>
              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Rx</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.is_prescription ? "Yes" : "No"}</td>
                        <td>
                          <code className='text-xs'>{p.id}</code>
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

export default ProductsPage;
