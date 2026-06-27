import { useMemo, useState } from "react";
import { FileCode, Filter } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SUBMISSION_STATUS_CONFIG, SUBMISSION_STATUS_FALLBACK, getStatusConfig } from "@/shared/config/status";
import { extractAdminErrorMessage, normalizeAdminSubmission } from "@/features/admin/api/types";
import { useAdminSubmissions } from "@/features/admin/hooks/useAdminSubmissions";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/features/admin/components/AdminDataTable";
import type { AdminSubmissionItem } from "@/features/admin/api/types";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["all", ...Object.keys(SUBMISSION_STATUS_CONFIG)];

function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${ms} ms`;
}

function formatMb(kb: number | null | undefined): string {
  if (kb == null) return "—";
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function SubmissionsPage() {
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const params = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      page,
      page_size: PAGE_SIZE,
    }),
    [status, page],
  );

  const { data, isLoading, error, refetch } = useAdminSubmissions(params);
  const items = useMemo(
    () => (data?.items ?? []).map((s) => normalizeAdminSubmission(s)),
    [data?.items],
  );
  const total = data?.total ?? 0;
  const hasNext = data?.has_next ?? false;

  const columns: AdminColumn<AdminSubmissionItem>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        className: "w-20",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">#{row.id}</span>
        ),
      },
      {
        key: "user",
        header: "User",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.username ?? `User #${row.user_id}`}
            </p>
            {row.username && (
              <p className="truncate text-xs text-muted-foreground">
                #{row.user_id}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "problem",
        header: "Problem",
        render: (row) =>
          row.problem_title ? (
            <div className="min-w-0">
              <p className="truncate">{row.problem_title}</p>
              {row.problem_slug && (
                <p className="truncate text-xs text-muted-foreground">
                  {row.problem_slug}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {row.problem_id == null ? "—" : `Problem #${row.problem_id}`}
            </span>
          ),
      },
      {
        key: "language",
        header: "Language",
        className: "w-28",
        render: (row) => (
          <Badge variant="secondary" className="uppercase">
            {row.language}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "w-40",
        render: (row) => {
          const cfg = getStatusConfig(row.status) ?? SUBMISSION_STATUS_FALLBACK;
          const Icon = cfg.icon;
          return (
            <Badge variant="outline" className={`gap-1 ${cfg.class}`}>
              <Icon className="h-3 w-3" />
              {row.status ?? "Unknown"}
            </Badge>
          );
        },
      },
      {
        key: "time",
        header: "Time",
        className: "w-24 text-right",
        cellClassName: "text-right",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatMs(row.execution_time_ms)}
          </span>
        ),
      },
      {
        key: "memory",
        header: "Memory",
        className: "w-24 text-right",
        cellClassName: "text-right",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatMb(row.memory_used_kb)}
          </span>
        ),
      },
      {
        key: "created",
        header: "Submitted",
        className: "w-36",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Submissions</h2>
        <p className="text-sm text-muted-foreground">
          Read-only log of all submissions across the platform.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to load submissions. {extractAdminErrorMessage(error)}
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-2 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        rows={items}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hasNext={hasNext}
        onPageChange={setPage}
        emptyTitle="No submissions"
        emptyDescription="No submissions match the current filter."
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filter by status:</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />
    </div>
  );
}

export default SubmissionsPage;
