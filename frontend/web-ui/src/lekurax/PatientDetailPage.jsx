import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const PatientDetailPage = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [allergen, setAllergen] = useState("");
  const [reaction, setReaction] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const [p, a] = await Promise.all([
        lekuraxFetch(`/api/v1/patients/${id}`),
        lekuraxFetch(`/api/v1/patients/${id}/allergies`),
      ]);
      setPatient(p);
      setAllergies(a.items ?? []);
      setFirstName(p.first_name ?? "");
      setLastName(p.last_name ?? "");
      setDob(p.date_of_birth ? String(p.date_of_birth).slice(0, 10) : "");
    } catch (e) {
      setError(e?.message ?? "Failed to load patient");
      setPatient(null);
      setAllergies([]);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (!id) return;
    setError("");
    try {
      await lekuraxFetch(`/api/v1/patients/${id}`, {
        method: "PATCH",
        body: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob || null,
        },
      });
      await load();
    } catch (err) {
      setError(err?.message ?? "Update failed");
    }
  };

  const onAddAllergy = async (e) => {
    e.preventDefault();
    if (!id || !allergen.trim()) return;
    setError("");
    try {
      await lekuraxFetch(`/api/v1/patients/${id}/allergies`, {
        method: "POST",
        body: {
          allergen: allergen.trim(),
          reaction: reaction.trim() ? reaction.trim() : null,
        },
      });
      setAllergen("");
      setReaction("");
      await load();
    } catch (err) {
      setError(err?.message ?? "Allergy add failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Patient detail' />
      <div className='dashboard-main-body'>
        <div className='mb-3'>
          <Link to='/lekurax/patients' className='btn btn-sm btn-outline-secondary'>
            ← Patients
          </Link>
        </div>
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        {!patient && !error ? (
          <div className='text-secondary-light'>Loading…</div>
        ) : null}
        {patient ? (
          <div className='row gy-4'>
            <div className='col-lg-5'>
              <div className='card p-24 radius-12'>
                <h6 className='mb-3'>Profile</h6>
                <form onSubmit={onSaveProfile}>
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
                    Save changes
                  </button>
                </form>
              </div>
              <div className='card p-24 radius-12 mt-4'>
                <h6 className='mb-3'>Add allergy</h6>
                <form onSubmit={onAddAllergy}>
                  <label className='form-label'>Allergen</label>
                  <input
                    className='form-control mb-2'
                    value={allergen}
                    onChange={(ev) => setAllergen(ev.target.value)}
                    required
                  />
                  <label className='form-label'>Reaction (optional)</label>
                  <input
                    className='form-control mb-3'
                    value={reaction}
                    onChange={(ev) => setReaction(ev.target.value)}
                  />
                  <button type='submit' className='btn btn-outline-primary w-100'>
                    Add allergy
                  </button>
                </form>
              </div>
            </div>
            <div className='col-lg-7'>
              <div className='card p-24 radius-12'>
                <h6 className='mb-3'>Allergies</h6>
                <div className='table-responsive'>
                  <table className='table table-hover mb-0'>
                    <thead>
                      <tr>
                        <th>Allergen</th>
                        <th>Reaction</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allergies.map((row) => (
                        <tr key={row.id}>
                          <td>{row.allergen}</td>
                          <td>{row.reaction ?? "—"}</td>
                          <td>{row.severity ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!allergies.length ? (
                  <p className='text-secondary-light text-sm mb-0 mt-2'>
                    No allergies recorded.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </MasterLayout>
  );
};

export default PatientDetailPage;
