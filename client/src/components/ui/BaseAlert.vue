<script setup>
import { computed } from 'vue';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  tone: { type: String, default: 'info' },
  title: { type: String, default: '' }
});

const tones = {
  info: {
    wrap: 'bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
    icon: InformationCircleIcon
  },
  success: {
    wrap: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: CheckCircleIcon
  },
  warning: {
    wrap: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
    icon: ExclamationTriangleIcon
  },
  error: {
    wrap: 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300',
    icon: ExclamationTriangleIcon
  }
};

const active = computed(() => tones[props.tone]);
</script>

<template>
  <div class="flex items-start gap-3 rounded-lg p-4 text-sm" :class="active.wrap" role="alert">
    <component :is="active.icon" class="mt-0.5 h-5 w-5 shrink-0" />
    <div>
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <slot />
    </div>
  </div>
</template>
