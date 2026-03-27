"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Download, Play, MessageSquare, X, Loader2, Maximize2, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { StudyPersonaList } from "@/components/studies/study-persona-list";
import { InterviewLiveBar } from "@/components/studies/interview-live-bar";
import { runBatchInterviews, getSessionMessages } from "@/app/(dashboard)/studies/actions";

interface PersonaGroup {
  groupId: string;
  groupName: string;
  personas: Array<{
    id: string;
    name: string;
    archetype: string | null;
    occupation: string | null;
    age: number | null;
    gender: string | null;
    groupName: string;
  }>;
}

interface FlowStepInterviewsProps {
  studyId: string;
  studyTitle: string;
  interviewGuide: string | null;
  personasByGroup: PersonaGroup[];
  personaSessionMap: Record<string, { sessionId: string; status: string }>;
  pendingCount: number;
  completedCount: number;
  totalCount: number;
  onComplete?: () => void;
  onRunningChange?: (running: boolean) => void;
  onGoToInsights?: () => void;
}

interface SelectedPersona {
  personaId: string;
  sessionId: string;
  name: string;
  archetype: string | null;
  occupation: string | null;
  age: number | null;
  isCompleted: boolean;
}

export function FlowStepInterviews({
  studyId,
  personasByGroup,
  personaSessionMap,
  pendingCount,
  completedCount,
  totalCount,
  onComplete,
  onRunningChange,
  onGoToInsights,
}: FlowStepInterviewsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<SelectedPersona | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([]);
  const [launching, setLaunching] = useState(false);

  const allDone = completedCount >= totalCount && totalCount > 0;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [livePersonaName, setLivePersonaName] = useState<string | null>(null);
  const [runningPersonaId, setRunningPersonaId] = useState<string | null>(null);

  // Auto-unlock insights when interviews are already complete on mount
  useEffect(() => {
    if (allDone && onComplete) {
      onComplete();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  // Auto-select the running persona during live interviews via SSE events
  useEffect(() => {
    if (!isRunning) return;
    const es = new EventSource(`/api/studies/${studyId}/live-status`);

    es.addEventListener("interview-start", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.personaName) {
          setLivePersonaName(data.personaName);
          const allPersonas = personasByGroup.flatMap((g) => g.personas);
          const persona = allPersonas.find((p) => p.name === data.personaName);
          if (persona) {
            setRunningPersonaId(persona.id);
            const session = personaSessionMap[persona.id];
            if (session) {
              handleSelectPersona(persona.id);
            }
          }
        }
      } catch { /* ignore */ }
    });

    es.addEventListener("interview-complete", (e) => {
      try {
        const data = JSON.parse(e.data);
        setRunningPersonaId(null);
        if (selectedPersona && data.personaName === selectedPersona.name) {
          handleSelectPersona(selectedPersona.personaId);
        }
      } catch { /* ignore */ }
    });

    es.addEventListener("all-done", () => {
      es.close();
    });

    return () => es.close();
  }, [isRunning, studyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for new messages while a persona's interview is running
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!selectedPersona || !isRunning || selectedPersona.isCompleted) return;

    pollingRef.current = setInterval(async () => {
      try {
        const result = await getSessionMessages(selectedPersona.sessionId);
        if (result.messages && result.messages.length > 0) {
          setChatMessages(result.messages);
        }
      } catch { /* ignore polling errors */ }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedPersona?.sessionId, selectedPersona?.isCompleted, isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length]);

  const handleAllDone = useCallback(() => {
    setIsRunning(false);
    onRunningChange?.(false);
    onComplete?.();

    // Celebration confetti!
    requestIdleCallback(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.6 },
      });
    });
  }, [onComplete, onRunningChange]);

  async function handleStartBatch() {
    setLaunching(true);

    // Small launch confetti
    requestIdleCallback(() => {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.9 },
      });
    });

    setTimeout(async () => {
      setLaunching(false);
      setIsRunning(true);
      onRunningChange?.(true);
      const result = await runBatchInterviews(studyId);
      if (result.error) {
        toast.error(result.error);
        setIsRunning(false);
        onRunningChange?.(false);
        return;
      }
      toast.success(`Starting ${result.pendingCount} interviews...`);
    }, 600);
  }

  async function handleSelectPersona(personaId: string) {
    const session = personaSessionMap[personaId];
    if (!session) return;

    const allPersonas = personasByGroup.flatMap((g) => g.personas);
    const persona = allPersonas.find((p) => p.id === personaId);
    if (!persona) return;

    setSelectedPersona({
      personaId,
      sessionId: session.sessionId,
      name: persona.name,
      archetype: persona.archetype,
      occupation: persona.occupation,
      age: persona.age,
      isCompleted: session.status === "COMPLETED",
    });

    setLoadingMessages(true);
    try {
      const result = await getSessionMessages(session.sessionId);
      setChatMessages(result.messages || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingMessages(false);
    }
  }

  const estimatedSecondsLow = Math.max(30, Math.ceil(totalCount * 10));
  const estimatedSecondsHigh = Math.max(60, Math.ceil(totalCount * 15));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Controls + Persona Grid */}
      <div className={cn("space-y-6", (selectedPersona || isRunning) ? "lg:col-span-3" : "lg:col-span-5")}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-lg font-semibold">Interviews</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {allDone
              ? "All interviews completed. Select a persona to view their transcript or ask follow-up questions."
              : isRunning
                ? "Interviews are running. Select a persona to watch their conversation live."
                : `${totalCount} personas ready. Review them below, then start all interviews.`}
          </p>
        </motion.div>

        {/* Action area */}
        {isRunning ? (
          <InterviewLiveBar
            studyId={studyId}
            totalCount={totalCount}
            initialCompleted={completedCount}
            onAllDone={handleAllDone}
            onGoToInsights={onGoToInsights}
          />
        ) : allDone ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  All {completedCount} interviews completed
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Select any persona to ask follow-up questions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {completedCount >= 2 && (
                  <Link
                    href={`/studies/${studyId}/compare`}
                    className="text-xs text-green-700 hover:text-green-900 transition-colors"
                  >
                    Compare
                  </Link>
                )}
                <a
                  href={`/api/studies/${studyId}/export`}
                  className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  CSV
                </a>
              </div>
            </div>
          </motion.div>
        ) : pendingCount > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-4">
              <motion.button
                onClick={handleStartBatch}
                disabled={launching}
                whileHover={{ scale: 1.03, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:bg-foreground/90"
              >
                <AnimatePresence mode="wait">
                  {launching ? (
                    <motion.span
                      key="launching"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Launching...
                    </motion.span>
                  ) : (
                    <motion.span
                      key="ready"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Run All Interviews ({totalCount})
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <p className="text-xs text-muted-foreground">
                Interviews run simultaneously in batches
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Usually completes in {estimatedSecondsLow < 60 ? `${estimatedSecondsLow}s` : `~${Math.ceil(estimatedSecondsLow / 60)} min`}-{estimatedSecondsHigh < 60 ? `${estimatedSecondsHigh}s` : `~${Math.ceil(estimatedSecondsHigh / 60)} min`}. Interviews run in parallel batches.
            </p>
          </motion.div>
        ) : null}

        {/* Persona Groups Grid */}
        {personasByGroup.map((group, gi) => (
          <motion.div
            key={group.groupId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.1, duration: 0.3 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{group.groupName}</span>
              <span className="text-xs text-muted-foreground">
                {group.personas.length} personas
              </span>
            </div>
            <StudyPersonaList
              personas={group.personas}
              studyId={studyId}
              personaSessionMap={personaSessionMap}
              onPersonaSelect={handleSelectPersona}
              selectedPersonaId={selectedPersona?.personaId}
              runningPersonaId={runningPersonaId}
            />
          </motion.div>
        ))}
      </div>

      {/* Right: Chat Preview Panel */}
      <AnimatePresence>
        {(selectedPersona || isRunning) && (
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <div className="sticky top-6 rounded-2xl border bg-background overflow-hidden flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
              {/* Panel header */}
              <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
                <AnimatePresence mode="wait">
                  {selectedPersona ? (
                    <motion.div
                      key={selectedPersona.personaId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold shrink-0">
                        {selectedPersona.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{selectedPersona.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[selectedPersona.archetype, selectedPersona.occupation].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="live-preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="min-w-0"
                    >
                      <p className="text-sm font-medium">Live Preview</p>
                      <p className="text-[10px] text-muted-foreground">
                        {livePersonaName ? `Interviewing ${livePersonaName}...` : "Waiting for interviews to start..."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedPersona && (
                    <Link
                      href={`/studies/${studyId}/${selectedPersona.sessionId}`}
                      scroll={false}
                      onClick={() => sessionStorage.setItem(`scroll:${studyId}`, String(window.scrollY))}
                      className="p-1.5 text-muted-foreground/50 hover:text-foreground rounded-md hover:bg-muted transition-colors"
                      title="Open full view"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={() => { setSelectedPersona(null); }}
                    className="p-1.5 text-muted-foreground/50 hover:text-foreground rounded-md hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : chatMessages.length > 0 ? (
                  <>
                    {chatMessages.map((msg, i) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: msg.role === "user" ? 30 : -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                        className={cn(
                          "flex",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                            msg.role === "user"
                              ? "bg-foreground text-background rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                    {/* Typing indicator during live interview */}
                    {isRunning && selectedPersona && !selectedPersona.isCompleted && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                ) : isRunning && !selectedPersona ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Interviews starting... Select a persona on the left or wait for auto-preview.
                    </p>
                  </div>
                ) : isRunning && selectedPersona && !selectedPersona.isCompleted ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Waiting for {selectedPersona.name}&apos;s interview to begin...
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {selectedPersona?.isCompleted
                        ? "Interview completed."
                        : "Select a persona to preview."}
                    </p>
                  </div>
                )}
              </div>

              {/* Sticky follow-up input */}
              {selectedPersona?.isCompleted && (
                <div className="border-t px-3 py-2.5 shrink-0">
                  <Link
                    href={`/studies/${studyId}/${selectedPersona.sessionId}`}
                    scroll={false}
                    onClick={() => sessionStorage.setItem(`scroll:${studyId}`, String(window.scrollY))}
                    className="flex items-center gap-2 w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors"
                  >
                    <Send className="h-3 w-3 shrink-0" />
                    Ask follow-up questions...
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
