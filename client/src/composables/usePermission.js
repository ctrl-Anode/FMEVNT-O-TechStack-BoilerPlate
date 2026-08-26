import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

export function usePermission() {
  const auth = useAuthStore();

  const isAdmin = computed(() => auth.hasRole('admin'));

  function can(permission) {
    return auth.can(permission);
  }

  return { can, isAdmin };
}

export default usePermission;
