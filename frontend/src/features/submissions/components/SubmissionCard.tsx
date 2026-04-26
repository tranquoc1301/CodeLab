import { memo } from "react";
import { Link } from "react-router-dom";
import { FileCode, ExternalLink } from "lucide-react";
import { ROUTES } from "@/app/router";
import { StatusBadge } from "./StatusBadge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import type { Submission } from "@/shared/types";

interface SubmissionCardProps {
  submission: Submission;
}

export const SubmissionCard = memo(function SubmissionCard({
  submission,
}: SubmissionCardProps) {
  return (
    <Card className="p-4 card-hover animate-fade-in">
      <CardContent className="p-0">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <FileCode className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {submission.problem_title ||
                `Problem #${submission.problem_id || "Unknown"}`}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{submission.language}</span>
              <span>•</span>
              <span>
                {new Date(submission.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {submission.execution_time_ms !== null && (
                <>
                  <span>•</span>
                  <span>{submission.execution_time_ms}ms</span>
                </>
              )}
              {submission.memory_used_kb !== null && (
                <>
                  <span>•</span>
                  <span>
                    {(submission.memory_used_kb / 1024).toFixed(1)}MB
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={submission.status} />
            {submission.problem_slug && (
              <Button variant="ghost" size="icon-sm" asChild>
                <Link
                  to={ROUTES.problemDetail(submission.problem_slug)}
                  aria-label="View problem"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
