import { memo, useCallback, useState } from "react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Topic } from "@/types";

interface TopicFilterProps {
  topics: Topic[];
  selectedTopics: string[];
  onToggle: (slug: string) => void;
  onClearAll: () => void;
  isLoading: boolean;
}

export const TopicFilter = memo(function TopicFilter({
  topics,
  selectedTopics,
  onToggle,
  onClearAll,
  isLoading,
}: TopicFilterProps) {
  const [showAll, setShowAll] = useState(false);
  const VISIBLE_COUNT = 12;
  const visibleTopics = showAll ? topics : topics.slice(0, VISIBLE_COUNT);
  const hasMore = topics.length > VISIBLE_COUNT;
  const hasSelection = selectedTopics.length > 0;

  const handleToggle = useCallback(
    (slug: string) => {
      onToggle(slug);
    },
    [onToggle],
  );

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2" aria-label="Loading topic filters">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Filter by Topic
        </h2>
        {hasSelection && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear all topic filters"
          >
            Clear all ({selectedTopics.length})
          </button>
        )}
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Topic filters"
      >
        {visibleTopics.map((topic) => {
          const isSelected = selectedTopics.includes(topic.slug);
          return (
            <button
              key={topic.slug}
              type="button"
              onClick={() => handleToggle(topic.slug)}
               className={cn(
                 "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out",
                 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                 isSelected
                   ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                   : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
               )}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`Filter by ${topic.name}`}
            >
              {isSelected && (
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {topic.name}
            </button>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center rounded-full border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
            aria-expanded={showAll}
            aria-label={showAll ? "Show fewer topics" : "Show all topics"}
          >
            {showAll ? "Show less" : `+${topics.length - VISIBLE_COUNT} more`}
          </button>
        )}
      </div>
    </div>
  );
});
