import { memo, useCallback, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface LoadMoreControlProps {
  hasNext: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  onLoadMore: () => void;
  onRetry: () => void;
  loadedCount: number;
  totalCount: number | null;
  className?: string;
}

export const LoadMoreControl = memo(function LoadMoreControl({
  hasNext,
  isLoadingMore,
  error,
  onLoadMore,
  onRetry,
  loadedCount,
  totalCount,
  className,
}: LoadMoreControlProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const handleLoadMore = useCallback(() => {
    if (isDebouncing || isLoadingMore) return;
    setIsDebouncing(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setIsDebouncing(false), 500);
    onLoadMore();
  }, [isDebouncing, isLoadingMore, onLoadMore]);

  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex flex-col sm:flex-row items-center justify-center gap-3 py-6 px-4",
          "rounded-lg border border-destructive/30 bg-destructive/5",
          className,
        )}
      >
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-destructive text-center">
          Failed to load more problems. Please try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          aria-label="Retry loading more problems"
          disabled={isLoadingMore}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!hasNext && loadedCount > 0) {
    return (
      <div
        className={cn(
          "text-center py-6 text-sm text-muted-foreground",
          className,
        )}
        aria-label="All problems loaded"
      >
        {loadedCount} of {totalCount ?? loadedCount} problems loaded
      </div>
    );
  }

  if (!hasNext && loadedCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center gap-3 py-6", className)}>
      <Button
        variant="outline"
        onClick={handleLoadMore}
        disabled={isLoadingMore || isDebouncing}
        aria-label="Load more problems"
        aria-busy={isLoadingMore}
        className="min-w-[160px]"
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          "Load More"
        )}
      </Button>
      {totalCount != null && (
        <p className="text-xs text-muted-foreground">
          {loadedCount} of {totalCount} problems
        </p>
      )}
    </div>
  );
});
