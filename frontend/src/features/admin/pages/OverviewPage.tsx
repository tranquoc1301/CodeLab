import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Code2,
  FileCode,
  RefreshCw,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { useAuth } from "@/app/store/auth";
import { useAdminExtendedStats } from "@/features/admin/hooks/useAdminExtendedStats";
import { getStatusConfig } from "@/shared/config/status";
import { DIFFICULTY_VARIANT } from "@/shared/config/difficulty";
import { ROUTES } from "@/app/router/routes";

interface StatCard {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  href: string;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString();
}

export function OverviewPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = useAdminExtendedStats();

  const cards: StatCard[] = useMemo(
    () => [
      {
        label: "Problems",
        value: data?.problems ?? 0,
        icon: Code2,
        accent: "from-blue-500/15 to-blue-500/0 text-blue-600 dark:text-blue-400",
        href: ROUTES.ADMIN_PROBLEMS,
      },
      {
        label: "Topics",
        value: data?.topics ?? 0,
        icon: Tag,
        accent: "from-purple-500/15 to-purple-500/0 text-purple-600 dark:text-purple-400",
        href: ROUTES.ADMIN_TOPICS,
      },
      {
        label: "Users",
        value: data?.users ?? 0,
        icon: Users,
        accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
        href: ROUTES.ADMIN_USERS,
      },
      {
        label: "Submissions",
        value: data?.submissions ?? 0,
        icon: FileCode,
        accent: "from-amber-500/15 to-amber-500/0 text-amber-600 dark:text-amber-400",
        href: ROUTES.ADMIN_SUBMISSIONS,
      },
    ],
    [data],
  );

  const activeRate = data && data.users > 0
    ? Math.round((data.active_users / data.users) * 100)
    : 0;
  const adminRate = data && data.users > 0
    ? Math.round((data.admin_users / data.users) * 100)
    : 0;

  const acceptedCount = useMemo(
    () =>
      data?.status_distribution.find((s) => s.label === "Accepted")?.value ?? 0,
    [data],
  );
  const acceptanceRate =
    data && data.submissions > 0
      ? Math.round((acceptedCount / data.submissions) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome back{user?.username ? `, ${user.username}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            A quick look at what's happening across the platform.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center text-sm text-destructive sm:flex-row sm:justify-center">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load stats.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.href} className="group">
              <Card className="relative overflow-hidden transition-colors group-hover:border-primary/40">
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`}
                  aria-hidden
                />
                <CardContent className="relative flex items-center gap-4 p-5">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border"
                    aria-hidden
                  >
                    <Icon className={`h-5 w-5 ${card.accent.split(" ").slice(-2).join(" ")}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-20" />
                    ) : (
                      <p className="text-2xl font-semibold leading-none">
                        {card.value.toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Acceptance rate
              </p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <p className="text-xl font-semibold">{acceptanceRate}%</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Active users
              </p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-20" />
              ) : (
                <p className="text-xl font-semibold">
                  {data?.active_users ?? 0}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    ({activeRate}%)
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Admins
              </p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <p className="text-xl font-semibold">
                  {data?.admin_users ?? 0}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    ({adminRate}%)
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Problem difficulty</CardTitle>
            <CardDescription>Distribution by difficulty level</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (data?.difficulty_distribution ?? []).every((d) => d.value === 0) ? (
              <EmptyChart label="No problems yet" />
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.difficulty_distribution ?? []}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {(data?.difficulty_distribution ?? []).map((entry) => (
                        <Cell
                          key={entry.label}
                          fill={entry.color ?? "hsl(var(--muted))"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                  {(data?.difficulty_distribution ?? []).map((entry) => (
                    <span key={entry.label} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: entry.color ?? "hsl(var(--muted))" }}
                      />
                      <span className="text-muted-foreground">
                        {entry.label} · {entry.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Submission outcomes</CardTitle>
            <CardDescription>Top statuses by count</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (data?.status_distribution ?? []).length === 0 ? (
              <EmptyChart label="No submissions yet" />
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.status_distribution ?? []}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {(data?.status_distribution ?? []).map((entry) => (
                        <Cell
                          key={entry.label}
                          fill={entry.color ?? "hsl(var(--primary))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error diagnosis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Error diagnosis</CardTitle>
          <CardDescription>
            Rule-based labels from submission error events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (data?.error_label_distribution ?? []).length === 0 ? (
            <EmptyChart label="No error events recorded yet" />
          ) : (
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.error_label_distribution ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={180}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {(data?.error_label_distribution ?? []).map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={entry.color ?? "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {data && data.error_label_distribution.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {data.error_label_distribution.map((entry) => (
                <span key={entry.label} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: entry.color ?? "hsl(var(--primary))" }}
                  />
                  <span className="text-muted-foreground">
                    {entry.label} · {entry.value}
                  </span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity + Top topics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Top topics</CardTitle>
              <CardDescription>By problem count</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to={ROUTES.ADMIN_TOPICS} className="text-xs">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.top_topics ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No topics created yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {(data?.top_topics ?? []).map((topic) => {
                  const max = Math.max(
                    ...(data?.top_topics ?? []).map((t) => t.problem_count),
                    1,
                  );
                  const pct = Math.round((topic.problem_count / max) * 100);
                  return (
                    <li
                      key={topic.id}
                      className="flex items-center gap-3 rounded-md border bg-card/50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{topic.name}</p>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {topic.problem_count}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>Latest problems and submissions</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link to={ROUTES.ADMIN_PROBLEMS} className="text-xs">
                  Problems
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to={ROUTES.ADMIN_SUBMISSIONS} className="text-xs">
                  Submissions
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-0 md:grid-cols-2">
            {/* Recent problems */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                New problems
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (data?.recent_problems ?? []).length === 0 ? (
                <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                  No problems yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {(data?.recent_problems ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start gap-2 rounded-md border bg-card/50 p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          #{p.problem_id} · {formatRelativeTime(p.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant={DIFFICULTY_VARIANT[p.difficulty] ?? "outline"}
                        className="shrink-0"
                      >
                        {p.difficulty}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent submissions */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                New submissions
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (data?.recent_submissions ?? []).length === 0 ? (
                <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                  No submissions yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {(data?.recent_submissions ?? []).map((s) => {
                    const cfg = getStatusConfig(s.status);
                    const Icon = cfg.icon;
                    return (
                      <li
                        key={s.id}
                        className="flex items-start gap-2 rounded-md border bg-card/50 p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {s.problem_title ?? (s.problem_id != null ? `Problem #${s.problem_id}` : "—")}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {s.username ?? `user #${s.user_id}`} · {s.language} · {formatRelativeTime(s.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline" className={`shrink-0 gap-1 ${cfg.class}`}>
                          <Icon className="h-3 w-3" />
                          {s.status ?? "Unknown"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}
