import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminUsersApi, type AdminUserListParams } from "@/features/admin/api/users";
import type { AdminUserItem, AdminUserUpdate } from "@/features/admin/api/types";

const KEY_BASE = ["admin", "users"] as const;

export function useAdminUsers(params: AdminUserListParams = {}) {
  return useQuery<AdminUserItem[]>({
    queryKey: [...KEY_BASE, "list", params],
    queryFn: async () => {
      const res = await adminUsersApi.list(params);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdminUserUpdate }) =>
      adminUsersApi.update(id, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_BASE });
    },
  });
}
