import React, { createContext, useContext, useEffect, useState } from "react";
import { authzkit } from "./authzkitClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        if (!authzkit.isAuthenticated) {
          if (!cancelled) {
            setMe(null);
          }
          return;
        }

        const result = await authzkit.users.getMe();
        if (!cancelled) {
          setMe(result);
        }
      } catch (error) {
        if (!cancelled) {
          setMe(null);
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    bootstrapping,
    me,
    // Read directly from the SDK so it stays current on re-render.
    isAuthenticated: authzkit.isAuthenticated,
    async refreshMe() {
      const result = await authzkit.users.getMe();
      setMe(result);
      return result;
    },
    async logout() {
      await authzkit.auth.logout();
      setMe(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
