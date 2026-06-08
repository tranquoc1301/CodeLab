import api from "@/shared/api";
import { API } from "@/shared/config";

import type { AdminUserItem } from "./types";

export interface AdminUserListParams {
  search?: string;
  is_active?: boolean;
}

export const adminUsersApi = {
  list: (params: AdminUserListParams = {}) => {
    const query: Record<string, string | boolean> = {};
    if (params.search && params.search.trim()) {
      query.search = params.search.trim();
    }
    if (typeof params.is_active === "boolean") {
      query.is_active = params.is_active;
    }
    return api.get<AdminUserItem[]>(API.ENDPOINTS.ADMIN_USERS, {
      params: Object.keys(query).length > 0 ? query : undefined,
    });
  },
};
