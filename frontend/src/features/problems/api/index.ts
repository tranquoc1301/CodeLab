import api from "@/shared/api";
import { API } from "@/shared/config";
import type { Problem } from "@/shared/types";

export const problemsApi = {
  getBySlug: (slug: string) =>
    api.get<Problem>(API.ENDPOINTS.PROBLEM_BY_SLUG(slug)),
};

export { problemListApi, type ProblemList, type ProblemListCreate, type ProblemListUpdate, type ProblemSummary } from "./problem-lists";
