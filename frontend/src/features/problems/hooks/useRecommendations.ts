import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/store/auth";
import {
  fetchRecommendations,
  type RecommendationsResponse,
} from "@/features/problems/api/recommendations";

export function useRecommendations(limit = 6) {
  const { isAuthenticated } = useAuth();

  return useQuery<RecommendationsResponse>({
    queryKey: ["recommendations", limit],
    queryFn: () => fetchRecommendations(limit),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
