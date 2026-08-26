import { defineStore } from 'pinia';

const THEME_KEY = 'theme';

function preferredTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: preferredTheme(),
    sidebarOpen: false,
    sidebarCollapsed: false
  }),

  actions: {
    applyTheme() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
      localStorage.setItem(THEME_KEY, this.theme);
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme();
    },

    toggleSidebar(force) {
      this.sidebarOpen = typeof force === 'boolean' ? force : !this.sidebarOpen;
    }
  }
});
