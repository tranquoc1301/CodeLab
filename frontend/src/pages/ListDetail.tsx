import { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2,
  Check,
  X,
  Loader2,
  ListChecks,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import {
  problemListApi,
  type ProblemList,
  type ProblemSummary as ProblemSummaryType,
} from "@/api/problem-lists";
import { ROUTES } from "@/config";
import { Button, toast } from "@/components/ui";
import { ProblemCard } from "@/components/pages/home/ProblemCard";
import { cn } from "@/lib/utils";

interface ListProblemsResponse {
  problems: ProblemSummaryType[];
  total_count: number;
}

export default function ListDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { id } = useParams<{ id: string }>();
  const numericListId = Number(id);

  // State
  const [selectedProblems, setSelectedProblems] = useState<Set<number>>(
    new Set(),
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Queries
  const { data: list, isLoading: isLoadingList } = useQuery<ProblemList>({
    queryKey: ["problemList", numericListId],
    queryFn: () => problemListApi.get(numericListId).then((r) => r.data),
    enabled: isAuthenticated && !isNaN(numericListId),
  });

  const { data: listProblems, isLoading: isLoadingProblems } =
    useQuery<ListProblemsResponse>({
      queryKey: ["listProblems", numericListId],
      queryFn: () =>
        problemListApi.getProblems(numericListId).then((r) => r.data),
      enabled: isAuthenticated && !isNaN(numericListId),
    });

  // Derived Data
  const problems = useMemo(() => listProblems?.problems ?? [], [listProblems]);
  const totalCount = useMemo(
    () => listProblems?.total_count ?? list?.problem_count ?? 0,
    [listProblems, list],
  );

  // Mutations
  const removeMutation = useMutation({
    mutationFn: (problemId: number) =>
      problemListApi.removeProblem(numericListId, problemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listProblems", numericListId],
      });
      queryClient.invalidateQueries({
        queryKey: ["problemList", numericListId],
      });
      toast.success("Problem removed from list");
    },
    onError: () => {
      toast.error("Failed to remove problem from list");
    },
  });

  const bulkRemoveMutation = useMutation({
    mutationFn: async (problemIds: number[]) => {
      await Promise.all(
        problemIds.map((pid) =>
          problemListApi.removeProblem(numericListId, pid),
        ),
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["listProblems", numericListId],
      });
      queryClient.invalidateQueries({
        queryKey: ["problemList", numericListId],
      });
      const count = variables.length;
      setSelectedProblems(new Set());
      setIsSelectionMode(false);
      toast.success(
        `${count} problem${count !== 1 ? "s" : ""} removed from list`,
      );
    },
    onError: () => {
      setSelectedProblems(new Set());
      setIsSelectionMode(false);
      toast.error("Failed to remove problems from list");
    },
  });

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
      <div className="py-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {list.name}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {totalCount} problem{totalCount !== 1 ? "s" : ""} in this list
            </p>
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
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border animate-in slide-in-from-top-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {selectedProblems.size}
            </div>
            <span className="text-sm font-medium">selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-muted-foreground hover:text-foreground"
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkRemoveMutation.isPending}
              className="min-w-[120px]"
            >
              {bulkRemoveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Problem List */}
      {isLoadingProblems ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : problems.length > 0 ? (
        <div className="flex flex-col gap-2">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg border border-border p-2 transition-all duration-200",
                isSelectionMode && selectedProblems.has(problem.id)
                  ? "bg-muted border-primary"
                  : isSelectionMode
                    ? "hover:bg-muted/50 cursor-pointer"
                    : "hover:bg-muted/30",
              )}
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
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">No problems in this list yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add problems from the problems page using the bookmark button
          </p>
        </div>
      )}
    </div>
  );
}
