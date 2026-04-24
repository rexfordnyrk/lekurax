import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

const TrainingCourseDetailPage = () => {
  const { id: rawId } = useParams();
  const id = rawId ? String(rawId) : "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [course, setCourse] = useState(null);

  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");
  const [completeSuccess, setCompleteSuccess] = useState("");

  const abortRef = useRef(null);

  const userIdInputId = "training-assign-user-id";
  const pageErrorId = "training-course-error";
  const assignErrorId = "training-assign-error";
  const assignStatusId = "training-assign-status";
  const completeErrorId = "training-complete-error";
  const completeStatusId = "training-complete-status";

  const canAssign = useMemo(() => {
    return Boolean(id) && Boolean(assignUserId.trim()) && !assigning && !loading;
  }, [assignUserId, assigning, id, loading]);

  const load = useCallback(async () => {
    if (!id) {
      setCourse(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError("");
    try {
      const data = await lekuraxFetch("/api/v1/training/courses", { signal: ac.signal });
      const items = data?.items ?? data?.courses ?? data ?? [];
      const list = Array.isArray(items) ? items : [];
      const found =
        list.find((c) => String(c?.id) === id) ??
        list.find((c) => String(c?.id) === decodeURIComponent(id)) ??
        null;
      setCourse(found);
      if (!found) {
        setError("Course not found.");
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      setCourse(null);
      setError(e?.message ?? "Failed to load course");
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  const onAssign = async (e) => {
    e.preventDefault();
    if (!id) return;
    if (!assignUserId.trim()) return;

    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");
    try {
      await lekuraxFetch(`/api/v1/training/courses/${encodeURIComponent(id)}/assign`, {
        method: "POST",
        body: { user_id: assignUserId.trim() },
      });
      setAssignSuccess("Assigned.");
      setAssignUserId("");
    } catch (err) {
      setAssignError(err?.message ?? "Assign failed");
    } finally {
      setAssigning(false);
    }
  };

  const onComplete = async () => {
    if (!id) return;

    setCompleting(true);
    setCompleteError("");
    setCompleteSuccess("");
    try {
      await lekuraxFetch(`/api/v1/training/courses/${encodeURIComponent(id)}/complete`, {
        method: "POST",
      });
      setCompleteSuccess("Completed.");
    } catch (err) {
      setCompleteError(err?.message ?? "Complete failed");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Training / Course detail' />

      <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
        <div className='d-flex align-items-center gap-2'>
          <Link to='/lekurax/training/courses' className='btn btn-sm btn-outline-secondary'>
            Back
          </Link>
          <button
            type='button'
            className='btn btn-sm btn-outline-primary'
            onClick={load}
            disabled={loading || !id}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div
          id={pageErrorId}
          className='alert alert-danger py-2 mb-3'
          role='alert'
          aria-live='polite'
        >
          {error}
        </div>
      ) : null}

      <div className='row gy-4'>
        <div className='col-lg-5'>
          <div className='card p-24 radius-12' aria-busy={loading ? "true" : "false"}>
            <h6 className='mb-2'>Course</h6>
            <div className='text-secondary-light text-sm mb-3'>
              Review course info, assign staff, and mark completion.
            </div>

            <div className='mb-2 text-sm'>
              <span className='text-secondary-light'>Title</span>
              <div className='fw-semibold'>{course?.title ?? "—"}</div>
            </div>
            <div className='mb-2 text-sm'>
              <span className='text-secondary-light'>Mandatory</span>
              <div className='fw-semibold'>{mandatoryLabel(course?.mandatory)}</div>
            </div>
            <div className='mb-2 text-sm'>
              <span className='text-secondary-light'>Created</span>
              <div>{formatDateTime(course?.created_at)}</div>
            </div>
            <div className='mb-0 text-sm'>
              <span className='text-secondary-light'>Course ID</span>
              <div>
                <code className='text-xs'>{id || "—"}</code>
              </div>
            </div>
          </div>

          <div className='card p-24 radius-12 mt-4'>
            <div className='d-flex align-items-center justify-content-between gap-2 mb-2'>
              <h6 className='mb-0'>Admin: assign</h6>
              <span
                id={assignStatusId}
                className='text-sm text-secondary-light'
                role='status'
                aria-live='polite'
              >
                {assigning ? "Assigning…" : ""}
              </span>
            </div>
            <form onSubmit={onAssign}>
              <label
                className='form-label text-sm mb-1 text-secondary-light'
                htmlFor={userIdInputId}
              >
                User ID
              </label>
              <input
                id={userIdInputId}
                className='form-control form-control-sm'
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                disabled={!id || assigning || loading}
                autoComplete='off'
                aria-describedby={assignError ? assignErrorId : undefined}
              />
              <div className='d-grid mt-3'>
                <button type='submit' className='btn btn-sm btn-primary' disabled={!canAssign}>
                  Assign
                </button>
              </div>
            </form>

            {assignError ? (
              <div
                id={assignErrorId}
                className='alert alert-danger mt-3 mb-0 py-2'
                role='alert'
                aria-live='polite'
              >
                {assignError}
              </div>
            ) : null}
            {assignSuccess ? (
              <div className='alert alert-success mt-3 mb-0 py-2' role='status' aria-live='polite'>
                {assignSuccess}
              </div>
            ) : null}
          </div>
        </div>

        <div className='col-lg-7'>
          <div className='card p-24 radius-12'>
            <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2'>
              <h6 className='mb-0'>Staff: completion</h6>
              <span
                id={completeStatusId}
                className='text-sm text-secondary-light'
                role='status'
                aria-live='polite'
              >
                {completing ? "Submitting…" : ""}
              </span>
            </div>
            <div className='text-secondary-light text-sm mb-3'>
              Use this action to mark the course complete for the current staff flow (placeholder).
            </div>

            <div className='d-flex flex-wrap gap-2'>
              <button
                type='button'
                className='btn btn-sm btn-success'
                onClick={onComplete}
                disabled={!id || completing || loading}
              >
                Mark complete
              </button>
            </div>

            {completeError ? (
              <div
                id={completeErrorId}
                className='alert alert-danger mt-3 mb-0 py-2'
                role='alert'
                aria-live='polite'
              >
                {completeError}
              </div>
            ) : null}
            {completeSuccess ? (
              <div className='alert alert-success mt-3 mb-0 py-2' role='status' aria-live='polite'>
                {completeSuccess}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default TrainingCourseDetailPage;

