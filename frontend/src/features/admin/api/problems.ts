import api from "@/shared/api";
import { API } from "@/shared/config";

import type {
  AdminPaginatedResponse,
  AdminProblemCreate,
  AdminProblemDetail,
  AdminProblemListItem,
  AdminProblemUpdate,
} from "./types";

export interface AdminProblemListParams {
  search?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "";
  topic?: string;
  page?: number;
  page_size?: number;
}

function cleanParams(params: AdminProblemListParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (params.search && params.search.trim()) {
    out.search = params.search.trim();
  }
  if (params.difficulty) {
    out.difficulty = params.difficulty;
  }
  if (params.topic) {
    out.topic = params.topic;
  }
  out.page = params.page ?? 1;
  out.page_size = params.page_size ?? 20;
  return out;
}

export const adminProblemsApi = {
  list: (params: AdminProblemListParams) =>
    api.get<AdminPaginatedResponse<AdminProblemListItem>>(
      API.ENDPOINTS.ADMIN_PROBLEMS,
      { params: cleanParams(params) },
    ),
  get: (id: number) =>
    api.get<AdminProblemDetail>(API.ENDPOINTS.ADMIN_PROBLEM_DETAIL(id)),
  create: (data: AdminProblemCreate) =>
    api.post<AdminProblemDetail>(API.ENDPOINTS.ADMIN_PROBLEMS, data),
  update: (id: number, data: AdminProblemUpdate) =>
    api.patch<AdminProblemDetail>(API.ENDPOINTS.ADMIN_PROBLEM_DETAIL(id), data),
  remove: (id: number) =>
    api.delete<void>(API.ENDPOINTS.ADMIN_PROBLEM_DETAIL(id)),
};
