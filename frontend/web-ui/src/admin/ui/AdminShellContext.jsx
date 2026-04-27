import React, { createContext, useContext, useMemo, useState } from "react";

const AdminShellContext = createContext({
  headerActions: null,
  setHeaderActions: () => {},
});

export function AdminShellProvider({ children }) {
  const [headerActions, setHeaderActions] = useState(null);
  const value = useMemo(
    () => ({ headerActions, setHeaderActions }),
    [headerActions],
  );
  return (
    <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>
  );
}

export function useAdminShell() {
  return useContext(AdminShellContext);
}
