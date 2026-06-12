import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Code2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ROUTES } from "@/app/router";
import { DIFFICULTY_VARIANT } from "@/shared/config/difficulty";
import { extractAdminErrorMessage } from "@/features/admin/api/types";
import {
  useAdminProblems,
  useDeleteAdminProblem,
} from "@/features/admin/hooks/useAdminProblems";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/features/admin/components/AdminDataTable";
import { AdminSearchInput } from "@/features/admin/components/AdminSearchInput";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import type { AdminProblemListItem } from "@/features/admin/api/types";

export function ProblemsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = Number(searchParams.get("page") ?? "1") || 1;
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (search) next.search = search;
    if (page > 1) next.page = String(page);
    setSearchParams(next, { replace: true });
  }, [search, page, setSearchParams]);

  const { data, isLoading, error, refetch } = useAdminProblems({ search, page });
  const problems = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = data?.has_next ?? false;

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMutation = useDeleteAdminProblem();

  const handleConfirmDelete = () => {
    if (deleteId == null) return;
    deleteMutation.mutate(deleteId, {
      onSettled: () => setDeleteId(null),
    });
  };

  const columns: AdminColumn<AdminProblemListItem>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        className: "w-16",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.frontend_id}
          </span>
        ),
      },
      {
        key: "title",
        header: "Title",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        ),
      },
      {
        key: "difficulty",
        header: "Difficulty",
        className: "w-28",
        render: (row) => (
          <Badge
            variant={DIFFICULTY_VARIANT[row.difficulty] ?? "outline"}
            className="capitalize"
          >
            {row.difficulty}
          </Badge>
        ),
      },
      {
        key: "topics",
        header: "Topics",
        render: (row) => (
          <div className="flex max-w-xs flex-wrap gap-1">
            {row.topics.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              row.topics.slice(0, 3).map((t) => (
                <Badge key={t.id} variant="secondary" className="text-xs">
                  {t.name}
                </Badge>
              ))
            )}
            {row.topics.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{row.topics.length - 3}
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: "created",
        header: "Created",
        className: "w-40",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        className: "w-24 text-right",
        cellClassName: "text-right",
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Edit problem ${row.title}`}
              onClick={() => navigate(ROUTES.adminProblemEdit(row.id))}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Delete problem ${row.title}`}
              onClick={() => setDeleteId(row.id)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Problems</h2>
          <p className="text-sm text-muted-foreground">
            Create, edit, and remove problems.
          </p>
        </div>
        <Button
              onClick={() => navigate(ROUTES.ADMIN_PROBLEM_CREATE)}
          className="self-start sm:self-auto"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add problem
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to load problems. {extractAdminErrorMessage(error)}
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        rows={problems}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        page={page}
        pageSize={20}
        total={total}
        hasNext={hasNext}
        onPageChange={setPage}
        emptyTitle="No problems yet"
        emptyDescription="Create your first problem using the Add problem button."
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <AdminSearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by title..."
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Code2 className="h-4 w-4" />
              <span>{total} total</span>
            </div>
          </div>
        }
      />

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
        title="Delete problem"
        description="This action cannot be undone. The problem and all related data will be permanently removed."
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default ProblemsPage;
