import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services';
import { setUnauthorizedHandler, tokenStorage } from '@/services/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  loadUser: () => Promise<User | null>;
  updateProfile: (payload: Record<string, unknown>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ error: null, isLoading: true });
        try {
          const response = await authService.login({ email, password });
          const { accessToken, refreshToken } = response.data;
          tokenStorage.set(accessToken, refreshToken);
          const user = response.data.user as User;
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          return user;
        } catch (error) {
          const message =
            (error as { message?: string })?.message ?? 'Unable to sign in. Please try again.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (payload) => {
        set({ error: null, isLoading: true });
        try {
          const response = await authService.register(payload);
          const { accessToken, refreshToken } = response.data;
          tokenStorage.set(accessToken, refreshToken);
          const user = response.data.user as User;
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          return user;
        } catch (error) {
          const message =
            (error as { message?: string })?.message ?? 'Unable to create your account.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const refreshToken = tokenStorage.getRefresh();
        try {
          await authService.logout(refreshToken ?? undefined);
        } catch {
          /* ignore network errors on logout */
        }
        tokenStorage.clear();
        set({ user: null, isAuthenticated: false, error: null });
      },

      loadUser: async () => {
        if (!tokenStorage.getAccess() && !tokenStorage.getRefresh()) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return null;
        }
        try {
          const response = await authService.me();
          const user = response.data.user as User;
          set({ user, isAuthenticated: true, isLoading: false });
          return user;
        } catch {
          tokenStorage.clear();
          set({ user: null, isAuthenticated: false, isLoading: false });
          return null;
        }
      },

      updateProfile: async (payload) => {
        const response = await authService.updateProfile(payload);
        set({ user: response.data.user as User });
      },
    }),
    {
      name: 'instaflow.auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

setUnauthorizedHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
