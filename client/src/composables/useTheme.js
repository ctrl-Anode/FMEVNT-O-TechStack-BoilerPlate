import { onMounted } from 'vue';
import { useUiStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';

export function useTheme() {
  const ui = useUiStore();
  const { theme } = storeToRefs(ui);

  onMounted(() => ui.applyTheme());

  function toggle() {
    ui.toggleTheme();
  }

  return { theme, toggle };
}

export default useTheme;
