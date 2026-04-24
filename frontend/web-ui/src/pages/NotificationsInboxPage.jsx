import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";
import { useBranch } from "../branch/BranchContext";

function safeText(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s;
}

function statusBadge(status) {
  if (status === "unread") return { label: "Unread", className: "badge text-bg-warning" };
  if (status === "read") return { label: "Read", className: "badge text-bg-success" };
  return { label: "Unknown", className: "badge text-bg-secondary" };
}

function channelBadge(channel) {
  const c = safeText(channel).toLowerCase();
  if (!c) return { label: "Unknown", className: "badge text-bg-secondary" };
  if (c.includes("email")) return { label: "Email", className: "badge text-bg-info" };
  if (c.includes("sms")) return { label: "SMS", className: "badge text-bg-primary" };
  if (c.includes("push")) return { label: "Push", className: "badge text-bg-dark" };
  if (c.includes("web")) return { label: "Web", className: "badge text-bg-secondary" };
  return { label: safeText(channel) || "Other", className: "badge text-bg-secondary" };
}

function formatTimestamp(ts) {
  const raw = safeText(ts);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function normalizeStatus(notification) {
  const explicit = safeText(notification?.status).toLowerCase();
  if (explicit === "read" || explicit === "unread") return explicit;
  const isRead =
    notification?.read === true ||
    Boolean(notification?.read_at) ||
    Boolean(notification?.readAt) ||
    Boolean(notification?.read_on) ||
    Boolean(notification?.readOn);
  return isRead ? "read" : "unread";
}

function normalizeTimestamp(notification) {
  return (
    notification?.created_at ??
    notification?.createdAt ??
    notification?.timestamp ??
    notification?.sent_at ??
    notification?.sentAt ??
    notification?.updated_at ??
    notification?.updatedAt ??
    ""
  );
}

const NotificationsInboxPage = () => {
  const { activeBranchId } = useBranch();

  const [filter, setFilter] = useState("all"); // all | unread | read
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState(() => new Set());

  const abortRef = useRef(null);
  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(false);
  const markOneSeqRef = useRef(0);
  const markAllSeqRef = useRef(0);

  const listPath = useMemo(() => {
    const qp = new URLSearchParams();
    if (filter === "unread") qp.set("status", "unread");
    if (filter === "read") qp.set("status", "read");
    const qs = qp.toString();
    return `/api/v1/notifications${qs ? `?${qs}` : ""}`;
  }, [filter]);

  const load = useCallback(async () => {
    if (!activeBranchId) {
      requestSeqRef.current += 1;
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = null;
      if (isMountedRef.current) {
        setItems([]);
        setError("");
        setLoading(false);
      }
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const requestSeq = (requestSeqRef.current += 1);

    if (isMountedRef.current) {
      setLoading(true);
      setError("");
    }
    try {
      const data = await lekuraxFetch(listPath, { signal: ac.signal });
      if (requestSeqRef.current !== requestSeq || abortRef.current !== ac) return;
      const raw = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      if (!isMountedRef.current) return;
      setItems(raw);
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (requestSeqRef.current !== requestSeq || abortRef.current !== ac) return;
      if (!isMountedRef.current) return;
      setItems([]);
      setError(e?.message ?? "Failed to load notifications");
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        if (requestSeqRef.current !== requestSeq) return;
        if (!isMountedRef.current) return;
        setLoading(false);
      }
    }
  }, [activeBranchId, listPath]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      markOneSeqRef.current += 1;
      markAllSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const visible = useMemo(() => {
    // Keep list compact + predictable: newest first when possible.
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => {
      const da = new Date(normalizeTimestamp(a)).getTime();
      const db = new Date(normalizeTimestamp(b)).getTime();
      if (Number.isFinite(da) && Number.isFinite(db)) return db - da;
      if (Number.isFinite(da)) return -1;
      if (Number.isFinite(db)) return 1;
      return 0;
    });
    return arr;
  }, [items]);

  const unreadVisible = useMemo(() => {
    return visible.filter((n) => normalizeStatus(n) === "unread");
  }, [visible]);

  const markOneRead = useCallback(
    async (id) => {
      const nid = safeText(id);
      if (!nid) return;

      const actionSeq = (markOneSeqRef.current += 1);
      const branchAtStart = activeBranchId;

      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.add(nid);
        return next;
      });

      setError("");
      try {
        await lekuraxFetch(`/api/v1/notifications/${encodeURIComponent(nid)}/read`, { method: "POST" });
        if (!isMountedRef.current) return;
        if (markOneSeqRef.current !== actionSeq) return;
        if (activeBranchId !== branchAtStart) return;

        // Optimistic update: reduce server round-trips for single-item actions.
        setItems((prev) =>
          Array.isArray(prev)
            ? prev.map((n) => {
                const currId = safeText(n?.id ?? n?.notification_id ?? n?.notificationId);
                if (currId !== nid) return n;
                return { ...n, status: "read", read: true, read_at: n?.read_at ?? new Date().toISOString() };
              })
            : prev,
        );
        setError("");
      } catch (e) {
        if (!isMountedRef.current) return;
        if (markOneSeqRef.current !== actionSeq) return;
        if (activeBranchId !== branchAtStart) return;
        setError(e?.message ?? "Failed to mark as read");
      } finally {
        if (!isMountedRef.current) return;
        if (markOneSeqRef.current !== actionSeq) return;
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(nid);
          return next;
        });
      }
    },
    [activeBranchId, setItems],
  );

  const markAllVisibleRead = useCallback(async () => {
    const targets = unreadVisible
      .map((n) => safeText(n?.id ?? n?.notification_id ?? n?.notificationId))
      .filter(Boolean);
    if (!targets.length) return;

    const actionSeq = (markAllSeqRef.current += 1);
    const branchAtStart = activeBranchId;
    const filterAtStart = filter;
    const listPathAtStart = listPath;

    setMarkingAll(true);
    setError("");
    try {
      for (const id of targets) {
        // sequential calls ok per requirements
        // eslint-disable-next-line no-await-in-loop
        await lekuraxFetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
        if (!isMountedRef.current) return;
        if (markAllSeqRef.current !== actionSeq) return;
        if (activeBranchId !== branchAtStart) return;
        if (filter !== filterAtStart) return;
        if (listPath !== listPathAtStart) return;
      }
      if (!isMountedRef.current) return;
      if (markAllSeqRef.current !== actionSeq) return;
      if (activeBranchId !== branchAtStart) return;
      if (filter !== filterAtStart) return;
      if (listPath !== listPathAtStart) return;
      await load();
    } catch (e) {
      if (!isMountedRef.current) return;
      if (markAllSeqRef.current !== actionSeq) return;
      if (activeBranchId !== branchAtStart) return;
      if (filter !== filterAtStart) return;
      if (listPath !== listPathAtStart) return;
      setError(e?.message ?? "Failed to mark all as read");
    } finally {
      if (!isMountedRef.current) return;
      if (markAllSeqRef.current !== actionSeq) return;
      setMarkingAll(false);
    }
  }, [activeBranchId, filter, listPath, load, unreadVisible]);

  const filterAllId = "notifications-filter-all";
  const filterUnreadId = "notifications-filter-unread";
  const filterReadId = "notifications-filter-read";
  const statusId = "notifications-inbox-status";

  return (
    <MasterLayout>
      <Breadcrumb title='Lekurax / Notifications' />

      {!activeBranchId ? (
        <div className='alert alert-warning'>
          Select an active branch (header) to view notifications for that branch.
        </div>
      ) : null}

      <div className='row gy-4'>
        <div className='col-12'>
          <div className='card p-24 radius-12' aria-busy={loading ? "true" : "false"}>
            <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
              <div className='d-flex flex-wrap align-items-center gap-3'>
                <fieldset className='mb-0'>
                  <legend className='form-label text-sm mb-1 text-secondary-light'>Filter</legend>
                  <div className='btn-group' role='group' aria-label='Notification filter'>
                    <input
                      type='radio'
                      className='btn-check'
                      name='notifications-filter'
                      id={filterAllId}
                      autoComplete='off'
                      checked={filter === "all"}
                      onChange={() => setFilter("all")}
                      disabled={loading || markingAll}
                    />
                    <label className='btn btn-sm btn-outline-secondary' htmlFor={filterAllId}>
                      All
                    </label>

                    <input
                      type='radio'
                      className='btn-check'
                      name='notifications-filter'
                      id={filterUnreadId}
                      autoComplete='off'
                      checked={filter === "unread"}
                      onChange={() => setFilter("unread")}
                      disabled={loading || markingAll}
                    />
                    <label className='btn btn-sm btn-outline-secondary' htmlFor={filterUnreadId}>
                      Unread
                    </label>

                    <input
                      type='radio'
                      className='btn-check'
                      name='notifications-filter'
                      id={filterReadId}
                      autoComplete='off'
                      checked={filter === "read"}
                      onChange={() => setFilter("read")}
                      disabled={loading || markingAll}
                    />
                    <label className='btn btn-sm btn-outline-secondary' htmlFor={filterReadId}>
                      Read
                    </label>
                  </div>
                </fieldset>

                <div className='d-flex align-items-center gap-2'>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-primary'
                    onClick={() => load()}
                    disabled={!activeBranchId || loading || markingAll}
                  >
                    Refresh
                  </button>
                  <button
                    type='button'
                    className='btn btn-sm btn-primary'
                    onClick={markAllVisibleRead}
                    disabled={!activeBranchId || loading || markingAll || unreadVisible.length === 0}
                    aria-disabled={!activeBranchId || loading || markingAll || unreadVisible.length === 0 ? "true" : "false"}
                  >
                    {markingAll ? "Marking…" : `Mark all visible as read (${unreadVisible.length})`}
                  </button>
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
              </div>
            </div>

            {error ? (
              <div className='alert alert-danger mt-3 mb-0' role='alert' aria-live='polite'>
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className='col-12'>
          <div className='card p-0 radius-12 overflow-hidden'>
            <div className='p-24 border-bottom border-neutral-200 d-flex align-items-center justify-content-between gap-2 flex-wrap'>
              <div>
                <h6 className='mb-0'>Inbox</h6>
                <div className='text-secondary-light text-sm'>
                  Title, message, channel, timestamp, and status. Use Tab to reach “Mark as read” actions.
                </div>
              </div>
              <div className='text-secondary-light text-sm'>
                Showing <span className='fw-semibold'>{visible.length}</span>
              </div>
            </div>

            <div className='table-responsive'>
              <table className='table mb-0'>
                <thead>
                  <tr>
                    <th scope='col'>Notification</th>
                    <th scope='col'>Channel</th>
                    <th scope='col'>Timestamp</th>
                    <th scope='col'>Status</th>
                    <th scope='col' className='text-end'>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeBranchId && visible.length ? (
                    visible.map((n, idx) => {
                      const id = safeText(n?.id ?? n?.notification_id ?? n?.notificationId);
                      const title = safeText(n?.title ?? n?.subject ?? n?.name) || "Notification";
                      const message = safeText(n?.message ?? n?.body ?? n?.content ?? n?.text) || "—";
                      const channel = n?.channel ?? n?.delivery_channel ?? n?.deliveryChannel ?? n?.type ?? "";
                      const ts = normalizeTimestamp(n);
                      const st = normalizeStatus(n);
                      const stBadge = statusBadge(st);
                      const chBadge = channelBadge(channel);
                      const busy = markingIds.has(id);

                      return (
                        <tr key={`${id || "notif"}-${idx}`} className={st === "unread" ? "table-warning" : ""}>
                          <td style={{ minWidth: 360 }}>
                            <div className='fw-semibold text-sm'>
                              {title} {st === "unread" ? <span className='visually-hidden'>(Unread)</span> : null}
                            </div>
                            <div className='text-secondary-light text-sm'>{message}</div>
                          </td>
                          <td>
                            <span className={chBadge.className}>{chBadge.label}</span>
                          </td>
                          <td className='text-sm text-secondary-light'>{formatTimestamp(ts)}</td>
                          <td>
                            <span className={stBadge.className}>{stBadge.label}</span>
                          </td>
                          <td className='text-end'>
                            {st === "unread" ? (
                              <button
                                type='button'
                                className='btn btn-sm btn-outline-secondary'
                                onClick={() => markOneRead(id)}
                                disabled={!id || busy || loading || markingAll}
                                aria-disabled={!id || busy || loading || markingAll ? "true" : "false"}
                                aria-label={`Mark notification as read: ${title}`}
                              >
                                {busy ? "Marking…" : "Mark as read"}
                              </button>
                            ) : (
                              <span className='text-secondary-light text-sm'>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className='text-center text-secondary-light py-24'>
                        {!activeBranchId
                          ? "Select a branch to view notifications."
                          : loading
                            ? "Loading…"
                            : error
                              ? "Failed to load."
                              : "No notifications found."}
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

export default NotificationsInboxPage;

