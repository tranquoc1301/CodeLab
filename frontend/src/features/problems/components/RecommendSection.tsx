import type { KeyboardEvent } from "react";
import { useId } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { ROUTES } from "@/app/router";
import { useAuth } from "@/app/store/auth";
import { DifficultyBadge } from "@/features/problems/components/DifficultyBadge";
import { ProblemCardSkeleton } from "@/features/problems/components/ProblemCardSkeleton";
import { useRecommendations } from "@/features/problems/hooks/useRecommendations";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

export default function RecommendSection() {
  const headingId = useId();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, refetch } = useRecommendations(5);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <section aria-labelledby={headingId}>
        <header className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id={headingId} className="text-sm font-medium text-muted-foreground">
            Recommended for you
          </h2>
        </header>
        <div className="grid gap-3" aria-busy="true" aria-label="Loading recommendations">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProblemCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-labelledby={headingId}>
        <header className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id={headingId} className="text-sm font-medium text-muted-foreground">
            Recommended for you
          </h2>
        </header>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Couldn't load recommendations. Try again?</p>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>Retry</Button>
        </div>
      </section>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const [featured, ...rest] = items;
  const topics = featured.topic_slugs?.slice(0, 3) ?? [];
  const extra = Math.max(0, (featured.topic_slugs?.length ?? 0) - topics.length);

  const go = (slug: string) => navigate(ROUTES.problemDetail(slug));
  const onKey = (e: KeyboardEvent<HTMLDivElement>, slug: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(slug); }
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-border bg-card px-4 py-5 sm:px-6"
    >
      <header className="mb-5">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Recommended for you
        </div>
        <h2
          id={headingId}
          className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          Your next best problem to solve
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Start with the strongest next step based on your recent mistakes and
          the skills that need more practice.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        {/* Featured */}
        <Card
          role="button"
          tabIndex={0}
          aria-label={`Open problem ${featured.title}`}
          className="min-h-44 cursor-pointer border-border bg-card p-5 sm:p-6 flex flex-col transition-shadow duration-200 hover:shadow-md"
          onClick={() => go(featured.slug)}
          onKeyDown={(e) => onKey(e, featured.slug)}
        >
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline">Next step</Badge>
            <DifficultyBadge difficulty={featured.difficulty} />
          </div>

          <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl mb-2">
            {featured.title}
          </h3>

          {featured.dominant_error_label && (
            <Badge variant="outline" className="text-xs w-fit mb-3">
              {featured.dominant_error_display}
            </Badge>
          )}

          {topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {topics.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
              {extra > 0 && <Badge variant="secondary">+{extra}</Badge>}
            </div>
          )}

          {featured.attempt_count != null && featured.attempt_count > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              Attempted {featured.attempt_count} time(s)
            </p>
          )}

          <div className="mt-auto pt-4">
            <span className="text-sm font-medium text-foreground">
              Start this problem →
            </span>
          </div>
        </Card>

        {/* More practice */}
        {rest.length > 0 && (
          <div className="rounded-2xl border border-border bg-background p-3 sm:p-4">
            <p className="text-sm font-medium text-foreground mb-1">
              More practice
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Similar follow-up problems.
            </p>

            <div className="grid gap-2">
              {rest.map((item) => (
                <Card
                  key={item.problem_id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open problem ${item.title}`}
                  className="cursor-pointer border-border/80 bg-card px-4 py-3 transition-colors duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => go(item.slug)}
                  onKeyDown={(e) => onKey(e, item.slug)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      {item.dominant_error_label && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.dominant_error_display}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <DifficultyBadge difficulty={item.difficulty} />
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
