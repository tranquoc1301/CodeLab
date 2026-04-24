import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Plus, Check, Loader2, AlertCircle } from "lucide-react";
import { problemListApi, type ProblemList } from "@/api/problem-lists";
import { useAuth } from "@/store/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface BookmarkButtonProps {
  problemId: number;
  className?: string;
}

interface ListContainingProblem {
  id: number;
  name: string;
}

export function BookmarkButton({ problemId, className = "" }: BookmarkButtonProps) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
      setOpen(false);
      setShowCreateForm(false);
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  // Fetch user's problem lists
  const { data: lists, isLoading } = useQuery<ProblemList[]>({
    queryKey: ["problemLists"],
    queryFn: () => problemListApi.getAll().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes - user lists don't change often
  });

  // Get lists that contain this specific problem
  const { data: listsContainingProblem } = useQuery<ListContainingProblem[]>({
    queryKey: ["problemLists", "containing", problemId],
    queryFn: () => problemListApi.getListsContainingProblem(problemId).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minute - quick stale
  });

  // Add problem to list mutation
  const addMutation = useMutation({
    mutationFn: ({ listId }: { listId: number }) =>
      problemListApi.addProblem(listId, problemId),
    onMutate: async ({ listId }) => {
      await queryClient.cancelQueries({ queryKey: ["problemLists", "containing", problemId] });

      const previousData = queryClient.getQueryData<ListContainingProblem[]>([
        "problemLists",
        "containing",
        problemId,
      ]);

      if (previousData) {
        // Find the list name from the lists we have
        const list = lists?.find(l => l.id === listId);
        if (list) {
          queryClient.setQueryData<ListContainingProblem[]>(
            ["problemLists", "containing", problemId],
            [...previousData, { id: listId, name: list.name }]
          );
        }
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["problemLists", "containing", problemId],
          context.previousData
        );
      }
      setError("Problem is already in this list");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      queryClient.invalidateQueries({ queryKey: ["problemLists", "containing", problemId] });
    },
  });

  // Remove problem from list mutation
  const removeMutation = useMutation({
    mutationFn: ({ listId }: { listId: number }) =>
      problemListApi.removeProblem(listId, problemId),
    onMutate: async ({ listId }) => {
      await queryClient.cancelQueries({ queryKey: ["problemLists", "containing", problemId] });

      const previousData = queryClient.getQueryData<ListContainingProblem[]>([
        "problemLists",
        "containing",
        problemId,
      ]);

      if (previousData) {
        queryClient.setQueryData<ListContainingProblem[]>(
          ["problemLists", "containing", problemId],
          previousData.filter(l => l.id !== listId)
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["problemLists", "containing", problemId],
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      queryClient.invalidateQueries({ queryKey: ["problemLists", "containing", problemId] });
    },
  });

  // Create list mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const newList = await problemListApi.create({
        name: newListName.trim(),
        description: newListDescription.trim() || undefined,
      });
      return newList.data;
    },
    onSuccess: async (newList) => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      // Properly await the add mutation to avoid race condition
      try {
        await addMutation.mutateAsync({ listId: newList.id });
      } catch (addError) {
        // Handle case where problem might already be in list or other error
        // The addMutation's onError will handle rolling back the optimistic update
        console.warn("Failed to add problem to newly created list:", addError);
      }
      setNewListName("");
      setNewListDescription("");
      setShowCreateForm(false);
    },
    onError: () => {
      setError("Failed to create list. Please try again.");
    },
  });

  const handleToggleList = (listId: number, isChecked: boolean) => {
    setError(null);
    if (isChecked) {
      addMutation.mutate({ listId });
    } else {
      removeMutation.mutate({ listId });
    }
  };

  const handleCreateList = () => {
    if (!newListName.trim()) {
      setError("List name is required");
      return;
    }
    createMutation.mutate();
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setOpen(!open);
  };

  const isAdding = addMutation.isPending;
  const isRemoving = removeMutation.isPending;
  const isCreating = createMutation.isPending;

  // Build a set of list IDs containing this problem for quick lookup
  const problemListIds = new Set(
    listsContainingProblem?.map(l => l.id) ?? []
  );

  const isInAnyList = problemListIds.size > 0;

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        onClick={handleButtonClick}
        className="p-2 rounded-md hover:bg-accent transition-colors"
        aria-label={isInAnyList ? "Remove from lists" : "Add to list"}
        title={isInAnyList ? "In your lists" : "Add to list"}
      >
        <Bookmark
          className={`h-4 w-4 ${
            isInAnyList ? "fill-current text-primary" : "text-muted-foreground"
          }`}
          aria-hidden
        />
      </button>

      {open && isAuthenticated && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg p-3 z-50 animate-scale-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-popover-foreground">
              Save to list
            </h3>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded-md">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : lists && lists.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {lists.map((list) => {
                const isChecked = problemListIds.has(list.id);
                const isPending =
                  (isAdding && addMutation.variables?.listId === list.id) ||
                  (isRemoving && removeMutation.variables?.listId === list.id);

                return (
                  <label
                    key={list.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isPending}
                        onChange={() => handleToggleList(list.id, !isChecked)}
                        className="sr-only"
                      />
                      <div
                        className={`h-4 w-4 rounded border border-input flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-primary border-primary"
                            : "bg-background"
                        }`}
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
                        ) : isChecked ? (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        ) : null}
                      </div>
                    </div>
                    <span className="text-sm text-popover-foreground truncate flex-1">
                      {list.name}
                    </span>
                    {list.problem_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {list.problem_count}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2">
              No lists yet. Create your first list below.
            </div>
          )}

          {/* Divider */}
          {(lists && lists.length > 0) || showCreateForm ? (
            <div className="border-t border-border my-2" />
          ) : null}

          {/* Create new list */}
          {showCreateForm ? (
            <div className="space-y-2">
              <Input
                placeholder="List name"
                value={newListName}
                onChange={(e) => {
                  setNewListName(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateList();
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <Input
                placeholder="Description (optional)"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateList();
                }}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateList}
                  disabled={isCreating || !newListName.trim()}
                  className="h-7 flex-1 text-xs"
                >
                  {isCreating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewListName("");
                    setNewListDescription("");
                    setError(null);
                  }}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-sm text-popover-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create new list</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}