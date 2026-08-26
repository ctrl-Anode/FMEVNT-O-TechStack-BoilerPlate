<script setup>
import { animateDirective } from '@/directives/animate';

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '-' },
  hint: { type: String, default: '' }
});

const vAnimate = animateDirective;
</script>

<template>
  <div v-animate="{ delay: Math.random() * 0.15 }" class="rounded-xl bg-white p-6 shadow-card ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800" data-testid="stat-card">
    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ label }}</p>
    <p class="mt-2 text-3xl font-bold tracking-tight">{{ value }}</p>
    <p v-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</p>
    <slot />
  </div>
</template>
