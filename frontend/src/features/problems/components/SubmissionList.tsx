import { memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Clock, Zap, FileCode } from "lucide-react";
import { useProblemSubmissions } from "@/shared/hooks/useProblemSubmissions";
import type { SubmissionResult } from "@/shared/types";
import { getStatusConfig } from "@/shared/config/status";

import { Skeleton } from "@/shared/components/ui/skeleton";

interface SubmissionListProps {
  problemId: number;
  onSelectSubmission: (submission: SubmissionResult) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Get language display label
 */
function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    python3: "Python 3",
    java: "Java",
    cpp: "C++",
    c: "C",
  };
  return labels[language] || language;
}

export const SubmissionList = memo(function SubmissionList({
  problemId,
  onSelectSubmission,
}: SubmissionListProps) {
  const queryClient = useQueryClient();
  const { data: submissions, isLoading } = useProblemSubmissions(
    problemId,
    true,
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["submissions", "problem", problemId],
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileCode className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No submissions yet. Submit your solution to see history here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60">
        <span className="text-xs font-medium text-muted-foreground">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Submission list */}
      <div className="flex-1 overflow-y-auto">
        {submissions.map((submission) => {
          const statusConfig = getStatusConfig(submission.status);
          const StatusIcon = statusConfig.icon;

          return (
            <button
              key={submission.id}
              type="button"
              onClick={() => onSelectSubmission(submission)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-border/40"
            >
              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusConfig.class}`}
              >
                <StatusIcon className="h-3 w-3" />
                {submission.status || "Pending"}
              </span>

              {/* Language */}
              <span className="text-xs text-muted-foreground shrink-0">
                {getLanguageLabel(submission.language)}
              </span>

              {/* Runtime */}
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <Zap className="h-3 w-3" />
                {submission.execution_time_ms != null
                  ? `${submission.execution_time_ms} ms`
                  : "—"}
              </span>

              {/* Relative time - push to end with flex-1 */}
              <span className="text-xs text-muted-foreground/70 ml-auto flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(submission.created_at)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
