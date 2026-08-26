<template>
  <div class="flex min-h-full flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950 sm:px-6 lg:px-8">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <img src="/favicon.svg" alt="Logo" class="mx-auto h-14 w-14 rounded-xl shadow-lg">
        <h1 class="mt-4 text-2xl font-bold tracking-tight">
          <slot name="title">Acme Platform</slot>
        </h1>
        <p v-if="$slots.subtitle" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          <slot name="subtitle" />
        </p>
      </div>
      <div class="rounded-xl bg-white p-8 shadow-card ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800">
        <slot />
      </div>
      <p v-if="$slots.footer" class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <slot name="footer" />
      </p>
    </div>
  </div>
</template>
