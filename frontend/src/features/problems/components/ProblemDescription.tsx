import { memo, useState, useCallback } from "react";
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Code2,
  Ruler,
  Terminal,
} from "lucide-react";
import { DifficultyBadge } from "@/features/problems/components/DifficultyBadge";
import type { Problem } from "@/shared/types";
import DOMPurify from "dompurify";
import { Badge } from "@/shared/components/ui/badge";
import { ConstraintText } from "@/shared/components/ui/constraint-text";

interface ProblemDescriptionProps {
  problem: Problem;
}

export const ProblemDescription = memo(function ProblemDescription({
  problem,
}: ProblemDescriptionProps) {
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});

  const toggleHint = useCallback((hintId: number) => {
    setShowHints((prev) => ({ ...prev, [hintId]: !prev[hintId] }));
  }, []);

  return (
    <div className="px-6 py-5 space-y-7">
      {/* Title + Difficulty */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {problem.title}
        </h1>
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>

      {/* Topics */}
      {problem.topics && problem.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {problem.topics.map((topic) => (
            <Badge
              key={topic.id}
              variant="secondary"
              className="text-xs px-3 py-1 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground border border-border/50 transition-colors"
            >
              {topic.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Description HTML */}
      <div className="prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-foreground">
        <div
          className="leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(problem.description),
          }}
        />
      </div>

      {/* Examples */}
      {problem.examples && problem.examples.length > 0 && (
        <section className="space-y-4" aria-label="Examples">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
            <Terminal className="h-4 w-4 text-muted-foreground" aria-hidden />
            Examples
          </h3>
          <div className="space-y-3">
            {problem.examples.map((ex) => (
              <div
                key={ex.id}
                className="border border-border/80 rounded-xl overflow-hidden bg-muted/30 transition-colors hover:border-border/60"
              >
                {/* Example images */}
                {ex.images && ex.images.length > 0 && (
                  <div className="flex flex-wrap gap-3 p-4 bg-muted/20 border-b border-border/60">
                    {ex.images.map((imgUrl, imgIndex) => (
                      <img
                        key={`${ex.id}-img-${imgIndex}`}
                        src={imgUrl}
                        alt={`Example ${ex.example_num} illustration ${imgIndex + 1}`}
                        className="rounded-lg border border-border/60 object-contain bg-muted/40"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Example label */}
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border/60">
                  <span className="text-sm font-semibold text-foreground">
                    Example {ex.example_num}
                  </span>
                </div>

                {/* Example content */}
                <div className="px-4 py-3 font-mono text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {ex.example_text}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Constraints */}
      {problem.constraints && problem.constraints.length > 0 && (
        <section className="space-y-3" aria-label="Constraints">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
            <Ruler className="h-4 w-4 text-muted-foreground" aria-hidden />
            Constraints
          </h3>
          <ul className="space-y-2">
            {problem.constraints.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 text-sm text-foreground/80 font-mono bg-muted/30 px-4 py-3 rounded-lg border border-border/60 hover:border-border/50 transition-colors"
              >
                <ChevronRight
                  className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5"
                  aria-hidden
                />
                <ConstraintText text={c.constraint_text} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hints */}
      {problem.hints && problem.hints.length > 0 && (
        <section className="space-y-3" aria-label="Hints">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
            <Lightbulb className="h-4 w-4 text-muted-foreground" aria-hidden />
            Hints
          </h3>
          <div className="space-y-2">
            {problem.hints.map((hint) => (
              <div
                key={hint.id}
                className="border border-border/60 rounded-xl overflow-hidden bg-warning/5 hover:border-warning/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleHint(hint.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors text-sm text-foreground/80"
                  aria-expanded={!!showHints[hint.id]}
                >
                  <span className="flex items-center gap-2.5">
                    <Lightbulb className="h-4 w-4 text-warning" aria-hidden />
                    <span className="font-medium">Hint {hint.hint_num}</span>
                  </span>
                  {showHints[hint.id] ? (
                    <ChevronUp
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                  ) : (
                    <ChevronDown
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </button>
                {showHints[hint.id] && (
                  <div
                    className="px-4 pb-4 text-sm text-foreground/80 prose prose-sm max-w-none border-t border-border/40 pt-3"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(hint.hint_text),
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Limits footer */}
      <div className="pt-4 border-t border-border/60 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Code2 className="h-3 w-3" aria-hidden />
          Time Limit: 1000ms
        </span>
        <span className="flex items-center gap-1.5">
          <Ruler className="h-3 w-3" aria-hidden />
          Memory Limit: 256MB
        </span>
      </div>
    </div>
  );
});
