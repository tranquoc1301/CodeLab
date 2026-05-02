import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  problemsApi,
  problemListApi,
  type ProblemList,
} from "@/features/problems/api";
import type { Problem } from "@/shared/types";
import type { ListProblemsResponse } from "@/features/problems/types";

// --- Problem Detail ---

export function useProblemDetail(slug?: string) {
  return useQuery<Problem>({
    queryKey: ["problem", slug],
    queryFn: async () => {
      const res = await problemsApi.getBySlug(slug!);
      return res.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutes - problem data rarely changes
  });
}

// --- List Detail ---

export function useListDetail(listId: number, enabled: boolean) {
  const listQuery = useQuery<ProblemList>({
    queryKey: ["problemList", listId],
    queryFn: () => problemListApi.get(listId).then((r) => r.data),
    enabled: enabled && !isNaN(listId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const problemsQuery = useQuery<ListProblemsResponse>({
    queryKey: ["listProblems", listId],
    queryFn: () => problemListApi.getProblems(listId).then((r) => r.data),
    enabled: enabled && !isNaN(listId),
    staleTime: 1000 * 60, // 1 minute
  });

  return { listQuery, problemsQuery };
}

export function useListMutations(
  listId: number,
  options?: {
    onBulkRemoveSettled?: () => void;
  },
) {
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: (problemId: number) =>
      problemListApi.removeProblem(listId, problemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listProblems", listId] });
      queryClient.invalidateQueries({ queryKey: ["problemList", listId] });
      toast.success("Problem removed from list");
    },
    onError: () => {
      toast.error("Failed to remove problem from list");
    },
  });

  const bulkRemoveMutation = useMutation({
    mutationFn: async (problemIds: number[]) => {
      await Promise.all(
        problemIds.map((pid) => problemListApi.removeProblem(listId, pid)),
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listProblems", listId] });
      queryClient.invalidateQueries({ queryKey: ["problemList", listId] });
      const count = variables.length;
      toast.success(
        `${count} problem${count !== 1 ? "s" : ""} removed from list`,
      );
      options?.onBulkRemoveSettled?.();
    },
    onError: () => {
      toast.error("Failed to remove problems from list");
      options?.onBulkRemoveSettled?.();
    },
  });

  return { removeMutation, bulkRemoveMutation };
}

// --- Problem Lists ---

export function useProblemLists(userId?: number) {
  return useQuery<ProblemList[]>({
    queryKey: ["problemLists", userId],
    queryFn: () => problemListApi.getAll().then((r) => r.data),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes - user lists don't change often
  });
}

export function useProblemListsMutations(options?: {
  onCreateSuccess?: () => void;
  onEditSuccess?: () => void;
  onDeleteSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      problemListApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      options?.onCreateSuccess?.();
      toast.success("List created successfully");
    },
    onError: () => {
      toast.error("Failed to create list. Please try again.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description?: string } }) =>
      problemListApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      options?.onEditSuccess?.();
      toast.success("List updated successfully");
    },
    onError: () => {
      toast.error("Failed to update list. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => problemListApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      options?.onDeleteSuccess?.();
      toast.success("List deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete list. Please try again.");
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}
