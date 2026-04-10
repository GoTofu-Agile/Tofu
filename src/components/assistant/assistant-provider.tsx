"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

type ChatView = "chat" | "history";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatView, setChatView] = useState<ChatView>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState<AssistantContextType["autopilot"]>({
    active: false,
    title: "",
    status: "running",
  });

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-no-assistant-shortcut='true']")) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

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
