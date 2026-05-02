import api from "@/shared/api";
import { API } from "@/shared/config";
import type { Submission } from "@/shared/types";

export const submissionsApi = {
  getAll: (params: { limit: number; offset: number }) =>
    api.get<Submission[]>(API.ENDPOINTS.SUBMISSIONS, { params }),
};
