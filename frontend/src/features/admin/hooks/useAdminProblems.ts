import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { adminProblemsApi, type AdminProblemListParams } from "@/features/admin/api/problems";
import {
  extractAdminErrorMessage,
  type AdminPaginatedResponse,
  type AdminProblemCreate,
  type AdminProblemDetail,
  type AdminProblemListItem,
  type AdminProblemUpdate,
} from "@/features/admin/api/types";

const KEY_BASE = ["admin", "problems"] as const;

export function useAdminProblems(params: AdminProblemListParams) {
  return useQuery<AdminPaginatedResponse<AdminProblemListItem>>({
    queryKey: [...KEY_BASE, "list", params],
    queryFn: async () => {
      const res = await adminProblemsApi.list(params);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useAdminProblem(id: number | null) {
  return useQuery<AdminProblemDetail>({
    queryKey: [...KEY_BASE, "detail", id],
    queryFn: async () => {
      if (id == null) throw new Error("Missing problem id");
      const res = await adminProblemsApi.get(id);
      return res.data;
    },
    enabled: id != null,
    staleTime: 30_000,
  });
}

export function useCreateAdminProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminProblemCreate) =>
      adminProblemsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_BASE });
      toast.success("Problem created");
    },
    onError: (err) => {
      toast.error(extractAdminErrorMessage(err, "Failed to create problem"));
    },
  });
}

export function useUpdateAdminProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdminProblemUpdate }) =>
      adminProblemsApi.update(id, data).then((r) => r.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: KEY_BASE });
      queryClient.invalidateQueries({ queryKey: [...KEY_BASE, "detail", vars.id] });
      toast.success("Problem updated");
    },
    onError: (err) => {
      toast.error(extractAdminErrorMessage(err, "Failed to update problem"));
    },
  });
}

export function useDeleteAdminProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminProblemsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_BASE });
      toast.success("Problem deleted");
    },
    onError: (err) => {
      toast.error(extractAdminErrorMessage(err, "Failed to delete problem"));
    },
  });
}
