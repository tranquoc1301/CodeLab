import { useQuery } from "@tanstack/react-query";

import { adminSubmissionsApi, type AdminSubmissionListParams } from "@/features/admin/api/submissions";
import type { AdminPaginatedResponse, AdminSubmissionItem } from "@/features/admin/api/types";

const KEY_BASE = ["admin", "submissions"] as const;

export function useAdminSubmissions(params: AdminSubmissionListParams) {
  return useQuery<AdminPaginatedResponse<AdminSubmissionItem>>({
    queryKey: [...KEY_BASE, "list", params],
    queryFn: async () => {
      const res = await adminSubmissionsApi.list(params);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
