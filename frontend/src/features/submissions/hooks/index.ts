import { useQuery } from "@tanstack/react-query";
import { submissionsApi } from "@/features/submissions/api";
import type { Submission } from "@/shared/types";

export function useSubmissions(page: number, pageSize: number) {
  return useQuery<Submission[]>({
    queryKey: ["submissions", page],
    queryFn: async () => {
      const res = await submissionsApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      return res.data;
    },
    staleTime: 1000 * 30, // 30 seconds - user may submit frequently
    placeholderData: (previousData) => previousData, // Keep previous data while fetching next page
  });
}
