import { memo, useCallback, useState, useRef, useEffect } from "react";
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

export const TopicFilter = memo(function TopicFilter({
  topics,
  selectedTopics,
  onToggle,
  isLoading,
  className,
  maxVisible = 12,
}: TopicFilterProps) {
  const [showAll, setShowAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleTopics = showAll ? topics : topics.slice(0, maxVisible);
  const hasMore = topics.length > maxVisible;
  const hasSelection = selectedTopics.length > 0;

  // Close on click outside when expanded
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = useCallback(
    (slug: string) => {
      onToggle(slug);
    },
    [onToggle],
  );

  // Loading state with staggered animation
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
              className="h-8 w-20 rounded-full animate-pulse"
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
    <div ref={containerRef} className={cn("space-y-3", className)}>
      {/* Header with selection summary */}
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

      {/* Topic grid with expand/collapse */}
      <div
        className={cn(
          "relative transition-all duration-300 ease-out",
          !showAll && !isExpanded && "max-h-[120px] overflow-hidden",
        )}
        role="group"
        aria-label="Topic filters"
      >
        <div className="flex flex-wrap gap-2">
          {visibleTopics.map((topic) => {
            const isSelected = selectedTopics.includes(topic.slug);
            return (
              <motion.button
                key={topic.slug}
                type="button"
                onClick={() => handleToggle(topic.slug)}
                layout
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:border-primary/30",
                )}
                role="checkbox"
                aria-checked={isSelected}
              >
                <motion.span
                  initial={false}
                  animate={{
                    width: isSelected ? "auto" : 0,
                    opacity: isSelected ? 1 : 0,
                    marginRight: isSelected ? 4 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden inline-flex items-center"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" />
                </motion.span>
                {topic.name}
              </motion.button>
            );
          })}
        </div>

        {/* Gradient fade when collapsed */}
        {!showAll && !isExpanded && hasMore && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {/* Action buttons */}
      {hasMore && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
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
