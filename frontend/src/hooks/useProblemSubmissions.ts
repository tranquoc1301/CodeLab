import { useQuery } from "@tanstack/react-query";
import api from "@/api";
import { API } from "@/config";
import type { SubmissionResult } from "@/types";

export function useProblemSubmissions(problemId: number | undefined, enabled: boolean) {
  return useQuery<SubmissionResult[]>({
    queryKey: ["submissions", "problem", problemId],
    queryFn: async () => {
      const res = await api.get(API.ENDPOINTS.SUBMISSIONS_BY_PROBLEM(problemId!));
      return res.data;
    },
    enabled: !!problemId && enabled,
    staleTime: 10_000,
  });
}