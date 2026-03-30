export const ROUTES = {
  HOME: '/',
  PROBLEM_DETAIL: '/problems/:slug',
  problemDetail: (slug: string) => `/problems/${slug}`,
  SUBMISSIONS: '/submissions',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
} as const;
