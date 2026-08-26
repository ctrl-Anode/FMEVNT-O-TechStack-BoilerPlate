<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { Bars3Icon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useTheme } from '@/composables/useTheme';
import { useToastStore } from '@/stores/toast';

const auth = useAuthStore();
const ui = useUiStore();
const toast = useToastStore();
const router = useRouter();

const { theme, toggle } = useTheme();

const initials = computed(() => {
  if (!auth.user) return '?';
  return `${auth.user.firstName?.[0] || ''}${auth.user.lastName?.[0] || ''}`.toUpperCase();
});

async function logout() {
  try {
    await auth.logout();
    toast.info('Signed out', 'See you soon.');
    router.push({ name: 'login' });
  } catch (error) {
    toast.error('Logout failed', error.message);
  }
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 sm:px-6">
    <button
      type="button"
      class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
      aria-label="Toggle sidebar"
      @click="ui.toggleSidebar()"
    >
      <Bars3Icon class="h-5 w-5" />
    </button>

    <div class="flex-1" />

    <button
      type="button"
      class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggle()"
    >
      <SunIcon v-if="theme === 'dark'" class="h-5 w-5" />
      <MoonIcon v-else class="h-5 w-5" />
    </button>

    <Menu as="div" class="relative">
      <MenuButton
        class="flex items-center gap-2 rounded-full transition-colors hover:opacity-80 focus:outline-none"
        data-testid="user-menu-trigger"
      >
        <span class="sr-only">Open user menu</span>
        <span
          v-if="auth.user?.avatarUrl"
          class="h-9 w-9 rounded-full bg-cover bg-center ring-2 ring-white dark:ring-gray-800"
          :style="{ backgroundImage: `url(${auth.user.avatarUrl})` }"
        />
        <span
          v-else
          class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
        >
          {{ initials }}
        </span>
      </MenuButton>

      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="scale-95 opacity-0"
        enter-to-class="scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="scale-100 opacity-100"
        leave-to-class="scale-95 opacity-0"
      >
        <MenuItems
          class="absolute right-0 z-40 mt-2 w-56 origin-top-right overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
        >
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p class="truncate text-sm font-semibold">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
            <p class="truncate text-xs text-gray-500">{{ auth.user?.email }}</p>
          </div>

          <MenuItem v-slot="{ active }">
            <router-link
              :to="{ name: 'profile' }"
              class="flex items-center gap-2 px-4 py-2.5 text-sm"
              :class="active ? 'bg-gray-50 dark:bg-gray-800' : ''"
            >
              <UserCircleIcon class="h-4 w-4" />
              Profile & Security
            </router-link>
          </MenuItem>

          <MenuItem v-slot="{ active }">
            <button
              type="button"
              data-testid="logout-button"
              class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400"
              :class="active ? 'bg-gray-50 dark:bg-gray-800' : ''"
              @click="logout()"
            >
              <ArrowRightOnRectangleIcon class="h-4 w-4" />
              Sign out
            </button>
          </MenuItem>
        </MenuItems>
      </transition>
    </Menu>
  </header>
</template>
