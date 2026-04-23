import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getActiveBranchId as readStored,
  clearActiveBranchId as clearStored,
  setActiveBranchId as writeStored,
} from "./branchStorage";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { me } = useAuth();
  const accessibleBranches = me?.accessible_branches;
  const [activeBranchId, setActiveBranchIdState] = useState(null);
  const [branchSwitchGeneration, setBranchSwitchGeneration] = useState(0);

  useEffect(() => {
    const list = accessibleBranches ?? [];
    if (!list.length) {
      clearStored();
      setActiveBranchIdState(null);
      return;
    }
    const stored = readStored();
    const valid = stored && list.some((b) => b.id === stored);
    if (!valid) {
      const first = list[0].id;
      writeStored(first);
      setActiveBranchIdState(first);
    } else {
      setActiveBranchIdState(stored);
    }
  }, [accessibleBranches]);

  const setActiveBranchId = useCallback(
    (id) => {
      if (!id) {
        return;
      }
      const list = accessibleBranches ?? [];
      if (!list.length || !list.some((b) => b.id === id)) {
        return;
      }
      if (id === activeBranchId) {
        return;
      }
      writeStored(id);
      setActiveBranchIdState(id);
      setBranchSwitchGeneration((g) => g + 1);
    },
    [accessibleBranches, activeBranchId]
  );

  const value = {
    activeBranchId,
    setActiveBranchId,
    branchSwitchGeneration,
    accessibleBranches: accessibleBranches ?? [],
  };

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranch() {
  const value = useContext(BranchContext);

  if (!value) {
    throw new Error("useBranch must be used within BranchProvider");
  }

  return value;
}
