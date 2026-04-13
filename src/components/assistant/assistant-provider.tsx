"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";

/** When true, Ask was explicitly closed/minimized and should stay closed on next visit until reopened. */
const ASK_PANEL_MINIMIZED_KEY = "gotofu.ask.panel.minimized";
const ASK_PANEL_PREF_VERSION_KEY = "gotofu.ask.panel.pref.version";
/** Bump when default-open / persistence rules change so clients re-apply once. */
const ASK_PANEL_PREF_VERSION = "2";
const ASK_PANEL_MINIMIZED_EVENT = "gotofu:ask-panel-minimized";

function readAskPanelMinimized(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ASK_PANEL_MINIMIZED_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeAskPanelMinimized(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(ASK_PANEL_MINIMIZED_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ASK_PANEL_MINIMIZED_EVENT, handler);
  };
}

function writeAskPanelMinimized(minimized: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (minimized) window.localStorage.setItem(ASK_PANEL_MINIMIZED_KEY, "true");
    else window.localStorage.removeItem(ASK_PANEL_MINIMIZED_KEY);
    window.dispatchEvent(new Event(ASK_PANEL_MINIMIZED_EVENT));
  } catch {
    // ignore quota / private mode
  }
}

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
  isOpen: true,
  toggle: () => {},
  open: () => {},
  close: () => {},
  sidebarCollapsed: true,
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
  const askPanelMinimized = useSyncExternalStore(
    subscribeAskPanelMinimized,
    readAskPanelMinimized,
    () => false
  );
  const isOpen = !askPanelMinimized;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatView, setChatView] = useState<ChatView>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState<AssistantContextType["autopilot"]>({
    active: false,
    title: "",
    status: "running",
  });

  const toggle = useCallback(() => {
    const closed = readAskPanelMinimized();
    if (closed) {
      writeAskPanelMinimized(false);
      setSidebarCollapsed(true);
    } else {
      writeAskPanelMinimized(true);
      setSidebarCollapsed(false);
    }
  }, []);
  const open = useCallback(() => {
    setSidebarCollapsed(true);
    writeAskPanelMinimized(false);
  }, []);
  const close = useCallback(() => {
    setSidebarCollapsed(false);
    writeAskPanelMinimized(true);
  }, []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  useEffect(() => {
    try {
      const ver = window.localStorage.getItem(ASK_PANEL_PREF_VERSION_KEY);
      if (ver === ASK_PANEL_PREF_VERSION) return;
      window.localStorage.removeItem(ASK_PANEL_MINIMIZED_KEY);
      window.localStorage.setItem(ASK_PANEL_PREF_VERSION_KEY, ASK_PANEL_PREF_VERSION);
      window.dispatchEvent(new Event(ASK_PANEL_MINIMIZED_EVENT));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!askPanelMinimized) return;
    queueMicrotask(() => setSidebarCollapsed(false));
  }, [askPanelMinimized]);

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
