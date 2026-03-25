"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BatchRunButton } from "./batch-run-button";
import { StudyPersonaList } from "./study-persona-list";
import { AnalysisWorkspace } from "./analysis-workspace";
import { ExpandGroupButton } from "./expand-group-button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

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

interface StudyTabsProps {
  defaultTab: number;
  studyId: string;
  studyType: string;
  interviewGuide: string | null;
  description: string | null;
  personasByGroup: PersonaGroup[];
  personaSessionMap: Record<string, { sessionId: string; status: string }>;
  pendingCount: number;
  completedCount: number;
  totalCount: number;
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
};

export function StudyTabs({
  defaultTab,
  studyId,
  studyType,
  interviewGuide,
  description,
  personasByGroup,
  personaSessionMap,
  pendingCount,
  completedCount,
  totalCount,
  analysisReport,
}: StudyTabsProps) {
  const guideQuestions = interviewGuide
    ? interviewGuide.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  const hasCompletedSessions = completedCount > 0;

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value={0}>Setup</TabsTrigger>
        <TabsTrigger value={1}>Interviews</TabsTrigger>
        <TabsTrigger value={2}>Analysis</TabsTrigger>
      </TabsList>

      {/* Setup Tab */}
      <TabsContent value={0} className="pt-6 space-y-6">
        {/* Study Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{typeLabels[studyType] || studyType}</Badge>
          </div>

          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Interview Guide */}
        {guideQuestions.length > 0 && (
          <details className="group rounded-xl border" open>
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/50 transition-colors">
              Interview Guide ({guideQuestions.length} questions)
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t px-5 py-4 space-y-2">
              {guideQuestions.map((q, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {q}
                </p>
              ))}
            </div>
          </details>
        )}

        {/* Persona Groups */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Persona Groups</h4>
          {personasByGroup.map((group) => (
            <div
              key={group.groupId}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{group.groupName}</p>
                <p className="text-xs text-muted-foreground">
                  {group.personas.length} personas
                </p>
              </div>
              <ExpandGroupButton groupId={group.groupId} />
            </div>
          ))}
        </div>
      </TabsContent>

      {/* Interviews Tab */}
      <TabsContent value={1} className="pt-6 space-y-6">
        <BatchRunButton
          studyId={studyId}
          pendingCount={pendingCount}
          totalCount={totalCount}
          completedCount={completedCount}
        />

        {personasByGroup.map((group) => (
          <div key={group.groupId} className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">{group.groupName}</h4>
              <span className="text-xs text-muted-foreground">
                {group.personas.length} personas
              </span>
            </div>
            <StudyPersonaList
              personas={group.personas}
              studyId={studyId}
              personaSessionMap={personaSessionMap}
            />
          </div>
        ))}
      </TabsContent>

      {/* Analysis Tab */}
      <TabsContent value={2} className="pt-6">
        <AnalysisWorkspace
          studyId={studyId}
          completedCount={completedCount}
          totalCount={totalCount}
          hasCompletedSessions={hasCompletedSessions}
          analysisReport={analysisReport}
        />
      </TabsContent>
    </Tabs>
  );
}
