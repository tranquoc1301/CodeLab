import api from "@/shared/api";
import { API } from "@/shared/config";

import type { AdminExtendedStats, AdminStats } from "./types";

export const adminStatsApi = {
  get: () => api.get<AdminStats>(API.ENDPOINTS.ADMIN_STATS),
  getExtended: () => api.get<AdminExtendedStats>(API.ENDPOINTS.ADMIN_STATS_EXTENDED),
};
