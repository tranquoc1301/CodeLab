const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export const API = {
  BASE_URL,
  ENDPOINTS: {
    PROBLEMS: '/problems/',
    PROBLEMS_PAGINATED: '/problems/paginated',
    TOPICS: '/problems/topics',
    PROBLEM_BY_SLUG: (slug: string) => `/problems/by-slug/${slug}`,
    PROBLEM_NAVIGATION: (slug: string) => `/problems/navigation/${slug}`,
    SUBMISSIONS: '/submissions/',
    SUBMISSIONS_EVALUATE: '/submissions/evaluate',
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_ME: '/auth/me',
    AUTH_SEND_OTP: '/auth/send-otp',
    AUTH_VERIFY_OTP: '/auth/verify-otp',
    AUTH_RESET_PASSWORD: '/auth/reset-password',
  },
  HEADERS: {
    AUTH_PREFIX: 'Bearer ',
    FORM_URLENCODED: 'application/x-www-form-urlencoded',
  },
} as const;
