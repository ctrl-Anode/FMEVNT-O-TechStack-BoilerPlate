<script setup>
import { ShieldExclamationIcon } from '@heroicons/vue/24/outline';
</script>

<template>
  <div class="flex min-h-full flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
    <ShieldExclamationIcon class="h-14 w-14 text-red-400" />
    <h1 class="mt-4 text-3xl font-bold tracking-tight">403 - Access denied</h1>
    <p class="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
      Your role does not include the permission required for this page. Ask an administrator if you believe this is a mistake.
    </p>
    <router-link to="/" class="mt-8 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">
      Back to dashboard
    </router-link>
  </div>
</template>
