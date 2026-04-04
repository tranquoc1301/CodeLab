import { memo } from "react";
import { Card, Skeleton } from "@/components/ui";

export const ProblemCardSkeleton = memo(function ProblemCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </Card>
  );
});
