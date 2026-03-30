const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export const API = {
  BASE_URL,
  ENDPOINTS: {
    PROBLEMS: '/problems/',
    PROBLEM_BY_SLUG: (slug: string) => `/problems/by-slug/${slug}`,
    SUBMISSIONS: '/submissions/',
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_ME: '/auth/me',
  },
  HEADERS: {
    AUTH_PREFIX: 'Bearer ',
    FORM_URLENCODED: 'application/x-www-form-urlencoded',
  },
} as const;
