import { memo } from "react";
import { Tag } from "lucide-react";
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

export const ProblemCard = memo(function ProblemCard({
  problem,
  onClick,
  onKeyDown,
  isAuthenticated,
}: ProblemCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="text-left w-full group"
      aria-label={`${problem.difficulty} - ${problem.title}. Press Enter to ${isAuthenticated ? "view" : "log in and view"}`}
    >
      <Card
        className={cn(
          "p-4 sm:p-5 transition-all duration-200 ease-out cursor-pointer",
          "hover:shadow-md hover:-translate-y-0.5",
          "border-border/50 hover:border-primary/30",
          "hover:bg-secondary/30",
        )}
      >
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sm font-mono text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                  {problem.frontend_id}.
                </span>
                <h2 className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors duration-200 truncate">
                  {problem.title}
                </h2>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {problem.topics?.slice(0, 3).map((topic) => (
                  <Badge
                    key={topic.id}
                    variant="outline"
                    className="font-normal badge-hover text-xs"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {topic.name}
                  </Badge>
                ))}
                {problem.topics && problem.topics.length > 3 && (
                  <Badge
                    variant="outline"
                    className="font-normal text-muted-foreground text-xs"
                  >
                    +{problem.topics.length - 3}
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
    </button>
  );
});
