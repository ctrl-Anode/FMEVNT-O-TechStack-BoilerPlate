<script setup>
const props = defineProps({
  type: { type: String, default: 'info' },
  title: { type: String, required: true },
  message: { type: String, default: '' }
});

const emit = defineEmits(['dismiss']);

const tones = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200'
};
</script>

<template>
  <div
    class="flex w-80 items-start gap-3 rounded-lg border px-4 py-3 shadow-lg"
    :class="tones[props.type] || tones.info"
    data-testid="toast"
  >
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{{ title }}</p>
      <p v-if="message" class="mt-0.5 break-words text-xs opacity-80">{{ message }}</p>
    </div>
    <button type="button" class="shrink-0 opacity-60 transition-opacity hover:opacity-100" aria-label="Dismiss" @click="emit('dismiss')">&times;</button>
  </div>
</template>
