import type { Topic } from "@/shared/types";

export interface AdminTopicRef {
  id: number;
  name: string;
  slug: string;
}

export interface AdminExample {
  id?: number;
  example_num: number;
  example_text: string;
  images: string[];
}

export interface AdminConstraint {
  id?: number;
  sort_order: number;
  constraint_text: string;
}

export interface AdminHint {
  id?: number;
  hint_num: number;
  hint_text: string;
}

export interface AdminCodeSnippet {
  id?: number;
  language: string;
  code: string;
}

export interface AdminProblemListItem {
  id: number;
  problem_id: number;
  frontend_id: number;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  topics: AdminTopicRef[];
  created_at: string;
  updated_at: string;
}

export interface AdminProblemDetail {
  id: number;
  problem_id: number;
  frontend_id: number;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  description: string | null;
  topics: AdminTopicRef[];
  examples: AdminExample[];
  constraints: AdminConstraint[];
  hints: AdminHint[];
  code_snippets: AdminCodeSnippet[];
  created_at: string;
  updated_at: string;
}

export interface AdminProblemCreate {
  problem_id: number;
  frontend_id: number;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description?: string | null;
  topics: string[];
  examples: AdminExample[];
  constraints: AdminConstraint[];
  hints: AdminHint[];
  code_snippets: AdminCodeSnippet[];
}

export interface AdminProblemUpdate {
  title?: string;
  slug?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  description?: string | null;
  topics?: string[];
  examples?: AdminExample[];
  constraints?: AdminConstraint[];
  hints?: AdminHint[];
  code_snippets?: AdminCodeSnippet[];
}

export interface AdminTopicItem {
  id: number;
  name: string;
  slug: string;
  problem_count: number;
  created_at: string | null;
}

export interface AdminTopicCreate {
  name: string;
  slug?: string;
}

export interface AdminTopicUpdate {
  name?: string;
  slug?: string;
}

export interface AdminUserItem {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  submission_count: number;
}

export interface AdminSubmissionItem {
  id: number;
  user_id: number;
  username: string | null;
  problem_id: number | null;
  problem_slug: string | null;
  problem_title: string | null;
  language: string;
  status: string | null;
  execution_time_ms: number | null;
  memory_used_kb: number | null;
  created_at: string;
}

export interface AdminPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface AdminStats {
  problems: number;
  topics: number;
  users: number;
  submissions: number;
}

export interface AdminDistributionItem {
  label: string;
  value: number;
  color: string | null;
}

export interface AdminExtendedStats {
  problems: number;
  topics: number;
  users: number;
  submissions: number;
  active_users: number;
  admin_users: number;
  difficulty_distribution: AdminDistributionItem[];
  status_distribution: AdminDistributionItem[];
  error_label_distribution: AdminDistributionItem[];
  top_topics: AdminTopicItem[];
  recent_problems: AdminProblemListItem[];
  recent_submissions: AdminSubmissionItem[];
}

// --- Defensive normalization helpers ---

export function normalizeAdminProblem(
  raw: Partial<AdminProblemListItem> | Partial<AdminProblemDetail> | undefined | null,
): AdminProblemListItem | AdminProblemDetail {
  const fallback: AdminProblemListItem = {
    id: 0,
    problem_id: 0,
    frontend_id: 0,
    title: "Untitled",
    slug: "untitled",
    difficulty: "Easy",
    topics: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
  if (!raw || typeof raw !== "object") return fallback;
  return {
    ...fallback,
    ...raw,
    topics: Array.isArray(raw.topics) ? raw.topics.filter(Boolean) : [],
  } as AdminProblemListItem;
}

export function normalizeAdminTopic(
  raw: Partial<AdminTopicItem> | undefined | null,
): AdminTopicItem {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? "Untitled",
    slug: raw?.slug ?? "untitled",
    problem_count: raw?.problem_count ?? 0,
    created_at: raw?.created_at ?? null,
  };
}

export function normalizeAdminUser(
  raw: Partial<AdminUserItem> | undefined | null,
): AdminUserItem {
  return {
    id: raw?.id ?? 0,
    username: raw?.username ?? "unknown",
    email: raw?.email ?? "",
    is_active: raw?.is_active ?? true,
    is_admin: raw?.is_admin ?? false,
    created_at: raw?.created_at ?? new Date(0).toISOString(),
    updated_at: raw?.updated_at ?? new Date(0).toISOString(),
    submission_count: raw?.submission_count ?? 0,
  };
}

export function normalizeAdminSubmission(
  raw: Partial<AdminSubmissionItem> | undefined | null,
): AdminSubmissionItem {
  return {
    id: raw?.id ?? 0,
    user_id: raw?.user_id ?? 0,
    username: raw?.username ?? null,
    problem_id: raw?.problem_id ?? null,
    problem_slug: raw?.problem_slug ?? null,
    problem_title: raw?.problem_title ?? null,
    language: raw?.language ?? "unknown",
    status: raw?.status ?? null,
    execution_time_ms: raw?.execution_time_ms ?? null,
    memory_used_kb: raw?.memory_used_kb ?? null,
    created_at: raw?.created_at ?? new Date(0).toISOString(),
  };
}

export function extractAdminErrorMessage(err: unknown, fallback = "An error occurred"): string {
  if (typeof err === "object" && err !== null) {
    const e = err as { response?: { data?: { detail?: unknown } }; message?: string };
    const detail = e.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (typeof first?.msg === "string") return first.msg;
    }
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}

export type TopicSelectable = Pick<Topic, "id" | "name" | "slug">;
