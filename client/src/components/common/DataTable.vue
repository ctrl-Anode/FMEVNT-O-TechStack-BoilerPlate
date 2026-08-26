<script setup>
import { ref } from 'vue';
import {
  useVueTable,
  getCoreRowModel,
  FlexRender,
  createColumnHelper
} from '@tanstack/vue-table';

const props = defineProps({
  columns: { type: Array, required: true },
  fetcher: { type: Function, required: true },
  searchable: { type: Boolean, default: true },
  initialSort: { type: String, default: '-createdAt' }
});

const columnHelper = createColumnHelper();

const rows = ref([]);
const total = ref(0);
const totalPages = ref(1);
const page = ref(1);
const limit = ref(10);
const sort = ref(props.initialSort);
const search = ref('');
const loading = ref(false);
const error = ref('');

let debounceTimer = null;

const table = useVueTable({
  get data() {
    return rows.value;
  },
  get columns() {
    return props.columns.map((column) => columnHelper.accessor(column.accessorKey || column.id, column));
  },
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const result = await props.fetcher({
      page: page.value,
      limit: limit.value,
      q: search.value || undefined,
      sort: sort.value || undefined
    });
    rows.value = result.rows;
    total.value = result.total;
    totalPages.value = Math.max(1, Math.ceil(result.total / limit.value));
    page.value = Math.min(page.value, totalPages.value);
  } catch (err) {
    error.value = err.message || 'Failed to load data';
  } finally {
    loading.value = false;
  }
}

function onSearchInput(value) {
  search.value = value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    load();
  }, 350);
}

function toggleSort(accessorKey) {
  if (!accessorKey || accessorKey.startsWith('__')) return;
  sort.value =
    sort.value === accessorKey
      ? `-${accessorKey}`
      : sort.value === `-${accessorKey}`
        ? props.initialSort
        : accessorKey;
  page.value = 1;
  load();
}

function goToPage(next) {
  if (next < 1 || next > totalPages.value) return;
  page.value = next;
  load();
}

defineExpose({ refresh: load });

load();
</script>

<template>
  <div>
    <div v-if="searchable" class="mb-4 max-w-sm">
      <input
        type="search"
        placeholder="Search..."
        class="block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-gray-100"
        @input="onSearchInput($event.target.value)"
      >
    </div>

    <div class="overflow-x-auto rounded-lg ring-1 ring-gray-200/70 dark:ring-gray-800">
      <table class="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800" data-testid="data-table">
        <thead class="bg-gray-50 dark:bg-gray-900/60">
          <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              scope="col"
              class="whitespace-nowrap px-4 py-3 font-semibold text-gray-600 dark:text-gray-300"
              :class="{
                'cursor-pointer select-none transition-colors hover:text-brand-600':
                  header.column.columnDef.accessorKey && !header.column.columnDef.meta?.noSort
              }"
              @click="toggleSort(header.column.columnDef.meta?.sortKey || header.column.columnDef.accessorKey)"
            >
              <span class="inline-flex items-center gap-1">
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
                <span v-if="sort === header.column.columnDef.meta?.sortKey" aria-hidden="true">&#8593;</span>
                <span v-else-if="sort === `-${header.column.columnDef.meta?.sortKey}`" aria-hidden="true">&#8595;</span>
              </span>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white dark:divide-gray-800/60 dark:bg-gray-900">
          <tr v-if="loading">
            <td :colspan="columns.length" class="px-4 py-10">
              <div class="flex justify-center gap-2">
                <div
                  v-for="n in 3"
                  :key="n"
                  class="skeleton h-2 w-24 rounded-full"
                  :style="{ animationDelay: `${n * 0.15}s` }"
                />
              </div>
            </td>
          </tr>

          <tr v-else-if="error">
            <td :colspan="columns.length" class="px-4 py-6 text-center font-medium text-red-500">{{ error }}</td>
          </tr>

          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length" class="px-4 py-12 text-center text-gray-400">No records found</td>
          </tr>

          <template v-else>
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300"
              >
                <slot
                  v-if="$slots[`cell-${cell.column.id}`]"
                  :name="`cell-${cell.column.id}`"
                  :row="row.original"
                  :value="cell.getValue()"
                />
                <FlexRender
                  v-else
                  :render="cell.column.columnDef.cell ?? cell.getValue()"
                  :props="cell.getContext()"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <nav class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
      <p>Showing <strong>{{ rows.length }}</strong> of <strong>{{ total }}</strong></p>
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="rounded-md px-2.5 py-1 font-medium ring-1 ring-gray-300 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:ring-gray-700 dark:hover:bg-gray-800"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        >
          Prev
        </button>
        <span class="px-2">Page {{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="rounded-md px-2.5 py-1 font-medium ring-1 ring-gray-300 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:ring-gray-700 dark:hover:bg-gray-800"
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
        >
          Next
        </button>
      </div>
    </nav>
  </div>
</template>
