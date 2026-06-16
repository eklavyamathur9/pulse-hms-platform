import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getInitialTheme = (): Theme => {
  try {
    return (localStorage.getItem('theme') as Theme) || 'light';
  } catch {
    return 'light';
  }
};

const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme: Theme) => {
    set({ theme });
    try { localStorage.setItem('theme', theme); } catch { /* localStorage unavailable */ }
    document.body.className = theme;
  },
  toggleTheme: () => {
    set((state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', next); } catch { /* localStorage unavailable */ }
      document.body.className = next;
      return { theme: next };
    });
  },
}));

export default useThemeStore;
