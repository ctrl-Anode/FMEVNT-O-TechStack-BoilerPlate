<script setup>
import { useToastStore } from '@/stores/toast';
import ToastItem from './ToastItem.vue';

const store = useToastStore();
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
    <TransitionGroup name="toast">
      <ToastItem
        v-for="toast in store.toasts"
        :key="toast.id"
        :type="toast.type"
        :title="toast.title"
        :message="toast.message"
        class="pointer-events-auto"
        @dismiss="store.dismiss(toast.id)"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-move,
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
