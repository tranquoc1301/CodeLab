import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/router';

const STORAGE_KEYS = {
  INTENT: 'authGuard:intent',
} as const;

const INTENT_TIMEOUT = 5 * 60 * 1000;

export interface AuthGuardOptions {
  redirectPath?: string;
  preserveCurrentLocation?: boolean;
}

interface IntentData {
  path: string;
  timestamp: number;
}

export function getStoredIntent(): IntentData | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.INTENT);
    if (!stored) return null;
    
    const data: IntentData = JSON.parse(stored);
    if (Date.now() - data.timestamp > INTENT_TIMEOUT) {
      sessionStorage.removeItem(STORAGE_KEYS.INTENT);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setStoredIntent(path: string): void {
  const data: IntentData = { path, timestamp: Date.now() };
  sessionStorage.setItem(STORAGE_KEYS.INTENT, JSON.stringify(data));
}

export function clearStoredIntent(): void {
  sessionStorage.removeItem(STORAGE_KEYS.INTENT);
}

export function getStoredPath(): string | null {
  const intent = getStoredIntent();
  return intent?.path || null;
}

export function getAndClearIntent(): string | null {
  try {
    const intent = getStoredPath();
    clearStoredIntent();
    return intent;
  } catch {
    return null;
  }
}

export function useAuthGuard() {
  const navigate = useNavigate();

  const redirectToLogin = useCallback((intendedPath?: string) => {
    const targetPath = intendedPath || getStoredPath() || ROUTES.HOME;
    setStoredIntent(targetPath);
    navigate(ROUTES.LOGIN);
  }, [navigate]);

  return {
    redirectToLogin,
    getAndClearIntent,
  };
}