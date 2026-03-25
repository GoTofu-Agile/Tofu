"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ChatView = "chat" | "history";

export type AssistantAutopilotState = {
  active: boolean;
  status: "running" | "done" | "error";
  title?: string;
  detail?: string;
  progress?: { completed: number; total: number };
};

const INACTIVE_AUTOPILOT: AssistantAutopilotState = {
  active: false,
  status: "done",
};

interface AssistantContextType {
  // Chat panel
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  // Chat state
  chatView: ChatView;
  setChatView: (view: ChatView) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  startNewChat: () => void;
  /** Reserved for future autopilot UX; inactive by default. */
  autopilot: AssistantAutopilotState;
}

const AssistantContext = createContext<AssistantContextType>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  chatView: "chat",
  setChatView: () => {},
  conversationId: null,
  setConversationId: () => {},
  startNewChat: () => {},
  autopilot: INACTIVE_AUTOPILOT,
});

export function useAssistant() {
  return useContext(AssistantContext);
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatView, setChatView] = useState<ChatView>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const toggle = useCallback(() => {
    setIsOpen((p) => {
      setSidebarCollapsed(!p); // open assistant → collapse sidebar, close → expand
      return !p;
    });
  }, []);
  const open = useCallback(() => {
    setIsOpen(true);
    setSidebarCollapsed(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setSidebarCollapsed(false);
  }, []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setChatView("chat");
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        toggle,
        open,
        close,
        sidebarCollapsed,
        toggleSidebar,
        chatView,
        setChatView,
        conversationId,
        setConversationId,
        startNewChat,
        autopilot: INACTIVE_AUTOPILOT,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}
