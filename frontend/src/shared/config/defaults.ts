export const DEFAULTS = {
  LANGUAGE: 'python3' as const,
  SKELETON_COUNT: 6,
  PROFILE_SKELETON_COUNT: 3,
  LOCALE: 'en-US',
  DATE_FORMAT: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  } as Intl.DateTimeFormatOptions,
  DEBOUNCE_MS: 300,
  PAGE_SIZE: 20,
  OTP_COUNTDOWN_SECONDS: 60,
  TOAST_DURATION_MS: 6000,
} as const;

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
} as const;
