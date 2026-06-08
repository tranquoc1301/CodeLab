import { useQuery } from "@tanstack/react-query";

import { adminStatsApi } from "@/features/admin/api/stats";
import type { AdminStats } from "@/features/admin/api/types";

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await adminStatsApi.get();
      return res.data;
    },
    staleTime: 60_000,
  });
}
