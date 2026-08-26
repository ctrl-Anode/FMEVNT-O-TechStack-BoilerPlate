<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  HomeIcon,
  UsersIcon,
  ShieldCheckIcon,
  UserCircleIcon
} from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const auth = useAuthStore();
const ui = useUiStore();
const route = useRoute();

const sections = computed(() => [
  {
    label: 'Platform',
    items: [
      { name: 'Dashboard', to: { name: 'dashboard' }, icon: HomeIcon },
      { name: 'Users', to: { name: 'users' }, icon: UsersIcon, permission: 'users:read' },
      { name: 'Roles & Permissions', to: { name: 'roles' }, icon: ShieldCheckIcon, permission: 'roles:read' }
    ]
  },
  {
    label: 'Account',
    items: [{ name: 'Profile & Security', to: { name: 'profile' }, icon: UserCircleIcon }]
  }
]);

function visible(item) {
  return !item.permission || auth.can(item.permission);
}

function isActive(item) {
  return route.name === item.to.name;
}
</script>

<template>
  <aside
    class="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
  >
    <div class="flex h-16 items-center gap-2.5 border-b border-gray-200 px-5 dark:border-gray-800">
      <img src="/favicon.svg" alt="" class="h-8 w-8 rounded-lg">
      <span class="text-base font-bold tracking-tight">Acme Platform</span>
    </div>

    <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      <div v-for="section in sections" :key="section.label">
        <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {{ section.label }}
        </p>
        <router-link
          v-for="item in section.items.filter(visible)"
          :key="item.to.name"
          :to="item.to"
          class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="
            isActive(item)
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
          "
          @click="ui.toggleSidebar(false)"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" :class="isActive(item) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-500'" />
          {{ item.name }}
        </router-link>
      </div>
    </nav>

    <div class="border-t border-gray-200 p-4 dark:border-gray-800">
      <p class="text-xs text-gray-400">Enterprise Boilerplate v1.0</p>
    </div>
  </aside>
</template>
