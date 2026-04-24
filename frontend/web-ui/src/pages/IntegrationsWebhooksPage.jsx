import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { lekuraxFetch } from "../api/lekuraxApi";

const EVENT_OPTIONS = [
  { key: "sale.created", label: "Sale created" },
  { key: "rx.dispensed", label: "Rx dispensed" },
  { key: "claim.submitted", label: "Claim submitted" },
];

function maskSecret(s) {
  if (!s) return "••••••••••••••••";
  const str = String(s);
  if (str.length <= 8) return "••••••••";
  return `${"•".repeat(Math.min(12, str.length - 4))}${str.slice(-4)}`;
}

function normalizeWebhookItems(payload) {
  const items = payload?.items ?? payload ?? [];
  return Array.isArray(items) ? items : [];
}

const IntegrationsWebhooksPage = () => {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const [loading, setLoading] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [savingEvents, setSavingEvents] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [rotateSecret, setRotateSecret] = useState(false);

  const [eventKeys, setEventKeys] = useState(() => new Set());

  const [knownSecretByWebhookId, setKnownSecretByWebhookId] = useState({});

  const selected = useMemo(() => {
    return items.find((w) => String(w.id) === String(selectedId)) ?? null;
  }, [items, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await lekuraxFetch("/api/v1/integrations/webhooks");
      const hooks = normalizeWebhookItems(data);
      setItems(hooks);
      const nextSelected =
        selectedId && hooks.some((w) => String(w.id) === String(selectedId))
          ? selectedId
          : hooks[0]?.id
          ? String(hooks[0].id)
          : "";
      setSelectedId(nextSelected);
    } catch (e) {
      setError(e?.message ?? "Failed to load webhooks");
      setItems([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSuccess("");
    setError("");
    if (!selected) {
      setUrl("");
      setEnabled(true);
      setRotateSecret(false);
      setEventKeys(new Set());
      return;
    }
    setUrl(selected.url ?? "");
    setEnabled(Boolean(selected.enabled));
    setRotateSecret(false);
    setEventKeys(new Set((selected.events ?? []).map(String)));
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const secretDisplay = useMemo(() => {
    if (!selected) return "";
    const known = knownSecretByWebhookId[String(selected.id)];
    if (known) return known;
    if (typeof selected.secret === "string" && selected.secret) return selected.secret;
    return "";
  }, [knownSecretByWebhookId, selected]);

  const onSubmitWebhook = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSavingWebhook(true);
    try {
      const body = {
        url,
        enabled,
      };
      if (rotateSecret) {
        body.secret = "";
      }
      const out = await lekuraxFetch("/api/v1/integrations/webhooks", {
        method: "POST",
        body,
      });
      if (out?.id) {
        const id = String(out.id);
        if (typeof out.secret === "string" && out.secret) {
          setKnownSecretByWebhookId((prev) => ({ ...prev, [id]: out.secret }));
        }
      }
      setSuccess("Webhook saved.");
      await load();
      setRotateSecret(false);
    } catch (err) {
      setError(err?.message ?? "Save failed");
    } finally {
      setSavingWebhook(false);
    }
  };

  const toggleEvent = (k, checked) => {
    setEventKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(k);
      else next.delete(k);
      return next;
    });
  };

  const onSaveEvents = async () => {
    if (!selected?.id) return;
    setError("");
    setSuccess("");
    setSavingEvents(true);
    try {
      await lekuraxFetch(`/api/v1/integrations/webhooks/${selected.id}/events`, {
        method: "POST",
        body: { event_keys: Array.from(eventKeys) },
      });
      setSuccess("Event subscriptions updated.");
      await load();
    } catch (err) {
      setError(err?.message ?? "Failed to update events");
    } finally {
      setSavingEvents(false);
    }
  };

  const onCopySecret = async () => {
    if (!secretDisplay) return;
    try {
      await navigator.clipboard.writeText(secretDisplay);
      setSuccess("Secret copied to clipboard.");
    } catch {
      setError("Copy failed (clipboard not available).");
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Integrations / Webhooks' />
      <div className='dashboard-main-body'>
        <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
          <div>
            <h5 className='mb-1'>Outbound webhooks</h5>
            <p className='text-sm text-secondary-light mb-0'>
              Configure where Lekurax sends signed event payloads for your tenant.
            </p>
          </div>
          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={() => load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className='alert alert-danger' role='alert'>
            {error}
          </div>
        ) : null}
        {success ? (
          <div className='alert alert-success' role='alert'>
            {success}
          </div>
        ) : null}

        <div className='row gy-4'>
          <div className='col-xl-5'>
            <div className='card p-24 radius-12'>
              <div className='d-flex align-items-center justify-content-between mb-3'>
                <h6 className='mb-0'>Create / update webhook</h6>
                {selected ? (
                  <span className='badge bg-neutral-100 text-secondary-light'>
                    Active: {String(selected.id).slice(0, 8)}
                  </span>
                ) : (
                  <span className='badge bg-neutral-100 text-secondary-light'>
                    No webhook
                  </span>
                )}
              </div>

              <form onSubmit={onSubmitWebhook}>
                <div className='mb-3'>
                  <label className='form-label' htmlFor='webhook-url'>
                    Webhook URL
                  </label>
                  <input
                    id='webhook-url'
                    className='form-control'
                    value={url}
                    onChange={(ev) => setUrl(ev.target.value)}
                    placeholder='https://example.com/lekurax/webhook'
                    autoComplete='off'
                    inputMode='url'
                    required
                  />
                  <div className='form-text'>
                    Must be HTTPS (or HTTP for local testing). Credentials in URL are rejected.
                  </div>
                </div>

                <div className='d-flex flex-wrap gap-3 mb-3'>
                  <label className='form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      checked={enabled}
                      onChange={(ev) => setEnabled(ev.target.checked)}
                    />
                    <span className='form-check-label ms-2'>Enabled</span>
                  </label>
                  <label className='form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      checked={rotateSecret}
                      onChange={(ev) => setRotateSecret(ev.target.checked)}
                    />
                    <span className='form-check-label ms-2'>Rotate secret on save</span>
                  </label>
                </div>

                <div className='mb-3'>
                  <label className='form-label' htmlFor='webhook-secret'>
                    Signing secret
                  </label>
                  <div className='input-group'>
                    <input
                      id='webhook-secret'
                      className='form-control'
                      value={secretDisplay ? secretDisplay : maskSecret("")}
                      readOnly
                      aria-describedby='webhook-secret-help'
                    />
                    <button
                      type='button'
                      className='btn btn-outline-secondary'
                      onClick={onCopySecret}
                      disabled={!secretDisplay}
                    >
                      Copy
                    </button>
                  </div>
                  <div id='webhook-secret-help' className='form-text'>
                    The full secret is shown after you save (if returned) and can be copied once.
                  </div>
                </div>

                <button
                  type='submit'
                  className='btn btn-primary w-100'
                  disabled={savingWebhook}
                >
                  {savingWebhook ? "Saving…" : "Save webhook"}
                </button>
              </form>
            </div>

            <div className='card p-24 radius-12 mt-4'>
              <h6 className='mb-3'>Event subscriptions</h6>
              {!selected ? (
                <p className='text-sm text-secondary-light mb-0'>
                  Create a webhook first to configure subscribed events.
                </p>
              ) : (
                <>
                  <p className='text-sm text-secondary-light mb-3'>
                    Select which events should be delivered to this webhook.
                  </p>
                  <div className='d-grid gap-2 mb-3'>
                    {EVENT_OPTIONS.map((opt) => (
                      <label key={opt.key} className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          checked={eventKeys.has(opt.key)}
                          onChange={(ev) => toggleEvent(opt.key, ev.target.checked)}
                        />
                        <span className='form-check-label ms-2'>
                          <span className='fw-semibold'>{opt.key}</span>{" "}
                          <span className='text-secondary-light'>— {opt.label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    type='button'
                    className='btn btn-outline-primary w-100'
                    onClick={onSaveEvents}
                    disabled={savingEvents}
                  >
                    {savingEvents ? "Saving…" : "Save event subscriptions"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className='col-xl-7'>
            <div className='card p-24 radius-12'>
              <div className='d-flex align-items-center justify-content-between mb-3'>
                <h6 className='mb-0'>Existing webhooks</h6>
                <span className='text-sm text-secondary-light'>
                  {items.length} total
                </span>
              </div>

              <div className='table-responsive'>
                <table className='table table-hover mb-0'>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }} />
                      <th>URL</th>
                      <th>Enabled</th>
                      <th>Subscribed events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((w) => {
                      const isActive = String(w.id) === String(selectedId);
                      const events = Array.isArray(w.events) ? w.events : [];
                      return (
                        <tr key={w.id} className={isActive ? "table-active" : ""}>
                          <td>
                            <input
                              type='radio'
                              name='activeWebhook'
                              aria-label={`Select webhook ${String(w.id).slice(0, 8)}`}
                              checked={isActive}
                              onChange={() => setSelectedId(String(w.id))}
                            />
                          </td>
                          <td className='text-truncate' style={{ maxWidth: 360 }}>
                            <span className='fw-semibold'>{w.url ?? "—"}</span>
                            <div className='text-xs text-secondary-light'>
                              ID: {String(w.id).slice(0, 8)}…{" "}
                              {w.created_at
                                ? String(w.created_at).replace("T", " ").slice(0, 19)
                                : ""}
                            </div>
                          </td>
                          <td>{w.enabled ? "Yes" : "No"}</td>
                          <td>
                            {events.length ? (
                              <div className='d-flex flex-wrap gap-1'>
                                {events.map((k) => (
                                  <span key={k} className='badge bg-neutral-100 text-secondary-light'>
                                    {k}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className='text-secondary-light'>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!items.length && !loading ? (
                <p className='text-sm text-secondary-light mt-3 mb-0'>
                  No webhooks configured yet.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default IntegrationsWebhooksPage;

