import { AuthzKitApiError, AuthzKitNetworkError } from "@authzkit/client";

/**
 * Maps SDK errors to short, user-visible strings.
 * @param {unknown} err
 * @returns {string}
 */
export function userFacingAuthError(err) {
  if (err instanceof AuthzKitApiError) {
    if (err.status === 401) {
      return "Invalid credentials. Check your email or phone, password, and tenant.";
    }
    if (err.status === 404) {
      return "We could not find an account for that information.";
    }
    if (err.status === 409) {
      return err.message || "This action conflicts with the current state of your account.";
    }
    if (err.status === 422) {
      return err.message || "Please check your input and try again.";
    }
    if (err.status === 429) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    return err.message || "Something went wrong. Please try again.";
  }
  if (err instanceof AuthzKitNetworkError) {
    return "Network error. Check your connection and try again.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
