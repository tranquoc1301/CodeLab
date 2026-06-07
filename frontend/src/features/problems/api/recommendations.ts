import api from "@/shared/api";

export interface RecommendedProblem {
  problem_id: number;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  dominant_error_label: string | null;
  dominant_error_display: string;
  reason: string;
  topic_slugs?: string[];
  attempt_count?: number;
}

export interface RecommendationsResponse {
  items: RecommendedProblem[];
}

export async function fetchRecommendations(
  limit = 6,
): Promise<RecommendationsResponse> {
  const response = await api.get<{
    recommendations: RecommendedProblem[];
  }>("/recommend/problems", {
    params: { limit },
  });
  return {
    items: response.data.recommendations ?? [],
  };
}
