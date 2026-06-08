import { useQuery } from "@tanstack/react-query";

import { adminStatsApi } from "@/features/admin/api/stats";
import type { AdminExtendedStats } from "@/features/admin/api/types";

export function useAdminExtendedStats() {
  return useQuery<AdminExtendedStats>({
    queryKey: ["admin", "stats", "extended"],
    queryFn: async () => {
      const res = await adminStatsApi.getExtended();
      return res.data;
    },
    staleTime: 30_000,
  });
}
