"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ChatView = "chat" | "history";

interface AssistantContextType {
  // Chat panel
  isOpen: boolean;
  isDisabled: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setDisabled: (disabled: boolean) => void;
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  // Chat state
  chatView: ChatView;
  setChatView: (view: ChatView) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  startNewChat: () => void;
  // Autopilot overlay state (agent-driven UI flow)
  autopilot: {
    active: boolean;
    title: string;
    detail?: string;
    progress?: { completed: number; total: number };
    status: "running" | "done" | "error";
  };
  startAutopilot: (title: string, detail?: string) => void;
  updateAutopilot: (update: {
    title?: string;
    detail?: string;
    progress?: { completed: number; total: number };
    status?: "running" | "done" | "error";
  }) => void;
  finishAutopilot: (detail?: string) => void;
  failAutopilot: (detail?: string) => void;
  clearAutopilot: () => void;
}

const AssistantContext = createContext<AssistantContextType>({
  isOpen: false,
  isDisabled: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
  setDisabled: () => {},
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  chatView: "chat",
  setChatView: () => {},
  conversationId: null,
  setConversationId: () => {},
  startNewChat: () => {},
  autopilot: {
    active: false,
    title: "",
    status: "running",
  },
  startAutopilot: () => {},
  updateAutopilot: () => {},
  finishAutopilot: () => {},
  failAutopilot: () => {},
  clearAutopilot: () => {},
});

export function useAssistant() {
  return useContext(AssistantContext);
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatView, setChatView] = useState<ChatView>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState<AssistantContextType["autopilot"]>({
    active: false,
    title: "",
    status: "running",
  });

  const toggle = useCallback(() => {
    if (isDisabled) return;
    setIsOpen((p) => {
      setSidebarCollapsed(!p); // open assistant → collapse sidebar, close → expand
      return !p;
    });
  }, [isDisabled]);
  const open = useCallback(() => {
    if (isDisabled) return;
    setIsOpen(true);
    setSidebarCollapsed(true);
  }, [isDisabled]);
  const close = useCallback(() => {
    setIsOpen(false);
    setSidebarCollapsed(false);
  }, []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setChatView("chat");
  }, []);

  const startAutopilot = useCallback((title: string, detail?: string) => {
    setAutopilot({
      active: true,
      title,
      detail,
      status: "running",
    });
  }, []);

  const updateAutopilot = useCallback(
    (update: {
      title?: string;
      detail?: string;
      progress?: { completed: number; total: number };
      status?: "running" | "done" | "error";
    }) => {
      setAutopilot((prev) => ({
        ...prev,
        active: true,
        ...update,
      }));
    },
    []
  );

  const finishAutopilot = useCallback((detail?: string) => {
    setAutopilot((prev) => ({
      ...prev,
      active: true,
      status: "done",
      detail: detail ?? prev.detail,
    }));
  }, []);

  const failAutopilot = useCallback((detail?: string) => {
    setAutopilot((prev) => ({
      ...prev,
      active: true,
      status: "error",
      detail: detail ?? prev.detail,
    }));
  }, []);

  const clearAutopilot = useCallback(() => {
    setAutopilot({
      active: false,
      title: "",
      status: "running",
    });
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        isDisabled,
        toggle,
        open,
        close,
        setDisabled: setIsDisabled,
        sidebarCollapsed,
        toggleSidebar,
        chatView,
        setChatView,
        conversationId,
        setConversationId,
        startNewChat,
        autopilot,
        startAutopilot,
        updateAutopilot,
        finishAutopilot,
        failAutopilot,
        clearAutopilot,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}
