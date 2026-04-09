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

type LiveStatusEventPayload = {
  personaId?: string;
  sessionId?: string;
  personaName?: string;
  completed?: number;
  quote?: string;
};

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
  "Setting up the interview room...",
  "Persona is reviewing the questions...",
  "Getting comfortable for the chat...",
  "Almost ready to start talking...",
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

/** Cartoon persona sitting at desk — fun idle illustration */
function CartoonPersonaIdle({ name }: { name?: string | null }) {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div className="relative flex flex-col items-center">
      {/* Desk scene */}
      <div className="relative w-32 h-28">
        {/* Persona body */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 flex flex-col items-center">
          {/* Head with face */}
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md animate-persona-breathe">
              {initial}
            </div>
            {/* Eyes that blink */}
            <div className="absolute top-[14px] left-[12px] flex gap-[10px]">
              <div className="h-1.5 w-1.5 rounded-full bg-white/80 animate-blink-eyes" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/80 animate-blink-eyes" style={{ animationDelay: "0.1s" }} />
            </div>
          </div>
          {/* Body */}
          <div className="h-6 w-10 bg-gradient-to-b from-indigo-400 to-indigo-500 rounded-b-lg -mt-1" />
        </div>

        {/* Desk */}
        <div className="absolute bottom-0 left-2 right-2 h-4 bg-amber-800/20 rounded-t-lg border-t-2 border-amber-700/30" />

        {/* Coffee cup on desk */}
        <div className="absolute bottom-4 right-6">
          <div className="h-4 w-3 bg-amber-100 rounded-b-sm border border-amber-300/50" />
          {/* Steam */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute -top-2 w-1 h-2 rounded-full bg-stone-300/40 animate-coffee-steam"
              style={{
                left: `${i * 4}px`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
        </div>

        {/* Notebook on desk */}
        <div className="absolute bottom-4 left-6">
          <div className="h-5 w-4 bg-white border border-stone-300/50 rounded-sm animate-notebook-write origin-bottom">
            {/* Lines */}
            <div className="mt-1 mx-0.5 space-y-0.5">
              <div className="h-px bg-blue-200/60 w-full" />
              <div className="h-px bg-blue-200/60 w-3/4" />
              <div className="h-px bg-blue-200/60 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Thought bubble typing indicator */
function ThoughtBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-start"
    >
      <div className="relative">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 animate-thought-wobble">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400/60 animate-bounce [animation-delay:0ms]" />
            <span className="h-2 w-2 rounded-full bg-purple-400/60 animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-indigo-400/60 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
        {/* Mini thought bubbles */}
        <div className="absolute -bottom-1 left-2 h-1.5 w-1.5 rounded-full bg-muted" />
        <div className="absolute -bottom-2.5 left-0.5 h-1 w-1 rounded-full bg-muted" />
      </div>
    </motion.div>
  );
}

/** Typewriter message — reveals text character by character */
function TypewriterMessage({ content, onComplete }: { content: string; onComplete?: () => void }) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    setDisplayedLength(0);
    completedRef.current = false;
  }, [content]);

  useEffect(() => {
    if (displayedLength >= content.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }
    const charDelay = content[displayedLength] === " " ? 15 : 25;
    const timer = setTimeout(() => setDisplayedLength((d) => d + 1), charDelay);
    return () => clearTimeout(timer);
  }, [displayedLength, content, onComplete]);

  const isComplete = displayedLength >= content.length;

  return (
    <span>
      {content.slice(0, displayedLength)}
      {!isComplete && <span className="inline-block w-0.5 h-3 bg-current ml-px animate-typewriter-cursor" />}
    </span>
  );
}

/** Progress mini-timeline showing question progress */
function QuestionTimeline({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex items-center gap-1 px-1">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < answered
              ? "bg-green-500 w-3"
              : i === answered
                ? "bg-indigo-400 w-2 animate-pulse"
                : "bg-muted w-1.5"
          )}
          initial={false}
          animate={i < answered ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        />
      ))}
      <span className="text-[9px] text-muted-foreground/60 ml-1 tabular-nums">
        {answered}/{total}
      </span>
    </div>
  );
}

/** Elapsed time counter */
function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="text-[10px] text-muted-foreground/50 tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
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
  const selectedPersonaRef = useRef<SelectedPersona | null>(null);
  const [livePersonaName, setLivePersonaName] = useState<string | null>(null);
  const [runningPersonaId, setRunningPersonaId] = useState<string | null>(null);
  const [interviewStartTime, setInterviewStartTime] = useState<number | null>(null);
  const [displayedMessages, setDisplayedMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string; isTyping?: boolean }>
  >([]);

  useEffect(() => {
    selectedPersonaRef.current = selectedPersona;
  }, [selectedPersona]);

  const queueIdle = useCallback((fn: () => void) => {
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(fn);
      return;
    }
    setTimeout(fn, 0);
  }, []);

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
        const data = JSON.parse(e.data) as LiveStatusEventPayload;
        if (data.personaName) {
          setLivePersonaName(data.personaName);
        }
        if (data.personaId && data.sessionId) {
          setRunningPersonaId(data.personaId);
          void selectPersonaWithSession({
            personaId: data.personaId,
            sessionId: data.sessionId,
            status: "RUNNING",
            fallbackName: data.personaName ?? null,
          });
        }
        if (typeof data.completed === "number") setLiveCompleted(data.completed);
      } catch { /* ignore */ }
    });

    es.addEventListener("interview-complete", (e) => {
      try {
        const data = JSON.parse(e.data) as LiveStatusEventPayload;
        if (typeof data.completed === "number") setLiveCompleted(data.completed);
        setRunningPersonaId(null);
        const currentSelection = selectedPersonaRef.current;
        if (
          currentSelection &&
          data.personaId === currentSelection.personaId &&
          data.sessionId
        ) {
          void selectPersonaWithSession({
            personaId: data.personaId,
            sessionId: data.sessionId,
            status: "COMPLETED",
            fallbackName: data.personaName ?? null,
          });
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

  // Sync chatMessages → displayedMessages with typewriter for new respondent messages
  useEffect(() => {
    if (chatMessages.length === 0) {
      setDisplayedMessages([]);
      prevMsgCountRef.current = 0;
      return;
    }

    const prevCount = prevMsgCountRef.current;
    const newMessages = chatMessages.slice(prevCount);

    if (newMessages.length === 0) return;

    // For initial load (many messages at once), show them all immediately
    if (prevCount === 0 && newMessages.length > 2) {
      setDisplayedMessages(chatMessages.map((m) => ({ ...m })));
      prevMsgCountRef.current = chatMessages.length;
      return;
    }

    // For live updates, add new messages — respondent messages get typewriter
    const updatedMessages = [...displayedMessages];
    for (const msg of newMessages) {
      updatedMessages.push({
        ...msg,
        isTyping: msg.role === "assistant" && isRunning,
      });
    }
    setDisplayedMessages(updatedMessages);
    prevMsgCountRef.current = chatMessages.length;
  }, [chatMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat to bottom when displayed messages update
  useEffect(() => {
    if (displayedMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayedMessages.length]);

  const handleAllDone = useCallback(() => {
    setIsRunning(false);
    onRunningChange?.(false);
    onComplete?.();

    if (!reduced) {
      queueIdle(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.6 },
        });
      });
    }
  }, [onComplete, onRunningChange, queueIdle, reduced]);

  async function handleStartBatch() {
    setLaunching(true);

    if (!reduced) {
      queueIdle(() => {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.9 },
        });
      });
    }

    const result = await runBatchInterviews(studyId);
    setLaunching(false);
    if (result.error) {
      toast.error(result.error);
      setIsRunning(false);
      onRunningChange?.(false);
      return;
    }
    setIsRunning(true);
    setInterviewStartTime(Date.now());
    onRunningChange?.(true);
    toast.success(`Starting ${result.pendingCount} interviews...`);
  }

  async function handleSelectPersona(personaId: string) {
    const session = personaSessionMap[personaId];
    if (!session) return;
    await selectPersonaWithSession({
      personaId,
      sessionId: session.sessionId,
      status: session.status === "COMPLETED" ? "COMPLETED" : "RUNNING",
    });
  }

  async function selectPersonaWithSession(args: {
    personaId: string;
    sessionId: string;
    status: "RUNNING" | "COMPLETED";
    fallbackName?: string | null;
  }) {
    const allPersonas = personasByGroup.flatMap((g) => g.personas);
    const persona = allPersonas.find((p) => p.id === args.personaId);
    if (!persona) return;

    // Reset previous message count when switching persona
    prevMsgCountRef.current = 0;

    setSelectedPersona({
      personaId: args.personaId,
      sessionId: args.sessionId,
      name: persona.name || args.fallbackName || "Persona",
      archetype: persona.archetype,
      occupation: persona.occupation,
      age: persona.age,
      isCompleted: args.status === "COMPLETED",
    });

    setLoadingMessages(true);
    try {
      const result = await getSessionMessages(args.sessionId);
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
            externalStatus={{
              completed: liveCompleted,
              currentPersona: livePersonaName,
              isDone: allDone,
            }}
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

      {/* Right: Live Interview Theater Panel */}
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
              {/* Panel header with gradient avatar */}
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
                      {/* Gradient avatar with speaking pulse */}
                      <motion.div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-bold shrink-0",
                          "bg-gradient-to-br from-indigo-500 to-purple-600",
                          isRunning && !selectedPersona.isCompleted
                            ? "animate-persona-speaking"
                            : selectedPersona.isCompleted
                              ? "ring-2 ring-green-400/50"
                              : ""
                        )}
                        initial={reduced ? false : { scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={safeSpring(400, 20, reduced)}
                      >
                        {selectedPersona.name.charAt(0)}
                      </motion.div>
                      <motion.div
                        className="min-w-0 flex-1"
                        initial={reduced ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: reduced ? 0 : 0.05, duration: 0.2 }}
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{selectedPersona.name}</p>
                          {isRunning && !selectedPersona.isCompleted && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-indigo-500 font-medium">
                              <span className="h-1 w-1 rounded-full bg-indigo-400 animate-pulse" />
                              LIVE
                            </span>
                          )}
                          {selectedPersona.isCompleted && (
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          )}
                        </div>
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">Live Preview</p>
                          {isRunning && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-red-500 font-medium">
                              <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
                              REC
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {livePersonaName ? `Interviewing ${livePersonaName}...` : "Waiting for interviews to start..."}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Elapsed timer */}
                  {isRunning && interviewStartTime && (
                    <ElapsedTimer startedAt={interviewStartTime} />
                  )}
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
                    onClick={() => { setSelectedPersona(null); setDisplayedMessages([]); }}
                    className="p-1.5 text-muted-foreground/50 hover:text-foreground rounded-md hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat messages — the theater */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <motion.div
                      animate={reduced ? undefined : { rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Loader2 className="h-5 w-5 text-indigo-400" />
                    </motion.div>
                    <p className="text-xs text-muted-foreground">Loading transcript...</p>
                  </div>
                ) : displayedMessages.length > 0 ? (
                  <>
                    {displayedMessages.map((msg, i) => (
                      <motion.div
                        key={msg.id}
                        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={safeSpring(300, 25, reduced)}
                        className={cn(
                          "flex gap-2",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {/* Respondent avatar */}
                        {msg.role === "assistant" && selectedPersona && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-[9px] font-bold shrink-0 mt-1">
                            {selectedPersona.name.charAt(0)}
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                            msg.role === "user"
                              ? "bg-foreground/90 text-background rounded-br-sm"
                              : "bg-muted/80 rounded-bl-sm border border-border/30"
                          )}
                        >
                          {msg.role === "user" && (
                            <div className="flex items-center gap-1 mb-1 opacity-60">
                              <Mic className="h-2.5 w-2.5" />
                              <span className="text-[9px] font-medium">Interviewer</span>
                            </div>
                          )}
                          {msg.isTyping ? (
                            <TypewriterMessage
                              content={msg.content}
                              onComplete={() => {
                                setDisplayedMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === msg.id ? { ...m, isTyping: false } : m
                                  )
                                );
                              }}
                            />
                          ) : (
                            msg.content
                          )}
                        </div>
                        {/* Interviewer icon */}
                        {msg.role === "user" && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-[9px] shrink-0 mt-1">
                            🎙️
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {/* Thought bubble typing indicator during live */}
                    {isRunning && selectedPersona && !selectedPersona.isCompleted && (
                      <ThoughtBubble />
                    )}
                    <div ref={chatEndRef} />
                  </>
                ) : isRunning && !selectedPersona ? (
                  /* Idle/waiting: cartoon persona + rotating status */
                  <div className="flex flex-col items-center justify-center py-8 gap-4">
                    {reduced ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
                    ) : (
                      <CartoonPersonaIdle name={livePersonaName} />
                    )}
                    <RotatingStatus />
                    <p className="text-[10px] text-muted-foreground/50">
                      Select a persona on the left to watch live
                    </p>
                  </div>
                ) : isRunning && selectedPersona && !selectedPersona.isCompleted && displayedMessages.length === 0 ? (
                  /* Waiting for specific persona — cartoon version */
                  <div className="flex flex-col items-center justify-center py-8 gap-4">
                    {reduced ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
                    ) : (
                      <CartoonPersonaIdle name={selectedPersona.name} />
                    )}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground text-center"
                    >
                      <span className="font-medium">{selectedPersona.name}</span> is getting ready...
                    </motion.p>
                  </div>
                ) : selectedPersona?.isCompleted && displayedMessages.length === 0 ? (
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
                  /* Default empty state — cartoon */
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    {reduced ? (
                      <MessageSquare className="h-5 w-5 text-muted-foreground/30" />
                    ) : (
                      <CartoonPersonaIdle name={null} />
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      {selectedPersona?.isCompleted
                        ? "Interview completed."
                        : "Select a persona to watch the interview live."}
                    </p>
                  </div>
                )}
              </div>

              {/* Question progress timeline */}
              {selectedPersona && displayedMessages.length > 0 && (
                <div className="border-t px-3 py-2 shrink-0">
                  <QuestionTimeline
                    answered={Math.floor(displayedMessages.filter((m) => m.role === "user").length)}
                    total={Math.max(
                      displayedMessages.filter((m) => m.role === "user").length,
                      10
                    )}
                  />
                </div>
              )}

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
