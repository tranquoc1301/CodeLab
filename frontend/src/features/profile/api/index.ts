import api from "@/shared/api";
import { API } from "@/shared/config";
import type { ErrorProfileResponse } from "@/shared/types";

export const profileApi = {
  getErrorProfile: () =>
    api.get<ErrorProfileResponse>(API.ENDPOINTS.PROFILE_ERROR_PROFILE),
};
