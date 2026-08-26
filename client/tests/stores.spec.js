import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';
import { useToastStore } from '../src/stores/toast';

describe('auth store permissions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('can() grants wildcard permission holders everything', () => {
    const auth = useAuthStore();
    auth.user = {
      roles: [{ name: 'admin' }],
      permissions: ['*']
    };

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.can('users:delete')).toBe(true);
    expect(auth.can('anything:at:all')).toBe(true);
  });

  it('can() denies ungranted permissions', () => {
    const auth = useAuthStore();
    auth.user = {
      roles: [{ name: 'user' }],
      permissions: ['uploads:create', 'notifications:read']
    };

    expect(auth.can('uploads:create')).toBe(true);
    expect(auth.can('users:update')).toBe(false);
    expect(auth.hasRole('user')).toBe(true);
    expect(auth.hasRole('admin')).toBe(false);
  });

  it('is unauthenticated without a user', () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.can('stats:read')).toBe(false);
  });
});

describe('toast store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pushes and auto-dismisses toasts', () => {
    const toast = useToastStore();

    const id = toast.success('Saved!', 'All good');
    expect(toast.toasts).toHaveLength(1);
    expect(toast.toasts[0].type).toBe('success');

    vi.advanceTimersByTime(5001);
    expect(toast.toasts).toHaveLength(0);

    void id;
  });

  it('errors stay visible longer', () => {
    const toast = useToastStore();

    toast.error('Failed', 'Something went wrong');
    vi.advanceTimersByTime(5000);
    expect(toast.toasts).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    expect(toast.toasts).toHaveLength(0);
  });

  it('dismiss() removes a specific toast', () => {
    const toast = useToastStore();
    const first = toast.push({ type: 'info', title: 'One' });
    toast.push({ type: 'info', title: 'Two' });

    toast.dismiss(first);
    expect(toast.toasts.map((entry) => entry.title)).toEqual(['Two']);
  });
});
