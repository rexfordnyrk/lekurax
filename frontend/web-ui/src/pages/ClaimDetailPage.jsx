import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";
import { branchApiPath } from "../lekurax/branchApi";

const ClaimDetailPage = () => {
  const { id } = useParams();
  const { activeBranchId } = useBranch();

  const [claim, setClaim] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [adjudicateStatus, setAdjudicateStatus] = useState("approved");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const load = useCallback(async () => {
    const path = branchApiPath(activeBranchId, `/claims/${id}`);
    if (!path) {
      setClaim(null);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await lekuraxFetch(path);
      setClaim(data);
    } catch (e) {
      setError(e?.message ?? "Failed to load claim");
      setClaim(null);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, id]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit = String(claim?.status || "") === "draft";
  const canAdjudicate = String(claim?.status || "") === "submitted";
  const canMarkPaid = String(claim?.status || "") === "approved";

  const onSubmit = async () => {
    const path = branchApiPath(activeBranchId, `/claims/${id}/submit`);
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST" });
      await load();
    } catch (err) {
      setError(err?.message ?? "Submit failed");
    }
  };

  const adjudicateBody = useMemo(() => {
    if (adjudicateStatus === "approved") {
      return {
        status: "approved",
        approved_amount_cents: Number(approvedAmount) || 0,
      };
    }
    return {
      status: "rejected",
      rejection_reason: rejectionReason.trim(),
    };
  }, [adjudicateStatus, approvedAmount, rejectionReason]);

  const onAdjudicate = async (e) => {
    e.preventDefault();
    const path = branchApiPath(activeBranchId, `/claims/${id}/adjudicate`);
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST", body: adjudicateBody });
      await load();
    } catch (err) {
      setError(err?.message ?? "Adjudicate failed");
    }
  };

  const onMarkPaid = async () => {
    const path = branchApiPath(activeBranchId, `/claims/${id}/mark-paid`);
    if (!path) return;
    setError("");
    try {
      await lekuraxFetch(path, { method: "POST" });
      await load();
    } catch (err) {
      setError(err?.message ?? "Mark paid failed");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Insurance / Claim detail' />
      <div className='dashboard-main-body'>
        {!activeBranchId ? (
          <div className='alert alert-warning'>
            Select an active branch (header) to view claims.
          </div>
        ) : null}

        <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
          <div className='d-flex align-items-center gap-2'>
            <Link to='/lekurax/claims' className='btn btn-sm btn-outline-secondary'>
              Back
            </Link>
            <button
              type='button'
              className='btn btn-sm btn-outline-primary'
              onClick={load}
              disabled={!activeBranchId || loading}
            >
              Refresh
            </button>
          </div>
          <button
            type='button'
            className='btn btn-sm btn-outline-success'
            onClick={onMarkPaid}
            disabled={!activeBranchId || !canMarkPaid}
          >
            Mark paid
          </button>
        </div>

        {error ? <div className='alert alert-danger py-2 mb-3'>{error}</div> : null}

        <div className='row gy-4'>
          <div className='col-lg-5'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-2'>Summary</h6>
              <div className='text-secondary-light text-sm mb-3'>
                Draft → Submit → Adjudicate → Paid
              </div>
              <div className='mb-2 text-sm'>
                <span className='text-secondary-light'>Status</span>
                <div className='fw-semibold'>{claim?.status ?? "—"}</div>
              </div>
              <div className='mb-2 text-sm'>
                <span className='text-secondary-light'>Claim ID</span>
                <div>
                  <code className='text-xs'>{id}</code>
                </div>
              </div>
              <div className='mb-2 text-sm'>
                <span className='text-secondary-light'>Sale</span>
                <div>
                  <code className='text-xs'>{claim?.sale_id ?? "—"}</code>
                </div>
              </div>
              <div className='mb-3 text-sm'>
                <span className='text-secondary-light'>Plan</span>
                <div>
                  <code className='text-xs'>{claim?.plan_id ?? "—"}</code>
                </div>
              </div>

              <button
                type='button'
                className='btn btn-primary w-100'
                onClick={onSubmit}
                disabled={!activeBranchId || !canSubmit}
              >
                Submit
              </button>
            </div>
          </div>

          <div className='col-lg-7'>
            <div className='card p-24 radius-12'>
              <h6 className='mb-3'>Adjudicate</h6>
              <form onSubmit={onAdjudicate}>
                <label className='form-label'>Decision</label>
                <select
                  className='form-select mb-2'
                  value={adjudicateStatus}
                  onChange={(ev) => setAdjudicateStatus(ev.target.value)}
                  disabled={!canAdjudicate}
                >
                  <option value='approved'>Approve</option>
                  <option value='rejected'>Reject</option>
                </select>

                {adjudicateStatus === "approved" ? (
                  <>
                    <label className='form-label'>Approved amount (cents)</label>
                    <input
                      className='form-control mb-3'
                      type='number'
                      min='0'
                      value={approvedAmount}
                      onChange={(ev) => setApprovedAmount(ev.target.value)}
                      placeholder='e.g. 12345'
                      disabled={!canAdjudicate}
                      required
                    />
                  </>
                ) : (
                  <>
                    <label className='form-label'>Rejection reason</label>
                    <input
                      className='form-control mb-3'
                      value={rejectionReason}
                      onChange={(ev) => setRejectionReason(ev.target.value)}
                      placeholder='e.g. Missing prior auth'
                      disabled={!canAdjudicate}
                      required
                    />
                  </>
                )}

                <button
                  type='submit'
                  className='btn btn-outline-primary w-100'
                  disabled={!activeBranchId || !canAdjudicate}
                >
                  Apply decision
                </button>
              </form>
              {!canAdjudicate ? (
                <div className='alert alert-info py-2 mt-3 mb-0'>
                  Claim must be in <code>submitted</code> status to adjudicate.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default ClaimDetailPage;

