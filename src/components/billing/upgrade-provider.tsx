"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type UpgradeContextType = {
  isOpen: boolean;
  openUpgrade: (reason?: string) => void;
  closeUpgrade: () => void;
  reason: string | null;
};

const UpgradeContext = createContext<UpgradeContextType>({
  isOpen: false,
  openUpgrade: () => {},
  closeUpgrade: () => {},
  reason: null,
});

export function useUpgrade() {
  return useContext(UpgradeContext);
}

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const openUpgrade = useCallback((nextReason?: string) => {
    setReason(nextReason ?? null);
    setIsOpen(true);
  }, []);

  const closeUpgrade = useCallback(() => {
    setIsOpen(false);
    setReason(null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openUpgrade,
      closeUpgrade,
      reason,
    }),
    [isOpen, openUpgrade, closeUpgrade, reason]
  );

  return <UpgradeContext.Provider value={value}>{children}</UpgradeContext.Provider>;
}
