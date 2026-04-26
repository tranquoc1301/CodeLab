export const ROUTES = {
  HOME: "/",
  PROBLEM_DETAIL: "/problems/:slug",
  problemDetail: (slug: string) => `/problems/${slug}`,
  SUBMISSIONS: "/submissions",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  PROFILE: "/profile",
  PROBLEM_LISTS: "/problem-lists",
  problemLists: () => "/problem-lists",
  PROBLEM_LIST_DETAIL: "/problem-lists/:id",
  problemListDetail: (id: number) => `/problem-lists/${id}`,
} as const;
