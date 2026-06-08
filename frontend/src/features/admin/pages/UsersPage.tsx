import { useEffect, useMemo, useState } from "react";
import { Users as UsersIcon, ShieldCheck, ShieldOff } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { extractAdminErrorMessage, normalizeAdminUser } from "@/features/admin/api/types";
import { useAdminUsers } from "@/features/admin/hooks/useAdminUsers";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/features/admin/components/AdminDataTable";
import { AdminSearchInput } from "@/features/admin/components/AdminSearchInput";
import type { AdminUserItem } from "@/features/admin/api/types";

const PAGE_SIZE = 20;

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  const params = useMemo(() => {
    const is_active = activeFilter === "all" ? undefined : activeFilter === "active";
    return {
      search: search.trim() || undefined,
      is_active,
    };
  }, [search, activeFilter]);

  const { data, isLoading, error, refetch } = useAdminUsers(params);
  const users = useMemo(
    () => (data ?? []).map((u) => normalizeAdminUser(u)),
    [data],
  );

  // simple client-side pagination because endpoint returns full list
  const total = users.length;
  const start = (page - 1) * PAGE_SIZE;
  const paged = users.slice(start, start + PAGE_SIZE);
  const hasNext = start + paged.length < total;

  const columns: AdminColumn<AdminUserItem>[] = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {row.username?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.username}</p>
              <p className="truncate text-xs text-muted-foreground">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        className: "w-32",
        render: (row) =>
          row.is_admin ? (
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <ShieldOff className="h-3 w-3" />
              Member
            </Badge>
          ),
      },
      {
        key: "status",
        header: "Status",
        className: "w-28",
        render: (row) =>
          row.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
      },
      {
        key: "submissions",
        header: "Submissions",
        className: "w-32 text-right",
        cellClassName: "text-right",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.submission_count.toLocaleString()}
          </span>
        ),
      },
      {
        key: "joined",
        header: "Joined",
        className: "w-36",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Read-only directory of all registered users.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to load users. {extractAdminErrorMessage(error)}
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
        rows={paged}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hasNext={hasNext}
        onPageChange={setPage}
        emptyTitle="No users"
        emptyDescription="No users match your filters."
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by username or email..."
            />
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <Select
                value={activeFilter}
                onValueChange={(v) =>
                  setActiveFilter(v as "all" | "active" | "inactive")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />
    </div>
  );
}

export default UsersPage;
