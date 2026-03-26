"use client";

interface StudyProgressProps {
  completedCount: number;
  totalCount: number;
}

export function StudyProgress({
  completedCount,
  totalCount,
}: StudyProgressProps) {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {completedCount} / {totalCount} interviews completed
        </span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
