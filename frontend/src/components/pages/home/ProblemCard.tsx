import { memo } from "react";
import { Tag } from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import { DifficultyBadge } from "@/components/DifficultyBadge";
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
      className="text-left w-full group animate-fade-in"
      aria-label={`${problem.title}. Press Enter to ${isAuthenticated ? "view" : "log in and view"}`}
    >
      <Card className="p-5 card-hover cursor-pointer">
        <CardContent className="p-0">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {problem.frontend_id}.
                </span>
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                  {problem.title}
                </h2>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {problem.topics?.slice(0, 3).map((topic) => (
                  <Badge
                    key={topic.id}
                    variant="outline"
                    className="font-normal badge-hover"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {topic.name}
                  </Badge>
                ))}
                {problem.topics && problem.topics.length > 3 && (
                  <Badge
                    variant="outline"
                    className="font-normal text-muted-foreground"
                  >
                    +{problem.topics.length - 3}
                  </Badge>
                )}
              </div>
            </div>
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
        </CardContent>
      </Card>
    </button>
  );
});
