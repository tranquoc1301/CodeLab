import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { adminTopicsApi, type AdminTopicListParams } from "@/features/admin/api/topics";
import {
  extractAdminErrorMessage,
  type AdminTopicCreate,
  type AdminTopicItem,
  type AdminTopicUpdate,
} from "@/features/admin/api/types";

const KEY_BASE = ["admin", "topics"] as const;

export function useAdminTopics(params: AdminTopicListParams = {}) {
  return useQuery<AdminTopicItem[]>({
    queryKey: [...KEY_BASE, "list", params],
    queryFn: async () => {
      const res = await adminTopicsApi.list(params);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export function useCreateAdminTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminTopicCreate) =>
      adminTopicsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_BASE });
      toast.success("Topic created");
    },
    onError: (err) => {
      toast.error(extractAdminErrorMessage(err, "Failed to create topic"));
    },
  });
}

export function useUpdateAdminTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdminTopicUpdate }) =>
      adminTopicsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_BASE });
      toast.success("Topic updated");
    },
    onError: (err) => {
      toast.error(extractAdminErrorMessage(err, "Failed to update topic"));
    },
  });
}

export function useDeleteAdminTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminTopicsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_BASE });
      toast.success("Topic deleted");
    },
    onError: (err) => {
      toast.error(extractAdminErrorMessage(err, "Failed to delete topic"));
    },
  });
}
