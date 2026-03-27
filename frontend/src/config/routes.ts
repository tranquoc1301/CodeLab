export const ROUTES = {
  HOME: '/',
  PROBLEM_DETAIL: '/problems/:id',
  problemDetail: (id: string | number) => `/problems/${id}`,
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
} as const;
