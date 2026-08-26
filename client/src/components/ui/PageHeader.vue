<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
});
</script>

<template>
  <div class="mb-8">
    <h1 class="text-2xl font-bold tracking-tight">{{ title }}</h1>
    <p v-if="subtitle || $slots.subtitle" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      <slot name="subtitle">{{ subtitle }}</slot>
    </p>
    <div v-if="$slots.actions" class="mt-4 sm:mt-2">
      <slot name="actions" />
    </div>
  </div>
</template>
