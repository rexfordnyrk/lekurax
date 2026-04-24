import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { authzkit } from "../auth/authzkitClient";
import { getActiveBranchId } from "../branch/branchStorage";
import { useBranch } from "../branch/BranchContext";

function apiBaseUrl() {
  const raw = import.meta.env.VITE_LEKURAX_API_BASE_URL;
  if (!raw) {
    throw new Error(
      "[config] VITE_LEKURAX_API_BASE_URL is not set. Add it to frontend/web-ui/.env.local (see .env.example)."
    );
  }
  return raw;
}

function formatIso(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const KIND_OPTIONS = [
  { value: "", label: "All kinds" },
  { value: "prescription_image", label: "Prescription image" },
  { value: "license", label: "License" },
  { value: "sop", label: "SOP" },
  { value: "other", label: "Other" },
];

const UPLOAD_KIND_OPTIONS = KIND_OPTIONS.filter((k) => k.value !== "");

const DocumentsPage = () => {
  const { activeBranchId, accessibleBranches } = useBranch();

  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [openError, setOpenError] = useState("");

  const [kindFilter, setKindFilter] = useState("");
  const [limit, setLimit] = useState(50);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadKind, setUploadKind] = useState("prescription_image");
  const [uploadBranchId, setUploadBranchId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadOk, setUploadOk] = useState("");

  const listAbortRef = useRef(null);
  const listSeqRef = useRef(0);
  const mountedRef = useRef(false);
  const openAbortRef = useRef(null);
  const openSeqRef = useRef(0);

  const branchLocked = Boolean(activeBranchId);
  const branchLabel = useMemo(() => {
    if (!activeBranchId) return "No branch selected";
    const b = (accessibleBranches ?? []).find((x) => x.id === activeBranchId);
    return b?.name ?? activeBranchId;
  }, [activeBranchId, accessibleBranches]);

  useEffect(() => {
    if (branchLocked) {
      setUploadBranchId(activeBranchId);
    }
  }, [branchLocked, activeBranchId]);

  const load = useCallback(async () => {
    const seq = (listSeqRef.current += 1);
    if (listAbortRef.current) {
      listAbortRef.current.abort();
    }
    const ac = new AbortController();
    listAbortRef.current = ac;

    setListLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams();
      if (kindFilter) params.set("kind", kindFilter);
      if (limit) params.set("limit", String(limit));

      const data = await lekuraxFetch(`/api/v1/documents?${params.toString()}`, {
        signal: ac.signal,
      });

      if (seq !== listSeqRef.current) return;
      setItems(data?.items ?? []);
    } catch (e) {
      if (ac.signal.aborted) return;
      if (seq !== listSeqRef.current) return;
      setListError(e?.message ?? "Failed to load documents");
    } finally {
      if (seq === listSeqRef.current) {
        setListLoading(false);
      }
    }
  }, [kindFilter, limit]);

  useEffect(() => {
    load();
    return () => {
      if (listAbortRef.current) {
        listAbortRef.current.abort();
      }
    };
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (openAbortRef.current) {
        openAbortRef.current.abort();
      }
    };
  }, []);

  const onUpload = useCallback(
    async (e) => {
      e.preventDefault();
      setUploadOk("");
      setUploadError("");

      if (!uploadFile) {
        setUploadError("Please choose a file to upload.");
        return;
      }
      if (!uploadKind) {
        setUploadError("Please select a document kind.");
        return;
      }

      setUploading(true);
      try {
        const h = new Headers();
        if (authzkit.accessToken) {
          h.set("Authorization", `Bearer ${authzkit.accessToken}`);
        }
        const effectiveBranchId = uploadBranchId || getActiveBranchId();
        if (effectiveBranchId) {
          h.set("X-Branch-Id", effectiveBranchId);
        }

        const fd = new FormData();
        fd.append("file", uploadFile);
        fd.append("kind", uploadKind);
        if (uploadBranchId) {
          fd.append("branch_id", uploadBranchId);
        }
        // owner_user_id intentionally not exposed; backend defaults.

        const res = await fetch(`${apiBaseUrl()}/api/v1/documents`, {
          method: "POST",
          headers: h,
          body: fd,
        });
        if (!res.ok) {
          let detail = "";
          const ct = res.headers.get("content-type") ?? "";
          try {
            if (ct.includes("application/json")) {
              const j = await res.json();
              if (j && typeof j.error === "string") detail = `: ${j.error}`;
              else if (j && typeof j.message === "string")
                detail = `: ${j.message}`;
            } else {
              const t = await res.text();
              if (t) detail = `: ${t.slice(0, 200)}`;
            }
          } catch {
            /* ignore parse errors */
          }
          throw new Error(`HTTP ${res.status}${detail}`);
        }

        setUploadOk("Upload complete.");
        setUploadFile(null);
        if (!branchLocked) {
          setUploadBranchId("");
        }
        await load();
      } catch (err) {
        setUploadError(err?.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [uploadBranchId, uploadFile, uploadKind, branchLocked, load]
  );

  const onOpenContent = useCallback(async (doc) => {
    if (!doc?.id) return;

    const seq = (openSeqRef.current += 1);
    if (openAbortRef.current) {
      openAbortRef.current.abort();
    }
    const ac = new AbortController();
    openAbortRef.current = ac;

    setOpenError("");
    try {
      const h = new Headers();
      if (authzkit.accessToken) {
        h.set("Authorization", `Bearer ${authzkit.accessToken}`);
      }
      const bid = getActiveBranchId();
      if (bid) {
        h.set("X-Branch-Id", bid);
      }

      const res = await fetch(
        `${apiBaseUrl()}/api/v1/documents/${doc.id}/content`,
        { headers: h, signal: ac.signal }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (ac.signal.aborted) return;
      if (seq !== openSeqRef.current) return;

      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) {
        URL.revokeObjectURL(url);
        if (!mountedRef.current) return;
        if (seq !== openSeqRef.current) return;
        setOpenError(
          "Popup was blocked by your browser. Please allow popups for this site and try again."
        );
        return;
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      if (ac.signal.aborted) return;
      if (seq !== openSeqRef.current) return;
      if (!mountedRef.current) return;
      setOpenError(e?.message ?? "Failed to open document content");
    }
  }, []);

  return (
    <MasterLayout>
      <Breadcrumb title='Documents' />
      <div className='row gy-4'>
        <div className='col-12'>
          <div className='card p-16 radius-12'>
            <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
              <div className='d-flex flex-wrap align-items-end gap-3'>
                <div>
                  <label className='form-label mb-1' htmlFor='docs-kind-filter'>
                    Kind
                  </label>
                  <select
                    id='docs-kind-filter'
                    className='form-select'
                    value={kindFilter}
                    onChange={(ev) => setKindFilter(ev.target.value)}
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k.value || "all"} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='form-label mb-1' htmlFor='docs-limit'>
                    Limit
                  </label>
                  <select
                    id='docs-limit'
                    className='form-select'
                    value={limit}
                    onChange={(ev) => setLimit(Number(ev.target.value) || 50)}
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type='button'
                className='btn btn-outline-primary'
                onClick={load}
                disabled={listLoading}
              >
                {listLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            {listError ? (
              <div className='alert alert-danger py-2 mt-12 mb-0' role='alert'>
                {listError}
              </div>
            ) : null}
          </div>
        </div>

        <div className='col-lg-5'>
          <div className='card p-24 radius-12'>
            <h6 className='mb-2'>Upload document</h6>
            <p className='text-sm text-secondary-light mb-12'>
              Files are stored securely for your tenant. Max size is 10MiB.
            </p>
            {uploadError ? (
              <div className='alert alert-danger py-2 mb-12' role='alert'>
                {uploadError}
              </div>
            ) : null}
            {uploadOk ? (
              <div className='alert alert-success py-2 mb-12' role='status'>
                {uploadOk}
              </div>
            ) : null}
            <form onSubmit={onUpload}>
              <div className='mb-12'>
                <label className='form-label' htmlFor='docs-upload-file'>
                  File <span className='text-danger'>*</span>
                </label>
                <input
                  id='docs-upload-file'
                  type='file'
                  className='form-control'
                  required
                  onChange={(ev) => setUploadFile(ev.target.files?.[0] ?? null)}
                />
              </div>

              <div className='mb-12'>
                <label className='form-label' htmlFor='docs-upload-kind'>
                  Kind <span className='text-danger'>*</span>
                </label>
                <select
                  id='docs-upload-kind'
                  className='form-select'
                  value={uploadKind}
                  onChange={(ev) => setUploadKind(ev.target.value)}
                  required
                >
                  {UPLOAD_KIND_OPTIONS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className='mb-16'>
                <label className='form-label' htmlFor='docs-upload-branch'>
                  Branch (optional)
                </label>
                {branchLocked ? (
                  <div>
                    <input
                      id='docs-upload-branch'
                      className='form-control'
                      value={branchLabel}
                      disabled
                      aria-describedby='docs-branch-help'
                    />
                    <div id='docs-branch-help' className='form-text'>
                      Using the branch selected in the header.
                    </div>
                  </div>
                ) : (
                  <select
                    id='docs-upload-branch'
                    className='form-select'
                    value={uploadBranchId}
                    onChange={(ev) => setUploadBranchId(ev.target.value)}
                  >
                    <option value=''>No branch (tenant-wide)</option>
                    {(accessibleBranches ?? []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type='submit'
                className='btn btn-primary w-100'
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        </div>

        <div className='col-lg-7'>
          <div className='card p-24 radius-12'>
            <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-12'>
              <h6 className='mb-0'>Documents</h6>
              <span className='text-sm text-secondary-light'>
                {listLoading ? "Loading…" : `${items.length} item(s)`}
              </span>
            </div>
            {openError ? (
              <div className='alert alert-danger py-2 mb-12' role='alert'>
                {openError}
              </div>
            ) : null}
            <div className='table-responsive'>
              <table className='table table-hover mb-0'>
                <caption className='visually-hidden'>
                  Documents list with kind, filename, type, branch, created time, and actions.
                </caption>
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Branch</th>
                    <th>Created</th>
                    <th className='text-end'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length ? (
                    items.map((d) => (
                      <tr key={d.id}>
                        <td className='text-sm'>{d.kind}</td>
                        <td className='text-sm'>
                          <span className='fw-medium'>{d.filename}</span>
                          <div className='text-xs text-secondary-light'>
                            <code className='text-xs'>{d.id}</code>
                          </div>
                        </td>
                        <td className='text-sm'>{d.content_type}</td>
                        <td className='text-sm'>
                          {d.branch_id ? (
                            <code className='text-xs'>{d.branch_id}</code>
                          ) : (
                            <span className='text-secondary-light'>—</span>
                          )}
                        </td>
                        <td className='text-sm'>{formatIso(d.created_at)}</td>
                        <td className='text-end'>
                          <button
                            type='button'
                            className='btn btn-sm btn-outline-primary'
                            onClick={() => onOpenContent(d)}
                            aria-label={`Open ${d.filename}`}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className='text-center text-secondary-light py-24'>
                        {listLoading
                          ? "Loading documents…"
                          : "No documents found for this filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default DocumentsPage;

