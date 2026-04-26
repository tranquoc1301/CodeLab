import { create } from 'zustand';
import { STORAGE_KEYS } from '@/shared/config';

interface ThemeState {
  theme: 'light' | 'dark';
  toggle: () => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: 'light' | 'dark', skipTransition = false) => {
  const root = document.documentElement;
  const isDark = theme === 'dark';
  
  // Fast toggle: no transitions during theme change to prevent border lag
  if (skipTransition) {
    root.classList.add('no-transition');
  }
  
  root.classList.toggle('dark', isDark);
  
  // Re-enable transitions after
  if (skipTransition) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('no-transition');
      });
    });
  }
};

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialTheme();
  applyTheme(initial);

  return {
    theme: initial,
    toggle: () =>
      set((state) => {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEYS.THEME, next);
        applyTheme(next, true); // Enable fast toggle
        return { theme: next };
      }),
  };
});
