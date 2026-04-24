import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const PatientsPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await lekuraxFetch("/api/v1/patients");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load patients");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const blob = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.id}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, query]);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await lekuraxFetch("/api/v1/patients", {
        method: "POST",
        body: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob || null,
        },
      });
      setFirstName("");
      setLastName("");
      setDob("");
      await load();
    } catch (err) {
      setError(err?.message ?? "Create failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Patients' />
      <div className='dashboard-main-body'>
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12 mb-4'>
              <h6 className='mb-3'>New patient</h6>
              {error ? (
                <div className='alert alert-danger py-2 mb-3'>{error}</div>
              ) : null}
              <form onSubmit={onCreate}>
                <label className='form-label'>First name</label>
                <input
                  className='form-control mb-2'
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  required
                />
                <label className='form-label'>Last name</label>
                <input
                  className='form-control mb-2'
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  required
                />
                <label className='form-label'>Date of birth</label>
                <input
                  className='form-control mb-3'
                  type='date'
                  value={dob}
                  onChange={(ev) => setDob(ev.target.value)}
                />
                <button type='submit' className='btn btn-primary w-100'>
                  Create
                </button>
              </form>
            </div>
          </div>
          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Patients</h6>
              <label className='form-label text-sm'>Filter list</label>
              <input
                className='form-control mb-3'
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                placeholder='Name or ID…'
              />
              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>ID</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.last_name}, {p.first_name}
                        </td>
                        <td>
                          <code className='text-xs'>{p.id}</code>
                        </td>
                        <td>
                          <Link
                            to={`/lekurax/patients/${p.id}`}
                            className='btn btn-sm btn-outline-primary'
                          >
                            Open
                          </Link>
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

export default PatientsPage;
