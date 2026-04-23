import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthzKitApiError } from "@authzkit/client";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { authzkit } from "../auth/authzkitClient";

function asItemList(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}

const BranchesPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("store");

  const load = useCallback(async () => {
    setError("");
    setInfo("");
    try {
      const res = await authzkit.branches.list({ page: 1, page_size: 100 });
      setItems(asItemList(res));
    } catch (e) {
      const msg =
        e instanceof AuthzKitApiError
          ? `${e.message} (${e.code})`
          : e?.message ?? "Failed to load branches";
      setError(msg);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    setInfo("");
    try {
      await authzkit.branches.create({
        name,
        type: newType.trim() || "store",
      });
      setNewName("");
      setInfo("Branch created.");
      await load();
    } catch (err) {
      const msg =
        err instanceof AuthzKitApiError
          ? `${err.message} (${err.code})`
          : err?.message ?? "Create failed";
      setError(msg);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Branches (AuthzKit)' />
      <div className='dashboard-main-body'>
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        {info ? <div className='alert alert-success py-2'>{info}</div> : null}
        <div className='row gy-4'>
          <div className='col-lg-4'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>New branch</h6>
              <p className='text-secondary-light text-sm mb-3'>
                Requires Authz permission <code>branches.create</code> (tenant
                admin usually has it when branches are enabled).
              </p>
              <form onSubmit={onCreate}>
                <label className='form-label'>Name</label>
                <input
                  className='form-control mb-2'
                  value={newName}
                  onChange={(ev) => setNewName(ev.target.value)}
                  required
                />
                <label className='form-label'>Type</label>
                <input
                  className='form-control mb-3'
                  value={newType}
                  onChange={(ev) => setNewType(ev.target.value)}
                  placeholder='store'
                />
                <button type='submit' className='btn btn-primary w-100'>
                  Create branch
                </button>
              </form>
            </div>
          </div>
          <div className='col-lg-8'>
            <div className='card p-24 radius-12'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h6 className='mb-0'>Your tenant branches</h6>
                <button
                  type='button'
                  className='btn btn-sm btn-outline-secondary'
                  onClick={() => load()}
                >
                  Refresh
                </button>
              </div>
              <p className='text-secondary-light text-sm mb-3'>
                Assign staff under <strong>Members</strong>. Lekurax stock, Rx,
                POS, and sales use the branch selected in the header.
              </p>
              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>ID</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((b) => (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td>{b.type ?? "—"}</td>
                        <td>{b.status ?? "—"}</td>
                        <td>
                          <code className='text-xs'>{b.id}</code>
                        </td>
                        <td>
                          <Link
                            to={`/lekurax/branches/${b.id}/users`}
                            className='btn btn-sm btn-outline-primary'
                          >
                            Members
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

export default BranchesPage;
