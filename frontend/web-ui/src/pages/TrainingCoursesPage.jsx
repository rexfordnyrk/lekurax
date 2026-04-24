import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

function formatDateTime(value) {
  if (!value) return "—";
  const s = String(value);
  return s.includes("T") ? s.replace("T", " ").slice(0, 19) : s;
}

function mandatoryLabel(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

const TrainingCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMandatory, setNewMandatory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const abortRef = useRef(null);

  const titleInputId = "training-course-title";
  const mandatoryInputId = "training-course-mandatory";
  const errorId = "training-courses-error";
  const createErrorId = "training-courses-create-error";
  const statusId = "training-courses-status";

  const sortedCourses = useMemo(() => {
    const list = Array.isArray(courses) ? [...courses] : [];
    list.sort((a, b) => String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? "")));
    return list;
  }, [courses]);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError("");
    try {
      const data = await lekuraxFetch("/api/v1/training/courses", { signal: ac.signal });
      const items = data?.items ?? data?.courses ?? data ?? [];
      setCourses(Array.isArray(items) ? items : []);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setCourses([]);
      setError(e?.message ?? "Failed to load training courses");
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    setCreateError("");
    try {
      await lekuraxFetch("/api/v1/training/courses", {
        method: "POST",
        body: {
          title: newTitle.trim(),
          mandatory: Boolean(newMandatory),
        },
      });
      setNewTitle("");
      setNewMandatory(false);
      setCreateOpen(false);
      await load();
    } catch (err) {
      setCreateError(err?.message ?? "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Training / Courses' />

      <div className='row gy-4'>
        <div className='col-12'>
          <div className='card p-24 radius-12' aria-busy={loading ? "true" : "false"}>
            <div className='d-flex flex-wrap align-items-center justify-content-between gap-2'>
              <div>
                <h6 className='mb-1'>Courses</h6>
                <div className='text-secondary-light text-sm mb-0'>
                  Manage training courses and assignments.
                </div>
              </div>

              <div className='d-flex align-items-center gap-2'>
                <span
                  id={statusId}
                  className='text-sm text-secondary-light'
                  role='status'
                  aria-live='polite'
                >
                  {loading ? "Loading…" : ""}
                </span>
                <button
                  type='button'
                  className='btn btn-sm btn-outline-primary'
                  onClick={load}
                  disabled={loading}
                >
                  Refresh
                </button>
                <button
                  type='button'
                  className='btn btn-sm btn-primary'
                  onClick={() => {
                    setCreateError("");
                    setCreateOpen((v) => !v);
                  }}
                  aria-expanded={createOpen ? "true" : "false"}
                  aria-controls='training-course-create-panel'
                >
                  {createOpen ? "Close" : "Create course"}
                </button>
              </div>
            </div>

            {error ? (
              <div
                id={errorId}
                className='alert alert-danger mt-3 mb-0'
                role='alert'
                aria-live='polite'
              >
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {createOpen ? (
          <div className='col-12'>
            <div className='card p-24 radius-12' id='training-course-create-panel'>
              <h6 className='mb-2'>Create course</h6>
              <form onSubmit={onCreate} className='row g-3 align-items-end'>
                <div className='col-12 col-lg-6'>
                  <label
                    className='form-label text-sm mb-1 text-secondary-light'
                    htmlFor={titleInputId}
                  >
                    Title
                  </label>
                  <input
                    id={titleInputId}
                    className='form-control form-control-sm'
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    disabled={creating}
                    autoComplete='off'
                  />
                </div>

                <div className='col-12 col-lg-3'>
                  <div className='form-check mt-4'>
                    <input
                      id={mandatoryInputId}
                      className='form-check-input'
                      type='checkbox'
                      checked={newMandatory}
                      onChange={(e) => setNewMandatory(e.target.checked)}
                      disabled={creating}
                    />
                    <label className='form-check-label text-sm' htmlFor={mandatoryInputId}>
                      Mandatory
                    </label>
                  </div>
                </div>

                <div className='col-12 col-lg-3 d-grid'>
                  <button
                    type='submit'
                    className='btn btn-sm btn-primary'
                    disabled={creating || !newTitle.trim()}
                  >
                    {creating ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>

              {createError ? (
                <div
                  id={createErrorId}
                  className='alert alert-danger mt-3 mb-0 py-2'
                  role='alert'
                  aria-live='polite'
                >
                  {createError}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className='col-12'>
          <div className='card p-24 radius-12'>
            <div className='d-flex align-items-center justify-content-between gap-2 mb-3'>
              <h6 className='mb-0'>All courses</h6>
              <span className='badge bg-primary-50 text-primary-600 border border-primary-100'>
                {sortedCourses.length}
              </span>
            </div>

            <div className='table-responsive'>
              <table className='table table-hover mb-0 align-middle'>
                <thead>
                  <tr>
                    <th style={{ width: "45%" }}>Title</th>
                    <th>Mandatory</th>
                    <th>Created</th>
                    <th className='text-end'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCourses.map((c) => (
                    <tr key={c.id ?? `${c.title}-${c.created_at ?? ""}`}>
                      <td className='fw-medium'>{c.title ?? "—"}</td>
                      <td>
                        <span className='text-sm'>{mandatoryLabel(c.mandatory)}</span>
                      </td>
                      <td className='text-sm'>{formatDateTime(c.created_at)}</td>
                      <td className='text-end'>
                        {c.id ? (
                          <Link
                            to={`/lekurax/training/courses/${encodeURIComponent(String(c.id))}`}
                            className='btn btn-sm btn-outline-primary'
                          >
                            Open
                          </Link>
                        ) : (
                          <button type='button' className='btn btn-sm btn-outline-secondary' disabled>
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sortedCourses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className='text-center text-muted py-4'>
                        {loading ? "Loading…" : "No courses yet"}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default TrainingCoursesPage;

