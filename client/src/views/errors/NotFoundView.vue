<script setup>
import { MapIcon } from '@heroicons/vue/24/outline';
</script>

<template>
  <div class="flex min-h-full flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
    <MapIcon class="h-14 w-14 text-gray-300 dark:text-gray-700" />
    <h1 class="mt-4 text-3xl font-bold tracking-tight">404 - Page not found</h1>
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">The page you're looking for doesn't exist or was moved.</p>
    <router-link to="/" class="mt-8 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">
      Back to dashboard
    </router-link>
  </div>
</template>
