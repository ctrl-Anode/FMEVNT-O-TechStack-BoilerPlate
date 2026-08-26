<script setup>
import { useUiStore } from '@/stores/ui';
import AppSidebar from './AppSidebar.vue';
import AppHeader from './AppHeader.vue';

const ui = useUiStore();
</script>

<template>
  <div class="flex h-full">
    <div class="hidden lg:block">
      <AppSidebar />
    </div>

    <Transition name="drawer">
      <div v-if="ui.sidebarOpen" class="fixed inset-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-gray-950/60" @click="ui.toggleSidebar(false)" />
        <div class="absolute inset-y-0 left-0">
          <AppSidebar />
        </div>
      </div>
    </Transition>

    <div class="flex min-w-0 flex-1 flex-col">
      <AppHeader />
      <main class="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-7xl">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .absolute.inset-y-0,
.drawer-leave-to .absolute.inset-y-0 {
  transform: translateX(-100%);
}
</style>
