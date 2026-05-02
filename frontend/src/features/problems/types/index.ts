import type { ProblemSummary as ProblemSummaryType } from "@/features/problems/api";

export interface ListProblemsResponse {
  problems: ProblemSummaryType[];
  total_count: number;
}
