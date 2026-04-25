import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { lekuraxFetch } from "../../api/lekuraxApi";

function PortalNav() {
  const linkClass = ({ isActive }) =>
    `btn btn-sm ${isActive ? "btn-primary" : "btn-outline-secondary"}`;

  return (
    <header
      className='border-bottom'
      style={{ background: "#fff", position: "sticky", top: 0, zIndex: 10 }}
    >
      <div className='container py-2 d-flex flex-wrap align-items-center justify-content-between gap-2'>
        <div className='d-flex align-items-center gap-2'>
          <span className='fw-semibold' style={{ color: "#111" }}>
            Patient Portal
          </span>
          <nav aria-label='Portal navigation' className='d-flex align-items-center gap-2'>
            <NavLink to='/portal' end className={linkClass}>
              Home
            </NavLink>
            <NavLink to='/portal/prescriptions' className={linkClass}>
              Prescriptions
            </NavLink>
          </nav>
        </div>
        <button type='button' className='btn btn-sm btn-outline-dark' disabled>
          Sign out
        </button>
      </div>
    </header>
  );
}

function safeStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return String(v);
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

export default function PortalPrescriptionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);

  const [refillById, setRefillById] = useState(() => ({}));
  // refillById[id] = { status: "idle"|"loading"|"success"|"error", message?: string }

  const abortRef = useRef(null);

  const normalized = useMemo(() => {
    return (prescriptions ?? []).map((p) => {
      const id = pickFirst(p, ["id", "prescription_id", "prescriptionId"]) ?? "";
      const medication = pickFirst(p, ["medication_name", "drug_name", "name", "medication", "drug"]) ?? "—";
      const instructions =
        pickFirst(p, ["sig", "directions", "instructions", "dosage_instructions"]) ?? "—";
      const status = pickFirst(p, ["status", "state"]) ?? "—";
      const quantity = pickFirst(p, ["quantity", "qty"]) ?? null;
      const refillsRemaining = pickFirst(p, ["refills_remaining", "refillsRemaining", "refills_left"]) ?? null;
      const nextRefill = pickFirst(p, ["next_refill_date", "nextRefillDate", "eligible_on", "eligibleOn"]) ?? null;
      return {
        raw: p,
        id: safeStr(id),
        medication: safeStr(medication),
        instructions: safeStr(instructions),
        status: safeStr(status),
        quantity: quantity === null ? null : safeStr(quantity),
        refillsRemaining: refillsRemaining === null ? null : safeStr(refillsRemaining),
        nextRefill: nextRefill === null ? null : safeStr(nextRefill),
      };
    });
  }, [prescriptions]);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError("");
    try {
      const data = await lekuraxFetch("/api/v1/portal/prescriptions", { signal: ac.signal });
      const list = Array.isArray(data) ? data : data?.prescriptions ?? data?.items ?? [];
      setPrescriptions(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setPrescriptions([]);
      setError(e?.message ?? "Failed to load prescriptions");
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

  const requestRefill = useCallback(async (id) => {
    if (!id) return;
    setRefillById((prev) => ({ ...prev, [id]: { status: "loading", message: "" } }));
    try {
      const out = await lekuraxFetch("/api/v1/portal/refills", {
        method: "POST",
        body: { prescription_id: id },
      });
      const msg =
        (typeof out === "string" && out) ||
        out?.message ||
        out?.status ||
        "Refill request submitted.";
      setRefillById((prev) => ({ ...prev, [id]: { status: "success", message: safeStr(msg) } }));
    } catch (e) {
      setRefillById((prev) => ({
        ...prev,
        [id]: { status: "error", message: e?.message ?? "Failed to request refill" },
      }));
    }
  }, []);

  const statusId = "portal-prescriptions-status";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <PortalNav />
      <main className='container py-4' aria-busy={loading ? "true" : "false"}>
        <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
          <div>
            <h1 className='h4 mb-1' style={{ color: "#111" }}>
              Prescriptions
            </h1>
            <div id={statusId} className='text-secondary-light text-sm' role='status' aria-live='polite'>
              {loading ? "Loading…" : ""}
            </div>
          </div>
          <button type='button' className='btn btn-sm btn-primary' onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error ? (
          <div className='alert alert-danger' role='alert' aria-live='polite'>
            {error}
          </div>
        ) : null}

        {!loading && !error && normalized.length === 0 ? (
          <div className='card p-24 radius-12'>
            <div className='fw-semibold mb-1' style={{ color: "#111" }}>
              No prescriptions found
            </div>
            <p className='text-secondary-light text-sm mb-0'>
              If you believe this is a mistake, please contact your pharmacy or care team.
            </p>
          </div>
        ) : null}

        {normalized.length > 0 ? (
          <div className='card p-0 radius-12 overflow-hidden'>
            <div className='table-responsive'>
              <table className='table mb-0' style={{ minWidth: 820 }}>
                <thead className='table-light'>
                  <tr>
                    <th scope='col'>Medication</th>
                    <th scope='col'>Instructions</th>
                    <th scope='col'>Status</th>
                    <th scope='col'>Qty</th>
                    <th scope='col'>Refills</th>
                    <th scope='col'>Next refill</th>
                    <th scope='col' style={{ width: 210 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {normalized.map((p) => {
                    const refill = refillById[p.id] ?? { status: "idle", message: "" };
                    const busy = refill.status === "loading";
                    const msgId = `portal-refill-msg-${encodeURIComponent(p.id || "row")}`;
                    return (
                      <tr key={p.id || JSON.stringify(p.raw)}>
                        <td className='fw-semibold' style={{ color: "#111" }}>
                          <div>{p.medication}</div>
                          {p.id ? (
                            <div className='text-secondary-light text-xs' style={{ marginTop: 2 }}>
                              ID: {p.id}
                            </div>
                          ) : null}
                        </td>
                        <td className='text-sm'>{p.instructions}</td>
                        <td className='text-sm'>{p.status}</td>
                        <td className='text-sm'>{p.quantity ?? "—"}</td>
                        <td className='text-sm'>{p.refillsRemaining ?? "—"}</td>
                        <td className='text-sm'>{p.nextRefill ?? "—"}</td>
                        <td>
                          <div className='d-flex flex-column align-items-start gap-1'>
                            <button
                              type='button'
                              className='btn btn-sm btn-outline-primary'
                              onClick={() => requestRefill(p.id)}
                              disabled={!p.id || loading || busy}
                              aria-describedby={refill.message ? msgId : undefined}
                            >
                              {busy ? "Requesting…" : "Request refill"}
                            </button>
                            {refill.message ? (
                              <div
                                id={msgId}
                                className={`text-xs ${
                                  refill.status === "error" ? "text-danger" : "text-success"
                                }`}
                                role={refill.status === "error" ? "alert" : "status"}
                                aria-live='polite'
                              >
                                {refill.message}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

