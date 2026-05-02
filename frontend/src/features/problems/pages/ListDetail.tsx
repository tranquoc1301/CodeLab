import { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Trash2,
  Check,
  X,
  Loader2,
  ListChecks,
  FolderOpen,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/app/store/auth";
import { ROUTES } from "@/app/router";
import { ProblemCard } from "@/features/problems/components/ProblemCard";
import { cn } from "@/shared/utils/utils";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ProblemCardSkeleton } from "@/features/problems/components/ProblemCardSkeleton";
import { useListDetail, useListMutations } from "@/features/problems/hooks";

export default function ListDetail() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { id } = useParams<{ id: string }>();
  const numericListId = Number(id);

  // State
  const [selectedProblems, setSelectedProblems] = useState<Set<number>>(
    new Set(),
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Queries
  const { listQuery, problemsQuery } = useListDetail(
    numericListId,
    isAuthenticated,
  );
  const { data: list, isLoading: isLoadingList } = listQuery;
  const { data: listProblems, isLoading: isLoadingProblems } = problemsQuery;

  // Derived Data
  const problems = useMemo(() => listProblems?.problems ?? [], [listProblems]);
  const totalCount = useMemo(
    () => listProblems?.total_count ?? list?.problem_count ?? 0,
    [listProblems, list],
  );

  // Mutations
  const resetSelection = useCallback(() => {
    setSelectedProblems(new Set());
    setIsSelectionMode(false);
  }, []);

  const { removeMutation, bulkRemoveMutation } = useListMutations(
    numericListId,
    { onBulkRemoveSettled: resetSelection },
  );

  // Handlers
  const handleProblemClick = useCallback(
    (problemSlug: string) => {
      navigate(ROUTES.problemDetail(problemSlug));
    },
    [navigate],
  );

  const handleProblemKeyDown = useCallback(
    (e: React.KeyboardEvent, problemSlug: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleProblemClick(problemSlug);
      }
    },
    [handleProblemClick],
  );

  const handleRemoveProblem = useCallback(
    (problemId: number) => {
      removeMutation.mutate(problemId);
    },
    [removeMutation],
  );

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (!prev) {
        setSelectedProblems(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleProblemSelection = useCallback((problemId: number) => {
    setSelectedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedProblems((prev) => {
      if (prev.size === problems.length && problems.length > 0) {
        return new Set();
      } else {
        return new Set(problems.map((p) => p.id));
      }
    });
  }, [problems]);

  const handleBulkDelete = useCallback(() => {
    bulkRemoveMutation.mutate(Array.from(selectedProblems));
  }, [selectedProblems, bulkRemoveMutation]);

  // Derived State
  const isAllSelected =
    selectedProblems.size === problems.length && problems.length > 0;
  const isSomeSelected = selectedProblems.size > 0;
  const canShowDelete = list && !isLoadingList;

  // Early Returns
  if (isLoadingList || !canShowDelete) {
    return (
      <div className="py-6 space-y-6">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProblemCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Back Navigation */}
      <Link
        to={ROUTES.problemLists()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        My Lists
      </Link>

      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {list.name}
              </h1>
              <Badge
                variant="secondary"
                className="shrink-0 text-xs font-normal"
              >
                {totalCount} problem{totalCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            {list.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {list.description}
              </p>
            )}
          </div>

          {problems.length > 0 && (
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
              className={cn(
                "shrink-0 transition-all duration-200",
                isSelectionMode && "bg-primary hover:bg-primary/90",
              )}
            >
              {isSelectionMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <ListChecks className="h-4 w-4 mr-2" />
                  Select
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isSelectionMode && isSomeSelected
            ? "max-h-20 opacity-100"
            : "max-h-0 opacity-0",
        )}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/60 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Badge className="h-7 min-w-[1.75rem] px-2 text-xs font-semibold">
              {selectedProblems.size}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkRemoveMutation.isPending}
              className="min-w-[100px]"
            >
              {bulkRemoveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Problem List */}
      {isLoadingProblems ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProblemCardSkeleton key={i} />
          ))}
        </div>
      ) : problems.length > 0 ? (
        <div className="flex flex-col gap-2">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className={cn("group relative flex items-center gap-3")}
            >
              {isSelectionMode && (
                <div
                  role="checkbox"
                  aria-checked={selectedProblems.has(problem.id)}
                  tabIndex={0}
                  onClick={() => toggleProblemSelection(problem.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleProblemSelection(problem.id);
                    }
                  }}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selectedProblems.has(problem.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-muted-foreground/50",
                  )}
                >
                  {selectedProblems.has(problem.id) && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <ProblemCard
                  problem={problem}
                  onClick={() => handleProblemClick(problem.slug)}
                  onKeyDown={(e) => handleProblemKeyDown(e, problem.slug)}
                  isAuthenticated={isAuthenticated}
                />
              </div>
              {!isSelectionMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveProblem(problem.id);
                  }}
                  disabled={removeMutation.isPending}
                  className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Remove from list"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border/30">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">No problems in this list yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
            Browse problems and use the bookmark button to add them to this list.
          </p>
        </div>
      )}
    </div>
  );
}
