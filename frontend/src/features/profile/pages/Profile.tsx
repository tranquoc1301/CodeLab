import { useQuery } from "@tanstack/react-query";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/app/store/auth";
import { profileApi } from "@/features/profile/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { COPY, DEFAULTS } from "@/shared/config";
import type { ErrorProfileResponse } from "@/shared/types";

export default function Profile() {
  const { isAuthenticated, user } = useAuth();
  const errorProfileQuery = useQuery({
    queryKey: ["profile", "errorProfile", user?.id],
    queryFn: () =>
      profileApi.getErrorProfile().then((response) => response.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-muted-foreground">
          {COPY.PROFILE.LOGIN_REQUIRED}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        {COPY.PROFILE.TITLE}
      </h1>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.username}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">
                  {COPY.PROFILE.USERNAME}
                </span>
                <p className="font-medium">{user?.username}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  {COPY.PROFILE.EMAIL}
                </span>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  {COPY.PROFILE.JOINED}
                </span>
                <p className="font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString(
                        DEFAULTS.LOCALE,
                        DEFAULTS.DATE_FORMAT,
                      )
                    : COPY.PROFILE.NOT_AVAILABLE}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {COPY.PROFILE.ERROR_PROFILE_TITLE}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {COPY.PROFILE.ERROR_PROFILE_DESCRIPTION}
          </p>
        </div>
        <div className="space-y-6">
          {errorProfileQuery.isLoading ? (
            <ProfileLoadingState />
          ) : errorProfileQuery.data &&
            errorProfileQuery.data.totals.all_time_profiled_submissions > 0 ? (
            <ErrorProfileDashboard data={errorProfileQuery.data} />
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{COPY.PROFILE.ERROR_PROFILE_EMPTY}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────── Loading ───────────────────────── */

function ProfileLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-52 rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

function ErrorProfileDashboard({ data }: { data: ErrorProfileResponse }) {
  const { totals, top_error_labels, top_topics, recent_window_days } = data;
  const maxLabelCount = Math.max(
    ...top_error_labels.map((l) => l.all_time_count),
    1,
  );

  return (
    <>
      {/* ── Summary Metrics ── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={COPY.PROFILE.ERROR_PROFILE_RECENT}
          value={totals.recent_profiled_submissions}
          hint={COPY.PROFILE.ERROR_PROFILE_RECENT_HINT.replace(
            "{days}",
            String(recent_window_days),
          )}
        />
        <MetricCard
          label={COPY.PROFILE.ERROR_PROFILE_ALL_TIME}
          value={totals.all_time_profiled_submissions}
          hint={COPY.PROFILE.ERROR_PROFILE_ALL_TIME_HINT}
        />
        <MetricCard
          label={COPY.PROFILE.ERROR_PROFILE_ACTIVE_LABELS}
          value={totals.active_error_labels}
          hint={COPY.PROFILE.ERROR_PROFILE_ACTIVE_LABELS_HINT}
        />
        <MetricCard
          label={COPY.PROFILE.ERROR_PROFILE_ACTIVE_TOPICS}
          value={totals.active_topics}
          hint={COPY.PROFILE.ERROR_PROFILE_ACTIVE_TOPICS_HINT}
        />
      </div>

      {/* ── Error Distribution + Labels (single card) ── */}
      <Card className="border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {COPY.PROFILE.ERROR_PROFILE_DISTRIBUTION}
          </CardTitle>
          <CardDescription>
            {COPY.PROFILE.ERROR_PROFILE_DISTRIBUTION_DESC}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y">
            {top_error_labels.map((label) => {
              const barWidth = (label.all_time_count / maxLabelCount) * 100;
              const recentShare =
                label.all_time_count > 0
                  ? (label.recent_count / label.all_time_count) * 100
                  : 0;

              return (
                <div key={label.code} className="py-3 first:pt-0 last:pb-0">
                  {/* Label name + counts */}
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-sm font-medium">
                      {label.display_name}
                    </span>
                    <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                      {recentShare > 33 && (
                        <span className="text-foreground/60">
                          {Math.round(recentShare)}% recent
                        </span>
                      )}
                      <span>
                        {label.recent_count} / {label.all_time_count}
                      </span>
                      <span className="min-w-[2rem] text-right font-medium text-foreground/60">
                        {Math.round(label.recent_share * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Distribution bar */}
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/40"
                      style={{ width: `${barWidth}%` }}
                    />
                    {recentShare > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-foreground/50"
                        style={{
                          width: `${(barWidth * recentShare) / 100}%`,
                        }}
                      />
                    )}
                  </div>

                  {/* Related topics (inline) */}
                  {label.related_topics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {label.related_topics.map((topic) => (
                        <span key={topic.slug}>
                          {topic.slug}{" "}
                          <span className="text-muted-foreground/50">
                            {topic.recent_count}/{topic.all_time_count}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Topics ── */}
      <Card className="border-border/70">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {COPY.PROFILE.ERROR_PROFILE_TOP_TOPICS}
          </CardTitle>
          <CardDescription>
            Topics where your errors appear most frequently.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y">
            {top_topics.map((topic) => {
              const recentRate =
                topic.all_time_count > 0
                  ? Math.round(
                      (topic.recent_count / topic.all_time_count) * 100,
                    )
                  : 0;

              return (
                <div key={topic.slug} className="py-3 first:pt-0 last:pb-0">
                  {/* Topic header */}
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-sm font-medium">{topic.slug}</span>
                    <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                      {recentRate > 33 && (
                        <span className="text-foreground/60">
                          {recentRate}% recent
                        </span>
                      )}
                      <span>
                        {topic.recent_count} / {topic.all_time_count}
                      </span>
                    </div>
                  </div>

                  {/* Error label breakdown */}
                  {topic.top_error_labels.length > 0 && (
                    <div className="space-y-1.5">
                      {topic.top_error_labels.map((label) => {
                        const barWidth =
                          topic.all_time_count > 0
                            ? (label.all_time_count / topic.all_time_count) *
                              100
                            : 0;
                        return (
                          <div
                            key={`${topic.slug}-${label.code}`}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-foreground/70">
                              {label.display_name}
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-muted-foreground/40"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="tabular-nums text-muted-foreground/60 min-w-[2.5rem] text-right">
                                {label.recent_count}/{label.all_time_count}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ───────────────────────── Metric Card ───────────────────────── */

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
