import { create } from 'zustand';
import { STORAGE_KEYS } from '../config';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
  user: null,
  setToken: (token: string) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    set({ token });
  },
  setUser: (user: User) => set({ user }),
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    set({ token: null, user: null });
  },
}));
