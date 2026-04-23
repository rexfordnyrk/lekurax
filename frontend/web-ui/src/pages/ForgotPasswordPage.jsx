import React, { useState } from "react";
import ForgotPasswordLayer from "../components/ForgotPasswordLayer";
import { authzkit } from "../auth/authzkitClient";
import { userFacingAuthError } from "../auth/userFacingAuthError";

const ForgotPasswordPage = () => {
  const [tenantId, setTenantId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authzkit.auth.requestPasswordReset({
        identifier,
        tenant_id: tenantId,
      });
      setSent(true);
    } catch (err) {
      setError(userFacingAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ForgotPasswordLayer
      tenantId={tenantId}
      identifier={identifier}
      onTenantIdChange={setTenantId}
      onIdentifierChange={setIdentifier}
      onSubmit={handleSubmit}
      error={error}
      submitting={submitting}
      sent={sent}
    />
  );
};

export default ForgotPasswordPage;
