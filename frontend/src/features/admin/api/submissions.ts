import api from "@/shared/api";
import { API } from "@/shared/config";

import type { AdminPaginatedResponse, AdminSubmissionItem } from "./types";

export interface AdminSubmissionListParams {
  status?: string;
  problem_id?: number;
  user_id?: number;
  page?: number;
  page_size?: number;
}

function cleanParams(params: AdminSubmissionListParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (params.status) out.status = params.status;
  if (params.problem_id) out.problem_id = params.problem_id;
  if (params.user_id) out.user_id = params.user_id;
  out.page = params.page ?? 1;
  out.page_size = params.page_size ?? 20;
  return out;
}

export const adminSubmissionsApi = {
  list: (params: AdminSubmissionListParams) =>
    api.get<AdminPaginatedResponse<AdminSubmissionItem>>(
      API.ENDPOINTS.ADMIN_SUBMISSIONS,
      { params: cleanParams(params) },
    ),
};
