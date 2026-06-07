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
          <Sparkles
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="text-sm font-medium text-muted-foreground"
          >
            Recommended for you
          </h2>
        </header>

        <div
          className="grid gap-3"
          aria-busy="true"
          aria-label="Loading recommendations"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <ProblemCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-labelledby={headingId}>
        <header className="mb-3 flex items-center gap-2">
          <Sparkles
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="text-sm font-medium text-muted-foreground"
          >
            Recommended for you
          </h2>
        </header>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Couldn't load recommendations. Try again?
          </p>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return null;
  }

  const [featuredItem, ...moreItems] = items;
  const featuredTopics = featuredItem.topic_slugs?.slice(0, 3) ?? [];
  const remainingTopicCount = Math.max(
    0,
    (featuredItem.topic_slugs?.length ?? 0) - featuredTopics.length,
  );

  const handleNavigate = (slug: string) => {
    navigate(ROUTES.problemDetail(slug));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, slug: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigate(slug);
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-border bg-card px-4 py-5 sm:px-6"
    >
      <div>
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Recommended for you
            </div>
            <div className="space-y-1">
              <h2
                id={headingId}
                className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              >
                Your next best problem to solve
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Start with the strongest next step based on your recent mistakes
                and the skills that need more practice.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
          <Card
            role="button"
            tabIndex={0}
            aria-label={`Open problem ${featuredItem.title}`}
            className="min-h-44 cursor-pointer border-border bg-card p-5 transition-colors duration-200 hover:bg-accent/50 sm:p-6"
            onClick={() => handleNavigate(featuredItem.slug)}
            onKeyDown={(event) => handleKeyDown(event, featuredItem.slug)}
          >
            <div className="flex h-full flex-col">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Next step</Badge>
                  <DifficultyBadge difficulty={featuredItem.difficulty} />
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {featuredItem.title}
                  </h3>
                  {featuredItem.dominant_error_label && (
                    <Badge variant="outline" className="text-xs">
                      {featuredItem.dominant_error_display}
                    </Badge>
                  )}
                  {featuredTopics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {featuredTopics.map((topic) => (
                        <Badge key={topic} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                      {remainingTopicCount > 0 && (
                        <Badge variant="secondary">+{remainingTopicCount}</Badge>
                      )}
                    </div>
                  )}
                  {featuredItem.attempt_count && featuredItem.attempt_count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Attempted {featuredItem.attempt_count} time(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-8">
                <p className="text-sm font-medium text-foreground">
                  Start this problem
                </p>
              </div>
            </div>
          </Card>

          {moreItems.length > 0 ? (
            <div className="rounded-2xl border border-border bg-background p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    More practice
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Similar follow-up problems tailored to your learning path.
                  </p>
                </div>
              </div>

              <div role="list" className="grid gap-3">
                {moreItems.map((item) => (
                  <div key={item.problem_id} role="listitem">
                    <Card
                      role="button"
                      tabIndex={0}
                      aria-label={`Open problem ${item.title}`}
                      className="min-h-11 cursor-pointer border-border/80 bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
                      onClick={() => handleNavigate(item.slug)}
                      onKeyDown={(event) => handleKeyDown(event, item.slug)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          {item.dominant_error_label && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.dominant_error_display}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <DifficultyBadge difficulty={item.difficulty} />
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
