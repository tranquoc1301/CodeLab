import { memo } from "react";
import { Skeleton } from "@/components/ui";

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export const SkeletonList = memo(function SkeletonList({
  count = 6,
  className,
}: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
});