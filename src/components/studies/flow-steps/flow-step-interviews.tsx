"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Download, Play, MessageSquare, X, Loader2, Maximize2, Send, CheckCircle2, Mic } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useReducedMotion, safeSpring } from "@/lib/hooks/use-reduced-motion";
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

/** Waveform bars for idle/waiting state */
function WaveformIndicator() {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 rounded-full bg-muted-foreground/30"
          style={{
            height: "100%",
            transformOrigin: "bottom",
            animation: `waveform-bar 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** Sound wave rings for waiting state */
function SoundWaveRings() {
  return (
    <div className="relative h-12 w-12 mx-auto mb-3">
      <div className="absolute inset-0 flex items-center justify-center">
        <Mic className="h-4 w-4 text-muted-foreground/40" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-muted-foreground/15"
          style={{
            animation: `sound-wave 2.4s ease-out ${i * 0.8}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** SVG checkmark that draws itself */
function DrawCheckmark() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2">
      <circle cx="12" cy="12" r="10" className="stroke-green-500" strokeWidth="1.5" opacity="0.2" />
      <motion.circle
        cx="12" cy="12" r="10"
        className="stroke-green-500"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <path
        d="M8 12.5l2.5 2.5 5-5"
        className="stroke-green-500"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{
          strokeDasharray: 20,
          animation: "checkmark-svg-draw 0.4s ease-out 0.4s both",
        }}
      />
    </svg>
  );
}

/** Rotating status text for idle preview */
const IDLE_MESSAGES = [
  "Connecting to interview engine...",
  "Preparing interview questions...",
  "Waiting for first response...",
];

function RotatingStatus() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % IDLE_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="text-xs text-muted-foreground"
      >
        {IDLE_MESSAGES[index]}
      </motion.p>
    </AnimatePresence>
  );
}

/** Mini progress arc SVG */
function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-1.5">
      <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0 -rotate-90">
        <circle cx="12" cy="12" r={radius} fill="none" className="stroke-muted" strokeWidth="2" />
        <motion.circle
          cx="12" cy="12" r={radius}
          fill="none"
          className="stroke-green-500"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      <span className="text-[10px] text-muted-foreground tabular-nums">{completed}/{total}</span>
    </div>
  );
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
  const reduced = useReducedMotion();
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<SelectedPersona | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([]);
  const [launching, setLaunching] = useState(false);
  const [liveCompleted, setLiveCompleted] = useState(completedCount);

  const allDone = (liveCompleted >= totalCount || completedCount >= totalCount) && totalCount > 0;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const [livePersonaName, setLivePersonaName] = useState<string | null>(null);
  const [runningPersonaId, setRunningPersonaId] = useState<string | null>(null);

  // Persist completed count to sessionStorage so it survives navigation
  useEffect(() => {
    const stored = sessionStorage.getItem(`interviews-completed:${studyId}`);
    if (stored) {
      const val = parseInt(stored, 10);
      if (val > liveCompleted) setLiveCompleted(val);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (liveCompleted > 0) {
      sessionStorage.setItem(`interviews-completed:${studyId}`, String(liveCompleted));
    }
  }, [liveCompleted, studyId]);

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
        if (typeof data.completed === "number") setLiveCompleted(data.completed);
      } catch { /* ignore */ }
    });

    es.addEventListener("interview-complete", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.completed === "number") setLiveCompleted(data.completed);
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
    // Track previous message count for stagger animation
    prevMsgCountRef.current = chatMessages.length;
  }, [chatMessages.length]);

  const handleAllDone = useCallback(() => {
    setIsRunning(false);
    onRunningChange?.(false);
    onComplete?.();

    if (!reduced) {
      requestIdleCallback(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.6 },
        });
      });
    }
  }, [onComplete, onRunningChange, reduced]);

  async function handleStartBatch() {
    setLaunching(true);

    if (!reduced) {
      requestIdleCallback(() => {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.9 },
        });
      });
    }

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

    // Reset previous message count when switching persona
    prevMsgCountRef.current = 0;

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
          initial={reduced ? false : { opacity: 0, y: 12 }}
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
            initialCompleted={liveCompleted}
            onAllDone={handleAllDone}
            onGoToInsights={onGoToInsights}
          />
        ) : allDone ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={safeSpring(300, 25, reduced)}
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  All {liveCompleted} interviews completed
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Select any persona to ask follow-up questions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {liveCompleted >= 2 && (
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
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-4">
              <motion.button
                onClick={handleStartBatch}
                disabled={launching}
                whileHover={reduced ? undefined : { scale: 1.03, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                whileTap={reduced ? undefined : { scale: 0.95 }}
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
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : gi * 0.1, duration: 0.3 }}
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
            initial={reduced ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={safeSpring(300, 25, reduced)}
          >
            <div className="sticky top-6 rounded-2xl border bg-background overflow-hidden flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
              {/* Panel header */}
              <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
                <AnimatePresence mode="wait">
                  {selectedPersona ? (
                    <motion.div
                      key={selectedPersona.personaId}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <motion.div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold shrink-0"
                        initial={reduced ? false : { scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={safeSpring(400, 20, reduced)}
                      >
                        {selectedPersona.name.charAt(0)}
                      </motion.div>
                      <motion.div
                        className="min-w-0"
                        initial={reduced ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: reduced ? 0 : 0.05, duration: 0.2 }}
                      >
                        <p className="text-sm font-medium truncate">{selectedPersona.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[selectedPersona.archetype, selectedPersona.occupation].filter(Boolean).join(" · ")}
                        </p>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="live-preview"
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      {isRunning && !reduced && <WaveformIndicator />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Live Preview</p>
                        <p className="text-[10px] text-muted-foreground">
                          {livePersonaName ? `Interviewing ${livePersonaName}...` : "Waiting for interviews to start..."}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Progress ring */}
                  {isRunning && totalCount > 0 && (
                    <ProgressRing completed={liveCompleted} total={totalCount} />
                  )}
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
                    {chatMessages.map((msg, i) => {
                      // Only animate new messages, not the ones that were already there
                      const isNew = i >= prevMsgCountRef.current;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={reduced || !isNew ? false : { opacity: 0, scale: 0.95, x: msg.role === "user" ? 20 : -20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          transition={isNew ? safeSpring(300, 25, reduced) : { duration: 0 }}
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
                      );
                    })}
                    {/* Typing indicator during live interview */}
                    {isRunning && selectedPersona && !selectedPersona.isCompleted && (
                      <motion.div
                        initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </motion.div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                ) : isRunning && !selectedPersona ? (
                  /* Idle/waiting: sound wave rings + rotating status */
                  <div className="flex flex-col items-center justify-center py-12">
                    {reduced ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30 mb-3" />
                    ) : (
                      <SoundWaveRings />
                    )}
                    <RotatingStatus />
                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                      Select a persona on the left to watch live
                    </p>
                  </div>
                ) : isRunning && selectedPersona && !selectedPersona.isCompleted ? (
                  /* Waiting for a specific persona to start */
                  <div className="flex flex-col items-center justify-center py-12">
                    {reduced ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30 mb-3" />
                    ) : (
                      <SoundWaveRings />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Waiting for {selectedPersona.name}&apos;s interview to begin...
                    </p>
                  </div>
                ) : selectedPersona?.isCompleted && chatMessages.length === 0 ? (
                  /* Completed state with draw checkmark */
                  <div className="flex flex-col items-center justify-center py-12">
                    {reduced ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500 mb-2" />
                    ) : (
                      <DrawCheckmark />
                    )}
                    <p className="text-sm font-medium text-green-700 mb-1">Interview complete</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Open the full view to read the transcript
                    </p>
                    {selectedPersona && (
                      <Link
                        href={`/studies/${studyId}/${selectedPersona.sessionId}`}
                        scroll={false}
                        onClick={() => sessionStorage.setItem(`scroll:${studyId}`, String(window.scrollY))}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
                      >
                        View full transcript
                        <motion.span
                          animate={reduced ? undefined : { x: [0, 3, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                          →
                        </motion.span>
                      </Link>
                    )}
                  </div>
                ) : (
                  /* Default empty state */
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div
                      animate={reduced ? undefined : { y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    >
                      <MessageSquare className="h-5 w-5 text-muted-foreground/30 mb-2" />
                    </motion.div>
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
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t px-3 py-2.5 shrink-0"
                >
                  <Link
                    href={`/studies/${studyId}/${selectedPersona.sessionId}`}
                    scroll={false}
                    onClick={() => sessionStorage.setItem(`scroll:${studyId}`, String(window.scrollY))}
                    className="flex items-center gap-2 w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors"
                  >
                    <Send className="h-3 w-3 shrink-0" />
                    Ask follow-up questions...
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
