import { memo, useMemo, useState } from "react";
import { Tag, CheckCircle2 } from "lucide-react";
import { DifficultyBadge } from "./DifficultyBadge";
import { cn } from "@/shared/utils/utils";
import type { ProblemSummary } from "@/shared/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

interface ProblemCardProps {
  problem: ProblemSummary;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isAuthenticated: boolean;
  className?: string;
}

export const ProblemCard = memo(
  function ProblemCard({
    problem,
    onClick,
    onKeyDown,
    isAuthenticated,
    className,
  }: ProblemCardProps) {
    const [isPressed, setIsPressed] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isSolved = problem.is_solved ?? false;

    // Enhanced card classes with better interaction states
    const cardClassName = useMemo(
      () =>
        cn(
          "relative overflow-hidden",
          "p-4 sm:p-5",
          "cursor-pointer",
          "bg-card/50 backdrop-blur-sm",
          "border border-border/60",
          "rounded-xl",
          // Smooth transitions for all properties
          "transition-all duration-200 ease-out",
          // Hover effects with elevation
          "hover:shadow-lg hover:shadow-primary/5",
          // Active/pressed state
          isPressed && "scale-[0.98] shadow-sm",
          // Focus state for keyboard navigation
          isFocused &&
            "ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
          className,
        ),
      [isPressed, isFocused, className],
    );

    // Optimized topics computation
    const { displayTopics, extraCount } = useMemo(() => {
      const topics = problem.topics ?? [];
      return {
        displayTopics: topics.slice(0, 3),
        extraCount: Math.max(0, topics.length - 3),
      };
    }, [problem.topics]);

    // Handle mouse interactions for pressed state
    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseLeave = () => setIsPressed(false);

    // Enhanced keyboard handling
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsPressed(true);
        setTimeout(() => {
          setIsPressed(false);
          onClick();
        }, 100);
      }
      onKeyDown?.(e);
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="text-left w-full group outline-none"
        aria-label={`${problem.difficulty} difficulty: ${problem.title}${isSolved ? " (Solved)" : ""}. ${isAuthenticated ? "Press Enter to view details" : "Press Enter to log in and view"}`}
        aria-pressed={isPressed}
      >
        <Card className={cardClassName}>
          <CardContent className="p-0 relative">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                {/* Header: ID, Title, Solved Badge */}
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-sm font-mono text-muted-foreground shrink-0 mt-0.5">
                    {problem.frontend_id}.
                  </span>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold truncate group-hover:text-primary transition-colors duration-200">
                      {problem.title}
                    </h2>
                  </div>

                  {/* Solved Badge with animation */}
                  {isSolved && (
                    <div className="shrink-0 flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-medium animate-in zoom-in-95">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Solved</span>
                    </div>
                  )}
                </div>

                {/* Topics Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {displayTopics.map((topic, index) => (
                    <Badge
                      key={topic.id}
                      variant="secondary"
                      className={cn(
                        "font-normal text-xs",
                        "bg-secondary/50 hover:bg-secondary",
                        "transition-all duration-200",
                        "group-hover:translate-y-0",
                        "animate-in fade-in slide-in-from-bottom-1",
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
                      {topic.name}
                    </Badge>
                  ))}
                  {extraCount > 0 && (
                    <Badge
                      variant="outline"
                      className="font-normal text-muted-foreground text-xs hover:bg-muted cursor-default"
                    >
                      +{extraCount}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right Side: Difficulty & Arrow */}
              <div className="flex items-center gap-3 shrink-0 sm:flex-col sm:items-end sm:gap-2">
                <DifficultyBadge
                  difficulty={problem.difficulty}
                  className="shadow-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.problem.id === nextProps.problem.id &&
      prevProps.problem.title === nextProps.problem.title &&
      prevProps.problem.is_solved === nextProps.problem.is_solved &&
      prevProps.problem.difficulty === nextProps.problem.difficulty &&
      prevProps.isAuthenticated === nextProps.isAuthenticated &&
      prevProps.className === nextProps.className
    );
  },
);
