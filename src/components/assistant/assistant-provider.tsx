"use client";

import { createContext, useContext, useState, useCallback } from "react";

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
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}
