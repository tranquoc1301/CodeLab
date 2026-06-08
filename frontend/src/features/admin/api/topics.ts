import api from "@/shared/api";
import { API } from "@/shared/config";

import type { AdminTopicCreate, AdminTopicItem, AdminTopicUpdate } from "./types";

export interface AdminTopicListParams {
  search?: string;
}

export const adminTopicsApi = {
  list: (params: AdminTopicListParams = {}) =>
    api.get<AdminTopicItem[]>(API.ENDPOINTS.ADMIN_TOPICS, {
      params: params.search ? { search: params.search.trim() } : undefined,
    }),
  create: (data: AdminTopicCreate) =>
    api.post<AdminTopicItem>(API.ENDPOINTS.ADMIN_TOPICS, data),
  update: (id: number, data: AdminTopicUpdate) =>
    api.patch<AdminTopicItem>(API.ENDPOINTS.ADMIN_TOPIC_DETAIL(id), data),
  remove: (id: number) =>
    api.delete<void>(API.ENDPOINTS.ADMIN_TOPIC_DETAIL(id)),
};
