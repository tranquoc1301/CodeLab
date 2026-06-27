import { useCallback, useMemo, useState } from "react";
import { Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { extractAdminErrorMessage, normalizeAdminUser } from "@/features/admin/api/types";
import { useAdminUsers, useUpdateAdminUser } from "@/features/admin/hooks/useAdminUsers";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/features/admin/components/AdminDataTable";
import { AdminSearchInput } from "@/features/admin/components/AdminSearchInput";
import type { AdminUserItem } from "@/features/admin/api/types";
import { useAuth } from "@/app/store/auth";
import { cn } from "@/shared/utils/utils";

const PAGE_SIZE = 20;

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const updateUser = useUpdateAdminUser();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (value: "all" | "active" | "inactive") => {
    setActiveFilter(value);
    setPage(1);
  };

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

  const total = users.length;
  const start = (page - 1) * PAGE_SIZE;
  const paged = users.slice(start, start + PAGE_SIZE);
  const hasNext = start + paged.length < total;

  const handleRoleChange = useCallback(
    (userId: number, value: string) => {
      updateUser.mutate(
        { id: userId, data: { is_admin: value === "admin" } },
        {
          onSuccess: () => {
            toast.success("Role updated successfully");
          },
          onError: (err) => {
            toast.error(extractAdminErrorMessage(err, "Failed to update role"));
            refetch();
          },
        },
      );
    },
    [updateUser, refetch],
  );

  const handleStatusToggle = useCallback(
    (userId: number, currentActive: boolean) => {
      updateUser.mutate(
        { id: userId, data: { is_active: !currentActive } },
        {
          onSuccess: () => {
            toast.success(
              `User ${!currentActive ? "activated" : "deactivated"} successfully`,
            );
          },
          onError: (err) => {
            toast.error(
              extractAdminErrorMessage(err, "Failed to update status"),
            );
            refetch();
          },
        },
      );
    },
    [updateUser, refetch],
  );

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
        className: "w-[120px]",
        render: (row) => {
          const isSelf = row.id === currentUser?.id;
          return (
            <Select
              value={row.is_admin ? "admin" : "member"}
              onValueChange={(v) => handleRoleChange(row.id, v)}
              disabled={isSelf || updateUser.isPending}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-full text-xs",
                  row.is_admin && "border-primary/50 bg-primary/5",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        className: "w-[100px]",
        render: (row) => {
          const isSelf = row.id === currentUser?.id;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isSelf && !updateUser.isPending) {
                  handleStatusToggle(row.id, row.is_active);
                }
              }}
              disabled={isSelf || updateUser.isPending}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                row.is_active
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
                isSelf ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
            >
              {row.is_active ? "Active" : "Inactive"}
            </button>
          );
        },
      },
      {
        key: "submissions",
        header: "Submissions",
        className: "w-[100px] text-right",
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
        className: "w-[100px]",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [currentUser?.id, updateUser.isPending, handleRoleChange, handleStatusToggle],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Manage user roles and account status.
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
              onChange={handleSearchChange}
              placeholder="Search by username or email..."
            />
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <Select
                value={activeFilter}
                onValueChange={(v) =>
                  handleFilterChange(v as "all" | "active" | "inactive")
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
