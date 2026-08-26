<script setup>
defineOptions({ inheritAttrs: false });

defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  name: { type: String, required: true },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  required: Boolean
});

defineEmits(['update:modelValue']);
</script>

<template>
  <div>
    <label v-if="label" :for="name" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :id="name"
      :name="name"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      class="block w-full rounded-lg border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm dark:bg-gray-800 dark:text-gray-100"
      :class="error ? 'ring-red-400 focus:ring-red-500' : 'ring-gray-300 focus:ring-brand-600 dark:ring-gray-700'"
      v-bind="$attrs"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <p v-if="error" class="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-gray-500">{{ hint }}</p>
  </div>
</template>
