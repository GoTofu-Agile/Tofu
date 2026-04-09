"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  ChevronDown,
  Clock,
  Send,
  Minus,
  Maximize2,
  X,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InsightsProgress } from "@/components/studies/insights-progress";
import { ResultsSummary } from "@/components/studies/results-summary";
import { ResultsThemes } from "@/components/studies/results-themes";
import { ResultsQuotes } from "@/components/studies/results-quotes";
import { ResultsRecommendations } from "@/components/studies/results-recommendations";
import { readNDJSONStream } from "@/lib/streaming/ndjson";

interface Theme {
  name: string;
  description: string;
  frequency: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  personaNames?: string[];
}

interface KeyQuote {
  quote: string;
  personaName: string;
  context: string;
  theme: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  supportingEvidence: string;
}

interface SentimentBreakdown {
  overall: string;
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
}

interface Report {
  id?: string;
  summary: string | null;
  themes: unknown;
  keyFindings: unknown;
  sentimentBreakdown: unknown;
  recommendations: unknown;
  createdAt: Date;
}

const ANALYSIS_OPTIONS = [
  { id: "pain_points", label: "Pain Points" },
  { id: "sentiment", label: "Sentiment" },
  { id: "feature_priorities", label: "Feature Priorities" },
  { id: "behavior_patterns", label: "Behavior Patterns" },
  { id: "competitive_insights", label: "Competitive Insights" },
];

const INSIGHT_STEPS = [
  { key: "loading_transcripts", label: "Loading transcripts" },
  { key: "analyzing_themes", label: "Analyzing themes & sentiment" },
  { key: "extracting_quotes", label: "Extracting quotes & recommendations" },
  { key: "saving", label: "Saving report" },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ChatPanelMode = "open" | "minimized" | "closed";

interface FlowStepInsightsProps {
  studyId: string;
  completedCount: number;
  totalCount: number;
  avgDurationMs: number;
  reports: Report[];
  onReportGenerated?: () => void;
}

export function FlowStepInsights({
  studyId,
  completedCount,
  totalCount,
  avgDurationMs,
  reports,
  onReportGenerated,
}: FlowStepInsightsProps) {
  const router = useRouter();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([
    "pain_points",
    "sentiment",
  ]);
  const [streamPhase, setStreamPhase] = useState<
    "planning" | "streaming" | "done"
  >(reports.length > 0 ? "done" : "planning");
  const [showOptions, setShowOptions] = useState(false);
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  // Streaming state
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [stepDetails, setStepDetails] = useState<Record<string, string>>({});
  const [streamedThemes, setStreamedThemes] = useState<Theme[]>([]);
  const [streamedSentiment, setStreamedSentiment] =
    useState<SentimentBreakdown | null>(null);
  const [streamedQuotes, setStreamedQuotes] = useState<KeyQuote[]>([]);
  const [streamedRecommendations, setStreamedRecommendations] = useState<
    Recommendation[]
  >([]);
  const [streamedSummary, setStreamedSummary] = useState<string | null>(null);

  // Chat state for right panel
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPanelMode, setChatPanelMode] = useState<ChatPanelMode>("open");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const report = reports[activeReportIndex] ?? null;
  const estimatedInsightsSeconds = Math.max(20, Math.min(180, completedCount * 12));
  const showChatPanel = chatPanelMode === "open";

  function toggleOption(id: string) {
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  }

  async function handleGenerate(prompt?: string) {
    const effectivePrompt = prompt || undefined;
    setStreamPhase("streaming");
    setCurrentStep("loading_transcripts");
    setCompletedSteps(new Set());
    setStepDetails({});
    setStreamedThemes([]);
    setStreamedSentiment(null);
    setStreamedQuotes([]);
    setStreamedRecommendations([]);
    setStreamedSummary(null);
    setShowOptions(false);

    try {
      const res = await fetch(
        `/api/studies/${studyId}/generate-insights-stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysisTypes: selectedOptions,
            customPrompt: effectivePrompt,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }

      await readNDJSONStream(res, (event: Record<string, unknown>) => {
        switch (event.type) {
          case "step": {
            const step = event.step as string;
            if (event.status === "done") {
              setCompletedSteps((prev) => new Set([...prev, step]));
              if (event.detail) {
                setStepDetails((prev) => ({
                  ...prev,
                  [step]: event.detail as string,
                }));
              }
              const stepIndex = INSIGHT_STEPS.findIndex((s) => s.key === step);
              const nextStep = INSIGHT_STEPS[stepIndex + 1];
              if (nextStep) setCurrentStep(nextStep.key);
            } else {
              setCurrentStep(step);
            }
            break;
          }
          case "partial_themes":
            setStreamedThemes(event.themes as Theme[]);
            break;
          case "partial_sentiment":
            setStreamedSentiment(event.sentiment as SentimentBreakdown);
            break;
          case "partial_quotes":
            setStreamedQuotes(event.quotes as KeyQuote[]);
            break;
          case "partial_recommendations":
            setStreamedRecommendations(event.recommendations as Recommendation[]);
            break;
          case "summary":
            setStreamedSummary(event.text as string);
            break;
          case "done":
            setCompletedSteps(new Set(INSIGHT_STEPS.map((s) => s.key)));
            setCurrentStep(null);
            setStreamPhase("done");
            setActiveReportIndex(0);
            toast.success("Analysis complete!");
            onReportGenerated?.();
            router.refresh();
            break;
          case "error":
            throw new Error(event.message as string);
        }
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate insights"
      );
      setStreamPhase(reports.length > 0 ? "done" : "planning");
      setCurrentStep(null);
    }
  }

  async function handleChatSend(directMessage?: string) {
    const userMessage = directMessage?.trim() || chatInput.trim();
    if (!userMessage) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    setChatMessages((prev) => [
      ...prev,
      { role: "assistant", content: `Regenerating analysis with focus on: "${userMessage}"...` },
    ]);

    await handleGenerate(userMessage);
    setChatLoading(false);

    setChatMessages((prev) => [
      ...prev.slice(0, -1),
      { role: "assistant", content: `Analysis updated! I focused on "${userMessage}". Check the results on the left.` },
    ]);

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // ── Planning UI ──
  function renderPlanningUI(isRegenerate: boolean) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {!isRegenerate && (
          <div>
            <h3 className="text-lg font-semibold">Insights</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate AI-powered insights from your {completedCount} completed interviews.
            </p>
          </div>
        )}

        {isRegenerate && (
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Regenerate Analysis</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adjust focus areas. Previous reports are preserved.
                </p>
              </div>
              <button
                onClick={() => setShowOptions(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Focus areas</label>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_OPTIONS.map((opt, i) => {
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <motion.button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                    isSelected
                      ? "border-foreground/30 bg-stone-50 font-medium"
                      : "border-border hover:border-foreground/20"
                  }`}
                >
                  {opt.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} interviews available
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              About {estimatedInsightsSeconds}s. Regenerating reruns analysis and may increase usage.
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button onClick={() => handleGenerate()}>
              <Sparkles className="mr-2 h-4 w-4" />
              {isRegenerate ? "Regenerate" : "Generate Insights"}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── Chat Panel (right side) ──
  function renderChatPanel() {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
        className="fixed bottom-20 left-4 right-4 z-40 rounded-2xl border bg-background shadow-xl overflow-hidden flex flex-col h-[min(68svh,620px)] max-h-[calc(100svh-8rem)] sm:left-auto sm:right-5 sm:w-[420px]"
      >
        <div className="border-b px-4 py-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Ask about your study</p>
              <p className="text-[11px] text-muted-foreground">
                Each question reruns analysis with a new focus
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChatPanelMode("minimized")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                aria-label="Minimize insights chat panel"
                title="Minimize"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChatPanelMode("closed")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                aria-label="Close insights chat panel"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {chatMessages.length === 0 && (
            <div className="text-center py-6">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <Sparkles className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
              </motion.div>
              <p className="text-xs text-muted-foreground">
                Ask questions about your data to refine the analysis.
              </p>
              <div className="mt-3 space-y-1.5">
                {["Why do users churn?", "What features matter most?", "Compare sentiment by persona"].map((q, i) => (
                  <motion.button
                    key={q}
                    onClick={() => handleChatSend(q)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    whileHover={{ scale: 1.02, borderColor: "var(--foreground)" }}
                    className="block w-full text-left rounded-lg border border-dashed px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
          {chatLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
          </div>

          {/* Sticky input */}
          <div className="border-t px-3 py-2.5 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your data..."
                className="flex-1 rounded-xl border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chatInput.trim()) handleChatSend();
                }}
                disabled={chatLoading}
              />
              <motion.button
                onClick={() => handleChatSend()}
                disabled={!chatInput.trim() || chatLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl bg-foreground px-3 py-2 text-background disabled:opacity-40 transition-colors hover:bg-foreground/90"
              >
                <Send className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  function renderChatDock() {
    if (chatPanelMode === "open") return null;
    if (chatPanelMode === "closed") {
      return (
        <button
          type="button"
          onClick={() => setChatPanelMode("open")}
          className="fixed bottom-5 right-5 z-40 inline-flex h-11 items-center justify-center rounded-full border bg-background px-4 shadow-lg transition-colors hover:border-foreground/30"
          aria-label="Open insights chat"
        >
          <MessageSquare className="mr-1.5 h-4 w-4" />
          <span className="text-xs font-medium">Ask</span>
        </button>
      );
    }

    return (
      <div className="fixed bottom-5 left-5 right-5 z-40 sm:left-auto sm:w-[360px]">
        <div className="rounded-xl border bg-background shadow-lg">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="text-xs font-medium">Ask about your study</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChatPanelMode("open")}
                className="inline-flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:text-foreground"
                aria-label="Restore insights chat panel"
                title="Restore"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setChatPanelMode("closed")}
                className="inline-flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:text-foreground"
                aria-label="Close insights chat panel"
                title="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Streaming State ──
  if (streamPhase === "streaming") {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="order-2 space-y-8 lg:order-1 lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-lg font-semibold">Analyzing...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Extracting insights from {completedCount} interviews.
            </p>
          </motion.div>

          <InsightsProgress
            steps={INSIGHT_STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            stepDetails={stepDetails}
          />

          <AnimatePresence>
            {streamedThemes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <ResultsThemes themes={streamedThemes} quotes={streamedQuotes} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {streamedSentiment && streamedSummary && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
              >
                <ResultsSummary
                  summary={streamedSummary}
                  totalInterviews={completedCount}
                  avgDurationMs={avgDurationMs}
                  sentimentBreakdown={streamedSentiment}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {streamedQuotes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
              >
                <ResultsQuotes
                  quotes={streamedQuotes}
                  themes={streamedThemes.map((t) => t.name)}
                  personaNames={[...new Set(streamedQuotes.map((q) => q.personaName))]}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {streamedRecommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
              >
                <ResultsRecommendations recommendations={streamedRecommendations} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showChatPanel ? renderChatPanel() : null}
        {renderChatDock()}
      </div>
    );
  }

  // ── No Report → Planning UI ──
  if (!report) {
    return renderPlanningUI(false);
  }

  // ── Has Report → Dashboard + Chat ──
  const themes = (report.themes as Theme[]) || [];
  const quotes = (report.keyFindings as KeyQuote[]) || [];
  const sentiment = report.sentimentBreakdown as SentimentBreakdown | null;
  const recommendations = (report.recommendations as Recommendation[]) || [];
  const personaNames = [...new Set(quotes.map((q) => q.personaName))];
  const themeNames = themes.map((t) => t.name);

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      {/* Left: Dashboard */}
      <div className="order-2 space-y-8 lg:order-1 lg:col-span-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Insights</h3>
            {reports.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Clock className="h-3 w-3" />
                  {activeReportIndex === 0 ? "Latest" : formatDate(report.createdAt)}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 z-20 w-48 rounded-lg border bg-background shadow-lg py-1"
                    >
                      {reports.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => { setActiveReportIndex(i); setShowHistory(false); }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${i === activeReportIndex ? "bg-muted font-medium" : ""}`}
                        >
                          {i === 0 ? "Latest" : `Version ${reports.length - i}`}
                          <span className="text-muted-foreground ml-1.5">{formatDate(r.createdAt)}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {completedCount >= 2 && (
              <Link
                href={`/studies/${studyId}/compare`}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                Compare
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowOptions(true)} className="text-xs">
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Regenerate
            </Button>
            <Link
              href={`/api/studies/${studyId}/export`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Download className="h-3 w-3" />
              CSV
            </Link>
          </div>
        </motion.div>

        {/* Regenerate Options */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border p-5 space-y-5">
                {renderPlanningUI(true)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard sections with staggered entry */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ResultsSummary
            summary={report.summary || ""}
            totalInterviews={completedCount}
            avgDurationMs={avgDurationMs}
            sentimentBreakdown={sentiment}
          />
        </motion.div>

        {themes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ResultsThemes themes={themes} quotes={quotes} />
          </motion.div>
        )}

        {quotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ResultsQuotes quotes={quotes} themes={themeNames} personaNames={personaNames} />
          </motion.div>
        )}

        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ResultsRecommendations recommendations={recommendations} />
          </motion.div>
        )}
      </div>

      {/* Right: Chat Panel */}
      {showChatPanel ? renderChatPanel() : null}
      {renderChatDock()}
    </div>
  );
}
