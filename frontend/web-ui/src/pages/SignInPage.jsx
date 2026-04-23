import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SignInLayer from "../components/SignInLayer";
import { authzkit } from "../auth/authzkitClient";
import { useAuth } from "../auth/AuthContext";
import { userFacingAuthError } from "../auth/userFacingAuthError";

const SignInPage = () => {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await authzkit.auth.login({
        identifier,
        password,
        tenant_id: tenantId,
      });
      if (result.mfa_required) {
        setError(
          "Additional verification is required for this account. Use your authenticator app or contact your administrator."
        );
        return;
      }
      try {
        await refreshMe();
        navigate("/");
      } catch (err) {
        // Avoid leaving the app in a half-authenticated state (token present, no profile loaded).
        if (authzkit.isAuthenticated) {
          try {
            await authzkit.auth.logout();
          } catch {
            // ignore logout failures; we'll still show a generic error
          }
        }
        setError(userFacingAuthError(err));
      }
    } catch (err) {
      setError(userFacingAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SignInLayer
      tenantId={tenantId}
      identifier={identifier}
      password={password}
      onTenantIdChange={setTenantId}
      onIdentifierChange={setIdentifier}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      error={error}
      submitting={submitting}
    />
  );
};

export default SignInPage;
