<script setup>
import { InboxIcon } from '@heroicons/vue/24/outline';

defineProps({
  title: { type: String, default: 'Nothing here yet' },
  message: { type: String, default: '' }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <InboxIcon class="h-12 w-12 text-gray-300 dark:text-gray-700" />
    <h3 class="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
    <p v-if="message" class="mt-1 text-sm text-gray-500">{{ message }}</p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>
