import { memo } from "react";
import { Card, Skeleton } from "@/components/ui";

export const SubmissionSkeleton = memo(function SubmissionSkeleton() {
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
});
