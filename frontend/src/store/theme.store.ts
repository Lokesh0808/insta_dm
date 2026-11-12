import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  applyTheme: () => void;
  toggle: () => void;
}

const systemPrefersDark = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',

      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },

      toggle: () => {
        const current = get().resolvedTheme;
        get().setTheme(current === 'dark' ? 'light' : 'dark');
      },

      applyTheme: () => {
        const { theme } = get();
        const resolved = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          root.classList.toggle('dark', resolved === 'dark');
          root.style.colorScheme = resolved;
        }
        set({ resolvedTheme: resolved });
      },
    }),
    {
      name: 'instaflow.theme',
      onRehydrateStorage: () => (state) => {
        state?.applyTheme();
      },
    },
  ),
);
