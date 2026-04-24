import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const PatientDetailPage = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [coverages, setCoverages] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [allergen, setAllergen] = useState("");
  const [reaction, setReaction] = useState("");
  const [planId, setPlanId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const [p, a, c, pl] = await Promise.all([
        lekuraxFetch(`/api/v1/patients/${id}`),
        lekuraxFetch(`/api/v1/patients/${id}/allergies`),
        lekuraxFetch(`/api/v1/patients/${id}/coverages`),
        lekuraxFetch(`/api/v1/insurance/plans`),
      ]);
      setPatient(p);
      setAllergies(a.items ?? []);
      setCoverages(c.items ?? []);
      setPlans(pl.items ?? []);
      setFirstName(p.first_name ?? "");
      setLastName(p.last_name ?? "");
      setDob(p.date_of_birth ? String(p.date_of_birth).slice(0, 10) : "");
    } catch (e) {
      setError(e?.message ?? "Failed to load patient");
      setPatient(null);
      setAllergies([]);
      setCoverages([]);
      setPlans([]);
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

  const onAddCoverage = async (e) => {
    e.preventDefault();
    if (!id || !planId || !memberId.trim()) return;
    setError("");
    try {
      await lekuraxFetch(`/api/v1/patients/${id}/coverages`, {
        method: "POST",
        body: {
          plan_id: planId,
          member_id: memberId.trim(),
          is_primary: isPrimary,
        },
      });
      setPlanId("");
      setMemberId("");
      setIsPrimary(true);
      await load();
    } catch (err) {
      setError(err?.message ?? "Coverage add failed");
    }
  };

  const planNameById = new Map(plans.map((pl) => [String(pl.id), pl.name]));

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
                <div className='d-flex align-items-center justify-content-between gap-2 mb-3'>
                  <h6 className='mb-0'>Insurance coverage</h6>
                  <span className='badge bg-primary-50 text-primary-600 border border-primary-100'>
                    {coverages.length}
                  </span>
                </div>
                <p className='text-secondary-light text-sm mb-3'>
                  Add coverage for claims submission. Primary is used by default.
                </p>
                <form onSubmit={onAddCoverage}>
                  <label className='form-label'>Plan</label>
                  <select
                    className='form-select mb-2'
                    value={planId}
                    onChange={(ev) => setPlanId(ev.target.value)}
                    required
                  >
                    <option value=''>Select…</option>
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                  <label className='form-label'>Member ID</label>
                  <input
                    className='form-control mb-2'
                    value={memberId}
                    onChange={(ev) => setMemberId(ev.target.value)}
                    required
                    placeholder='e.g. MEM-123'
                  />
                  <label className='form-check mb-3'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      checked={isPrimary}
                      onChange={(ev) => setIsPrimary(ev.target.checked)}
                    />
                    <span className='form-check-label ms-2'>Primary</span>
                  </label>
                  <button type='submit' className='btn btn-outline-primary w-100'>
                    Add coverage
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
              <div className='card p-24 radius-12 mt-4'>
                <h6 className='mb-3'>Coverages</h6>
                <div className='table-responsive'>
                  <table className='table table-hover mb-0'>
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Member</th>
                        <th>Primary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverages.map((c) => (
                        <tr key={c.id}>
                          <td>{planNameById.get(String(c.plan_id)) ?? c.plan_id}</td>
                          <td>{c.member_id}</td>
                          <td>{c.is_primary ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!coverages.length ? (
                  <p className='text-secondary-light text-sm mb-0 mt-2'>
                    No coverages recorded.
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
