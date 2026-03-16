"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface AssistantContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const AssistantContext = createContext<AssistantContextType>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
});

export function useAssistant() {
  return useContext(AssistantContext);
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <AssistantContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </AssistantContext.Provider>
  );
}
