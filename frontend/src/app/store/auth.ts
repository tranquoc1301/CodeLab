import { create } from "zustand";
import type { User } from "@/shared/types";
import api from "@/shared/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  showLoginModal: boolean;
  loginRedirectPath: string | null;
  showAuthModal: boolean;
  authModalTab: "login" | "register";
  setUser: (user: User) => void;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  openLoginModal: (redirectPath?: string) => void;
  closeLoginModal: () => void;
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: "login" | "register") => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  showLoginModal: false,
  loginRedirectPath: null,
  showAuthModal: false,
  authModalTab: "login",
  setUser: (user: User) => set({ user }),
  fetchUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors
    }
    set({
      user: null,
      showLoginModal: false,
      loginRedirectPath: null,
      showAuthModal: false,
      authModalTab: "login",
    });
  },
  openLoginModal: (redirectPath) => {
    set({ showLoginModal: true, loginRedirectPath: redirectPath || null });
  },
  closeLoginModal: () => {
    set({ showLoginModal: false, loginRedirectPath: null });
  },
  openAuthModal: (tab = "login") => {
    set({ showAuthModal: true, authModalTab: tab });
  },
  closeAuthModal: () => {
    set({ showAuthModal: false });
  },
  setAuthModalTab: (tab: "login" | "register") => {
    set({ authModalTab: tab });
  },
}));

export const useAuth = () => {
  const state = useAuthStore();
  const isAuthenticated = !!state.user;

  return {
    user: state.user,
    isAuthenticated,
    isLoading: state.isLoading,
    showLoginModal: state.showLoginModal,
    loginRedirectPath: state.loginRedirectPath,
    showAuthModal: state.showAuthModal,
    authModalTab: state.authModalTab,
    setUser: state.setUser,
    fetchUser: state.fetchUser,
    logout: state.logout,
    openLoginModal: state.openLoginModal,
    closeLoginModal: state.closeLoginModal,
    openAuthModal: state.openAuthModal,
    closeAuthModal: state.closeAuthModal,
    setAuthModalTab: state.setAuthModalTab,
  };
};
