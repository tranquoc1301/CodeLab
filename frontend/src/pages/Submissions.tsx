import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileCode, ExternalLink } from "lucide-react";
import api from "@/api";
import { Card, CardContent, Skeleton, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { API, ROUTES, COPY } from "@/config";
import { getStatusConfig } from "@/config/status";
import type { Submission } from "@/types";

function StatusBadge({ status }: { status: string | null }) {
  const iconConfig = getStatusConfig(status);
  const Icon = iconConfig.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        iconConfig.class,
      )}
    >
      <Icon className="h-3 w-3" />
      {status || COPY.PROBLEM.UNKNOWN_STATUS}
    </span>
  );
}

function SubmissionSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </Card>
  );
}

export default function Submissions() {
  const { data: submissions, isLoading } = useQuery<Submission[]>({
    queryKey: ["submissions"],
    queryFn: async () => {
      const res = await api.get(API.ENDPOINTS.SUBMISSIONS);
      return res.data;
    },
  });

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {COPY.SUBMISSIONS.TITLE}
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your code submissions
        </p>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <SubmissionSkeleton key={i} />
            ))
          : submissions?.length === 0 && (
              <div className="text-center py-16">
                <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  {COPY.SUBMISSIONS.EMPTY}
                </p>
                <Button asChild className="mt-4">
                  <Link to={ROUTES.HOME}>Browse Problems</Link>
                </Button>
              </div>
            )}
        {submissions?.map((submission) => (
          <Card
            key={submission.id}
            className="p-4 transition-colors hover:bg-accent/50"
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FileCode className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    Problem #{submission.problem_id || "Unknown"}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{submission.language}</span>
                    <span>•</span>
                    <span>
                      {new Date(submission.created_at).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
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
        ))}
      </div>
    </div>
  );
}
