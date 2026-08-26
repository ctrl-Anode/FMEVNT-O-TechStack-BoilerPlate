<script setup>
import { ref } from 'vue';
import { usersApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader.vue';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import DataTable from '@/components/common/DataTable.vue';
import { PencilSquareIcon } from '@heroicons/vue/24/outline';
import EditUserModal from './components/EditUserModal.vue';
import { usePermission } from '@/composables/usePermission';

const { can } = usePermission();

const editing = ref(null);

const columns = [
  {
    id: 'name',
    header: 'User',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    cell: null
  },
  { accessorKey: 'email', header: 'Email' },
  { id: 'roles', header: 'Roles', accessorFn: () => '', meta: { noSort: true, sortKey: '__none__' } },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: 'Joined' },
  { id: 'actions', header: '', accessorFn: () => '', meta: { noSort: true, sortKey: '__none__', alignRight: true } }
];

function fetcher({ page, limit, q, sort }) {
  return usersApi.list({ page, limit, q, sort }).then((data) => ({
    rows: data.data,
    total: data.meta.total
  }));
}
</script>

<template>
  <div>
    <PageHeader title="Users" subtitle="Manage platform accounts and role assignments" />

    <div class="p-4 sm:p-6 rounded-xl bg-white shadow-card ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800">
      <DataTable :columns="columns" :fetcher="fetcher">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-3">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" alt="" class="h-8 w-8 rounded-full object-cover">
            <span v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
              {{ row.firstName?.[0] }}{{ row.lastName?.[0] }}
            </span>
            <div class="min-w-0">
              <p class="font-medium text-gray-900 dark:text-gray-100">{{ row.firstName }} {{ row.lastName }}</p>
            </div>
          </div>
        </template>

        <template #cell-roles="{ row }">
          <div class="flex flex-wrap gap-1">
            <BaseBadge v-for="role in row.roles" :key="role.id" :tone="role.name === 'admin' ? 'purple' : role.name === 'manager' ? 'brand' : 'gray'">
              {{ role.name }}
            </BaseBadge>
          </div>
        </template>

        <template #cell-status="{ value }">
          <BaseBadge :tone="value === 'ACTIVE' ? 'green' : value === 'SUSPENDED' ? 'red' : 'amber'">
            {{ value.toLowerCase() }}
          </BaseBadge>
        </template>

        <template #cell-actions="{ row }">
          <button
            v-if="can('users:update')"
            type="button"
            class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500"
            @click="editing = row"
          >
            <PencilSquareIcon class="h-4 w-4" />
            Edit
          </button>
        </template>
      </DataTable>
    </div>

    <EditUserModal :user="editing" @close="editing = null" />
  </div>
</template>
