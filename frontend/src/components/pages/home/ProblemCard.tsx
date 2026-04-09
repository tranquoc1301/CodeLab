import { memo, useMemo } from "react";
import { Tag, CheckCircle } from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { cn } from "@/lib/utils";
import type { ProblemSummary } from "@/types";

interface ProblemCardProps {
  problem: ProblemSummary;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isAuthenticated: boolean;
}

// Memoized card class computation - avoid recreating on every render
const getCardClassName = () => cn(
  "p-4 sm:p-5 cursor-pointer",
  "hover:shadow-md",
  "border-border/50 hover:border-primary/30",
  "bg-card",
  // Only transition color properties, not all properties
  "transition-colors duration-150",
  // GPU acceleration for smoother interactions
  "transform-gpu"
);

export const ProblemCard = memo(function ProblemCard({
  problem,
  onClick,
  onKeyDown,
  isAuthenticated,
}: ProblemCardProps) {
  const isSolved = problem.is_solved ?? false;
  
  // Memoize card class to avoid recreation
  const cardClassName = useMemo(() => getCardClassName(), []);
  
  // Memoize topics slice to avoid recreation
  const displayTopics = useMemo(() => 
    problem.topics?.slice(0, 3) ?? [], 
    [problem.topics]
  );
  
  const hasMoreTopics = useMemo(() => 
    problem.topics && problem.topics.length > 3,
    [problem.topics]
  );
  
  const extraTopicsCount = useMemo(() => 
    problem.topics ? problem.topics.length - 3 : 0,
    [problem.topics]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="text-left w-full group"
      aria-label={`${problem.difficulty} - ${problem.title}. Press Enter to ${isAuthenticated ? "view" : "log in and view"}`}
    >
      <Card className={cardClassName}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sm font-mono text-muted-foreground shrink-0">
                  {problem.frontend_id}.
                </span>
                <h2 className="text-base sm:text-lg font-semibold truncate">
                  {problem.title}
                </h2>
                {isSolved && (
                  <CheckCircle
                    className="h-5 w-5 text-green-500 shrink-0"
                    aria-label="Solved"
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayTopics.map((topic) => (
                  <Badge
                    key={topic.id}
                    variant="outline"
                    className="font-normal text-xs"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {topic.name}
                  </Badge>
                ))}
                {hasMoreTopics && (
                  <Badge
                    variant="outline"
                    className="font-normal text-muted-foreground text-xs"
                  >
                    +{extraTopicsCount}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <DifficultyBadge difficulty={problem.difficulty} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.problem.id === nextProps.problem.id &&
    prevProps.problem.title === nextProps.problem.title &&
    prevProps.problem.is_solved === nextProps.problem.is_solved &&
    prevProps.problem.difficulty === nextProps.problem.difficulty &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onKeyDown === nextProps.onKeyDown
  );
});
