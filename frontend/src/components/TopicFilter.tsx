import { memo, useCallback, useState } from "react";
import { ChevronDown, ChevronUp, Hash, Check } from "lucide-react";
import { Badge, Button, Skeleton } from "@/components/ui";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Topic } from "@/types";

interface TopicFilterProps {
  topics: Topic[];
  selectedTopics: string[];
  onToggle: (slug: string) => void;
  onClearAll: () => void;
  isLoading: boolean;
  className?: string;
  maxVisible?: number;
}

// Defined outside component to avoid object recreation on every render
const MOTION_TRANSITION = {
  type: "spring",
  stiffness: 400,
  damping: 30,
} as const;

// Isolated memo so only the toggled button re-renders, not all siblings
const TopicButton = memo(function TopicButton({
  topic,
  isSelected,
  onToggle,
}: {
  topic: Topic;
  isSelected: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onToggle(topic.slug)}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={MOTION_TRANSITION}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:border-primary/30",
      )}
      role="checkbox"
      aria-checked={isSelected}
    >
      <span
        className={cn(
          "inline-flex items-center overflow-hidden transition-all duration-150 ease-out",
          isSelected
            ? "max-w-[1rem] mr-1 opacity-100"
            : "max-w-0 mr-0 opacity-0",
        )}
        aria-hidden="true"
      >
        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
      </span>
      {topic.name}
    </motion.button>
  );
});

export const TopicFilter = memo(function TopicFilter({
  topics,
  selectedTopics,
  onToggle,
  isLoading,
  className,
  maxVisible = 12,
}: TopicFilterProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleTopics = showAll ? topics : topics.slice(0, maxVisible);
  const hasMore = topics.length > maxVisible;
  const hasSelection = selectedTopics.length > 0;

  const handleToggle = useCallback(
    (slug: string) => onToggle(slug),
    [onToggle],
  );

  const toggleShowAll = useCallback(() => setShowAll((v) => !v), []);

  if (isLoading) {
    return (
      <div
        className={cn("space-y-3", className)}
        aria-label="Loading topic filters"
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-8 w-20 rounded-full"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No topics available
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Topics</h2>
          {hasSelection && (
            <Badge
              variant="secondary"
              className="h-5 min-w-[1.25rem] px-1.5 text-xs font-medium animate-in zoom-in-95"
            >
              {selectedTopics.length}
            </Badge>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative transition-all duration-300 ease-out",
          !showAll && hasMore && "max-h-[120px] overflow-hidden",
        )}
        role="group"
        aria-label="Topic filters"
      >
        <div className="flex flex-wrap gap-2">
          {visibleTopics.map((topic) => (
            <TopicButton
              key={topic.slug}
              topic={topic}
              isSelected={selectedTopics.includes(topic.slug)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {!showAll && hasMore && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {hasMore && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShowAll}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show all {topics.length} topics
              </>
            )}
          </Button>

          {!showAll && (
            <span className="text-xs text-muted-foreground">
              {topics.length - maxVisible} hidden
            </span>
          )}
        </div>
      )}
    </div>
  );
});
