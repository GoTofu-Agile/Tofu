"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StudyPersonaList } from "./study-persona-list";
import { StudySessionList } from "./study-session-list";
import { BatchRunButton } from "./batch-run-button";
import { InsightsPanel } from "./insights-panel";
import {
  Download,
  GitCompareArrows,
  ChevronDown,
  BarChart3,
} from "lucide-react";

type TabName = "overview" | "interviews" | "results";

const TAB_NAMES: TabName[] = ["overview", "interviews", "results"];
const TAB_LABELS: Record<TabName, string> = {
  overview: "Overview",
  interviews: "Interviews",
  results: "Results",
};

interface PersonaGroup {
  name: string;
  personaCount: number;
}

interface Persona {
  id: string;
  name: string;
  archetype: string | null;
  occupation: string | null;
  age: number | null;
  gender: string | null;
  groupName: string;
}

interface Session {
  id: string;
  personaId: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  persona: { name: string; archetype: string | null };
  _count: { messages: number };
}

interface StudyDetailTabsProps {
  defaultTab: TabName;
  studyId: string;
  studyType: string;
  interviewGuide: string | null;
  personaGroups: PersonaGroup[];
  allPersonas: Persona[];
  personaSessionMap: Record<string, { sessionId: string; status: string }>;
  sessions: Session[];
  pendingCount: number;
  completedCount: number;
  analysisReport: {
    summary: string | null;
    themes: unknown;
    keyFindings: unknown;
    sentimentBreakdown: unknown;
    recommendations: unknown;
    createdAt: Date;
  } | null;
}

const typeLabels: Record<string, string> = {
  INTERVIEW: "Interview",
  SURVEY: "Survey",
  FOCUS_GROUP: "Focus Group",
  USABILITY_TEST: "Usability Test",
  CARD_SORT: "Card Sort",
};

export function StudyDetailTabs({
  defaultTab,
  studyId,
  studyType,
  interviewGuide,
  personaGroups,
  allPersonas,
  personaSessionMap,
  sessions,
  pendingCount,
  completedCount,
  analysisReport,
}: StudyDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>(defaultTab);
  const activeIndex = TAB_NAMES.indexOf(activeTab);

  function handleTabChange(newValue: number | null) {
    if (newValue === null) return;
    setActiveTab(TAB_NAMES[newValue]);
  }

  return (
    <Tabs value={activeIndex} onValueChange={handleTabChange}>
      <TabsList variant="line" className="w-full justify-start">
        {TAB_NAMES.map((name, i) => (
          <TabsTrigger key={name} value={i} className="px-4">
            {TAB_LABELS[name]}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Overview */}
      <TabsContent value={0} className="pt-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{typeLabels[studyType]}</Badge>
          </div>

          {interviewGuide && (
            <details className="group rounded-lg border">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
                Interview Guide
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t px-4 py-3">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {interviewGuide}
                </p>
              </div>
            </details>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Persona Groups</h4>
            <div className="flex flex-wrap gap-2">
              {personaGroups.map((g) => (
                <div
                  key={g.name}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    {g.personaCount} personas
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Interviews */}
      <TabsContent value={1} className="pt-6 space-y-6">
        {allPersonas.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <BatchRunButton
              studyId={studyId}
              pendingCount={pendingCount}
              totalCount={allPersonas.length}
              completedCount={completedCount}
            />
            {completedCount > 0 && (
              <div className="flex items-center gap-2">
                {completedCount >= 2 && (
                  <Link
                    href={`/studies/${studyId}/compare`}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <GitCompareArrows className="h-3 w-3" />
                    Compare
                  </Link>
                )}
                <Link
                  href={`/api/studies/${studyId}/export`}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Export CSV
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-medium">
            Personas ({allPersonas.length})
          </h3>
          <StudyPersonaList
            personas={allPersonas}
            studyId={studyId}
            personaSessionMap={personaSessionMap}
          />
        </div>

        {sessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">
              Sessions ({sessions.length})
            </h3>
            <StudySessionList sessions={sessions} studyId={studyId} />
          </div>
        )}
      </TabsContent>

      {/* Results */}
      <TabsContent value={2} className="pt-6 space-y-6">
        {analysisReport && (
          <Link
            href={`/studies/${studyId}/results`}
            className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  View Full Results Dashboard
                </p>
                <p className="text-xs text-muted-foreground">
                  Detailed themes, quotes, and recommendations
                </p>
              </div>
            </div>
          </Link>
        )}

        {completedCount >= 2 && (
          <Link
            href={`/studies/${studyId}/compare`}
            className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted"
          >
            <GitCompareArrows className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Compare Transcripts</p>
              <p className="text-xs text-muted-foreground">
                Side-by-side view of interview responses
              </p>
            </div>
          </Link>
        )}

        <InsightsPanel
          studyId={studyId}
          report={analysisReport}
          hasCompletedSessions={completedCount > 0}
        />
      </TabsContent>
    </Tabs>
  );
}
