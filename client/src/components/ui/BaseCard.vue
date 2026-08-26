<script setup>
defineProps({
  title: { type: String, default: '' },
  padded: { type: Boolean, default: true }
});
</script>

<template>
  <section class="rounded-xl bg-white shadow-card ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800">
    <header v-if="title || $slots.actions" class="flex items-center justify-between gap-4 border-b border-gray-200/80 px-6 py-4 dark:border-gray-800">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ title }}</h2>
      <slot name="actions" />
    </header>
    <div :class="padded ? 'p-6' : ''">
      <slot />
    </div>
  </section>
</template>
