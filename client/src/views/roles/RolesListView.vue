<script setup>
import { onMounted, ref } from 'vue';
import { rolesApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader.vue';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseSpinner from '@/components/ui/BaseSpinner.vue';
import { useToastStore } from '@/stores/toast';
import { usePermission } from '@/composables/usePermission';

const toast = useToastStore();
const { can } = usePermission();

const roles = ref([]);
const catalog = ref([]);
const loading = ref(true);
const editing = ref(null);
const selectedKeys = ref(new Set());
const saving = ref(false);
const modalError = ref('');

async function loadAll() {
  loading.value = true;
  try {
    const [roleRows, permissionRows] = await Promise.all([rolesApi.list(), rolesApi.permissions()]);
    roles.value = roleRows;
    catalog.value = permissionRows;
  } finally {
    loading.value = false;
  }
}

function openEditor(role) {
  editing.value = role;
  modalError.value = '';
  selectedKeys.value = new Set(role.permissions.map((link) => link.permission.key));
}

function toggleKey(key) {
  const next = new Set(selectedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedKeys.value = next;
}

async function savePermissions() {
  saving.value = true;
  modalError.value = '';
  try {
    await rolesApi.update(editing.value.id, { permissionKeys: [...selectedKeys.value] });
    toast.success('Role updated');
    editing.value = null;
    await loadAll();
  } catch (error) {
    modalError.value = error.message;
  } finally {
    saving.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <div>
    <PageHeader title="Roles & Permissions" subtitle="Fine-grained access control across the platform" />

    <BaseSpinner v-if="loading" />

    <div v-else class="grid gap-5 lg:grid-cols-2">
      <BaseCard v-for="role in roles" :key="role.id" :title="role.name" :padded="true">
        <template #actions>
          <div class="flex items-center gap-2">
            <BaseBadge v-if="role.isSystem" tone="purple">system</BaseBadge>
            <span class="text-xs text-gray-400">{{ role._count?.users ?? role.usersCount ?? 0 }} users</span>
            <button
              v-if="can('roles:manage') && !role.isSystem"
              type="button"
              class="text-sm font-medium text-brand-600 hover:text-brand-500"
              @click="openEditor(role)"
            >
              Edit permissions
            </button>
          </div>
        </template>

        <p class="text-sm text-gray-500 dark:text-gray-400">{{ role.description || 'No description.' }}</p>

        <div class="mt-4 flex flex-wrap items-center gap-1.5">
          <template v-if="role.permissions.some((link) => link.permission.key === '*')">
            <BaseBadge tone="red">*</BaseBadge>
            <span class="text-xs text-gray-400">full access to everything</span>
          </template>
          <div v-else class="flex flex-wrap gap-1.5">
            <BaseBadge
              v-for="link in role.permissions"
              :key="link.permission.id"
              tone="brand"
            >
              {{ link.permission.key }}
            </BaseBadge>
            <span v-if="role.permissions.length === 0" class="text-xs text-gray-400">
              No permissions assigned
            </span>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseModal :open="Boolean(editing)" :title="`Edit permissions - ${editing?.name || ''}`" max-width="max-w-2xl" @close="editing = null">
      <BaseAlert v-if="modalError" tone="error" class="mb-4">{{ modalError }}</BaseAlert>

      <div class="grid max-h-96 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        <label
          v-for="permission in catalog"
          :key="permission.id"
          class="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 ring-1 transition-colors"
          :class="
            selectedKeys.has(permission.key)
              ? 'bg-brand-50 ring-brand-400 dark:bg-brand-500/10'
              : 'ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-800'
          "
        >
          <input
            type="checkbox"
            class="mt-0.5 h-4 w-4 accent-brand-600"
            :checked="selectedKeys.has(permission.key)"
            @change="toggleKey(permission.key)"
          >
          <span>
            <span class="block font-mono text-sm font-semibold">{{ permission.key }}</span>
            <span class="block text-xs text-gray-500">{{ permission.description }}</span>
          </span>
        </label>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <BaseButton variant="secondary" @click="editing = null">Cancel</BaseButton>
        <BaseButton :loading="saving" @click="savePermissions()">Save permissions</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
