<script setup>
import { ref, watch } from 'vue';
import { usersApi } from '@/api';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import { rolesApi } from '@/api';
import { useToastStore } from '@/stores/toast';

const props = defineProps({
  user: { type: Object, default: null }
});

const emit = defineEmits(['close', 'saved']);
const toast = useToastStore();

const roles = ref([]);
const form = ref({ firstName: '', lastName: '', email: '', status: 'ACTIVE', roleIds: [] });
const saving = ref(false);
const error = ref('');

watch(
  () => props.user,
  async (user) => {
    if (!user) return;
    error.value = '';
    form.value = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      roleIds: (user.roles || []).map((role) => role.id)
    };
    if (roles.value.length === 0) {
      try {
        roles.value = await rolesApi.list();
      } catch {
        roles.value = [];
      }
    }
  }
);

async function save() {
  saving.value = true;
  error.value = '';
  try {
    await usersApi.update(props.user.id, {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email,
      status: form.value.status,
      roleIds: form.value.roleIds
    });
    toast.success('User updated');
    emit('saved');
    emit('close');
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :open="Boolean(user)" title="Edit user" max-width="max-w-xl" @close="emit('close')">
    <template v-if="user">
      <BaseAlert v-if="error" tone="error" class="mb-4">{{ error }}</BaseAlert>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          First name
          <input v-model="form.firstName" class="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-gray-100">
        </label>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Last name
          <input v-model="form.lastName" class="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-gray-100">
        </label>
      </div>

      <label class="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Email
        <input v-model="form.email" type="email" class="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-gray-100">
      </label>

      <label class="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Status
        <select v-model="form.status" class="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm capitalize shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-gray-100">
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </label>

      <fieldset class="mt-4">
        <legend class="text-sm font-medium text-gray-700 dark:text-gray-300">Roles</legend>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label
            v-for="role in roles"
            :key="role.id"
            class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 transition-colors"
            :class="
              form.roleIds.includes(role.id)
                ? 'bg-brand-50 ring-brand-400 dark:bg-brand-500/10'
                : 'ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-800'
            "
          >
            <input v-model="form.roleIds" type="checkbox" :value="role.id" class="h-4 w-4 rounded accent-brand-600">
            <span class="font-medium">{{ role.name }}</span>
          </label>
        </div>
      </fieldset>

      <div class="mt-6 flex justify-end gap-3">
        <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :loading="saving" @click="save()">Save changes</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
