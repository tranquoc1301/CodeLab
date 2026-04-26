import { memo } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const LoadingState = memo(function LoadingState() {
  return (
    <div
      className="flex flex-col md:flex-row gap-0 h-[calc(100vh-4rem)]"
      role="status"
      aria-label="Loading problem"
    >
      {/* Left panel skeleton */}
      <div className="w-[38%] p-6 space-y-5 border-r border-border bg-card">
        {/* Title + difficulty */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Topic badges */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Description lines */}
        <div className="space-y-2.5 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Examples section */}
        <div className="space-y-3 pt-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>

        {/* Constraints section */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-4/5 rounded-lg" />
        </div>
      </div>

      {/* Right panel skeleton */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Editor header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
        {/* Editor area */}
        <Skeleton className="flex-[0.72] w-full rounded-none bg-muted/20" />
        {/* Console header */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border bg-card/80">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-md" />
        </div>
        {/* Console area */}
        <Skeleton className="flex-[0.28] w-full rounded-none bg-muted/10" />
      </div>
      <span className="sr-only">Loading problem details...</span>
    </div>
  );
});
