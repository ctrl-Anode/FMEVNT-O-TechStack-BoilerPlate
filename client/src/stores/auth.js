import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';
import { getStoredTokens, storeTokens } from '@/api/http';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    initialized: false,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    permissions: (state) => state.user?.permissions || [],
    roles: (state) => (state.user?.roles || []).map((role) => role.name)
  },

  actions: {
    can(permission) {
      if (!this.user) return false;
      return this.permissions.includes('*') || this.permissions.includes(permission);
    },

    hasRole(...names) {
      return names.some((name) => this.roles.includes(name));
    },

    setSession(data) {
      storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      this.user = data.user;
    },

    async init() {
      if (this.initialized) return;
      const tokens = getStoredTokens();
      if (!tokens?.accessToken) {
        this.initialized = true;
        return;
      }
      try {
        this.user = await authApi.me();
      } catch {
        storeTokens(null);
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },

    async login(credentials) {
      this.loading = true;
      try {
        const data = await authApi.login(credentials);
        if (data.mfaRequired) return { mfaRequired: true, mfaToken: data.mfaToken };
        this.setSession(data);
        return data;
      } finally {
        this.loading = false;
      }
    },

    async completeMfaLogin(mfaToken, code) {
      this.loading = true;
      try {
        const data = await authApi.verifyMfa({ mfaToken, code });
        this.setSession(data);
        return data;
      } finally {
        this.loading = false;
      }
    },

    async register(payload) {
      this.loading = true;
      try {
        const data = await authApi.register(payload);
        this.setSession(data);
        return data;
      } finally {
        this.loading = false;
      }
    },

    async refreshUser() {
      this.user = await authApi.me();
    },

    async logout() {
      try {
        await authApi.logout();
      } finally {
        storeTokens(null);
        this.user = null;
      }
    },

    async forgotPassword(email) {
      return authApi.forgotPassword(email);
    },

    async resetPassword(payload) {
      return authApi.resetPassword(payload);
    }
  }
});
