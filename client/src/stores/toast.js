import { defineStore } from 'pinia';

let counter = 0;

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: []
  }),

  actions: {
    push(toast) {
      const id = `toast_${Date.now()}_${counter++}`;
      this.toasts.push({
        id,
        type: toast.type || 'info',
        title: toast.title || '',
        message: toast.message || ''
      });

      const ttl = toast.duration || 5000;
      setTimeout(() => this.dismiss(id), ttl);

      return id;
    },

    success(title, message) {
      return this.push({ type: 'success', title, message });
    },

    error(title, message) {
      return this.push({ type: 'error', title, message, duration: 7000 });
    },

    info(title, message) {
      return this.push({ type: 'info', title, message });
    },

    dismiss(id) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    }
  }
});
