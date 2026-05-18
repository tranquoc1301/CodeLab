import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/app/store/auth";
import { profileApi } from "@/features/profile/api";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { COPY, DEFAULTS } from "@/shared/config";
import type { ErrorLabelProfileCard } from "@/shared/types";

export default function Profile() {
  const { isAuthenticated, user } = useAuth();
  const errorProfileQuery = useQuery({
    queryKey: ["profile", "errorProfile", user?.id],
    queryFn: () => profileApi.getErrorProfile().then((response) => response.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  const chartData = useMemo(
    () =>
      (errorProfileQuery.data?.chart.labels ?? []).map((item) => ({
        name: shortenLabel(item.display_name),
        fullName: item.display_name,
        recent: item.recent_count,
        lifetime: item.lifetime_count,
      })),
    [errorProfileQuery.data],
  );

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground text-lg">
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
            errorProfileQuery.data.totals.lifetime_profiled_submissions > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label={COPY.PROFILE.ERROR_PROFILE_RECENT}
                  value={errorProfileQuery.data.totals.recent_profiled_submissions}
                  hint={`${errorProfileQuery.data.recent_window_days} days`}
                />
                <MetricCard
                  label={COPY.PROFILE.ERROR_PROFILE_LIFETIME}
                  value={errorProfileQuery.data.totals.lifetime_profiled_submissions}
                  hint="All tracked submit failures"
                />
                <MetricCard
                  label={COPY.PROFILE.ERROR_PROFILE_WINDOW}
                  value={errorProfileQuery.data.recent_window_days}
                  hint="Days used for recent trends"
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {COPY.PROFILE.ERROR_PROFILE_CHART_TITLE}
                    </CardTitle>
                    <CardDescription>
                      {COPY.PROFILE.ERROR_PROFILE_CHART_DESCRIPTION}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 16, left: -12, bottom: 8 }}
                        >
                          <CartesianGrid
                            stroke="hsl(var(--border))"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            stroke="hsl(var(--muted-foreground))"
                            interval={0}
                            angle={-10}
                            textAnchor="end"
                            height={56}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <Tooltip
                            cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
                            formatter={(value, name) => [
                              typeof value === "number" ? value : Number(value ?? 0),
                              name === "recent" ? "Recent" : "Lifetime",
                            ]}
                            labelFormatter={(_label, payload) =>
                              payload?.[0]?.payload?.fullName ?? ""
                            }
                          />
                          <Bar
                            dataKey="recent"
                            name="recent"
                            fill="hsl(var(--chart-2))"
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="lifetime"
                            name="lifetime"
                            fill="hsl(var(--chart-4))"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {COPY.PROFILE.ERROR_PROFILE_TOP_LABELS}
                  </h2>
                  {errorProfileQuery.data.top_labels.map((label) => (
                    <WeaknessCard key={label.code} label={label} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{COPY.PROFILE.ERROR_PROFILE_EMPTY}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="h-80 rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

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
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function WeaknessCard({ label }: { label: ErrorLabelProfileCard }) {
  const trend =
    label.trend_delta > 0
      ? COPY.PROFILE.ERROR_PROFILE_TREND_UP
      : label.trend_delta < 0
        ? COPY.PROFILE.ERROR_PROFILE_TREND_DOWN
        : COPY.PROFILE.ERROR_PROFILE_TREND_FLAT;

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{label.display_name}</CardTitle>
            <CardDescription className="mt-1">
              {COPY.PROFILE.ERROR_PROFILE_SHARE}:{" "}
              {Math.round(label.recent_share * 100)}%
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {label.recent_count} recent
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Lifetime {label.lifetime_count}</span>
          <span className="text-border">/</span>
          <span className="inline-flex items-center gap-1">
            {label.trend_delta >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend} {Math.abs(label.trend_delta)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {COPY.PROFILE.ERROR_PROFILE_DETAIL}
          </p>
          <p className="mt-1 font-medium">{label.top_detail.display_name}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {COPY.PROFILE.ERROR_PROFILE_TOPICS}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {label.top_topics.map((topic) => (
              <Badge key={topic.slug} variant="outline" className="font-normal">
                {topic.slug} · {topic.count}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {COPY.PROFILE.ERROR_PROFILE_PRACTICE}
          </p>
          <p className="mt-1 text-muted-foreground">{label.practice_focus}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function shortenLabel(label: string) {
  return label
    .replace(" Error", "")
    .replace(" & ", " / ")
    .replace("Complexity / TLE", "Complexity");
}
