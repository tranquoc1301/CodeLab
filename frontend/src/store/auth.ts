import { create } from "zustand";
import { STORAGE_KEYS } from "../config";
import type { User } from "../types";
import { isTokenExpired } from "../lib/jwt";

interface AuthState {
  token: string | null;
  user: User | null;
  showLoginModal: boolean;
  loginRedirectPath: string | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  openLoginModal: (redirectPath?: string) => void;
  closeLoginModal: () => void;
  checkTokenExpiration: () => boolean;
}

const getInitialToken = (): string | null => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token && isTokenExpired(token)) {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    return null;
  }
  return token;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getInitialToken(),
  user: null,
  showLoginModal: false,
  loginRedirectPath: null,
  setToken: (token: string) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    set({ token });
  },
  setUser: (user: User) => set({ user }),
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    set({
      token: null,
      user: null,
      showLoginModal: false,
      loginRedirectPath: null,
    });
  },
  openLoginModal: (redirectPath) => {
    set({ showLoginModal: true, loginRedirectPath: redirectPath || null });
  },
  closeLoginModal: () => {
    set({ showLoginModal: false, loginRedirectPath: null });
  },
  checkTokenExpiration: () => {
    const { token, logout } = get();
    if (token && isTokenExpired(token)) {
      logout();
      return true;
    }
    return false;
  },
}));

export const useAuth = () => {
  const state = useAuthStore();
  const isAuthenticated = !!state.token;

  return {
    token: state.token,
    user: state.user,
    isAuthenticated,
    showLoginModal: state.showLoginModal,
    loginRedirectPath: state.loginRedirectPath,
    setToken: state.setToken,
    setUser: state.setUser,
    logout: state.logout,
    openLoginModal: state.openLoginModal,
    closeLoginModal: state.closeLoginModal,
    checkTokenExpiration: state.checkTokenExpiration,
  };
};
