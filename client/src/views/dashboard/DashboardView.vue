<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { statsApi } from '@/api';
import StatCard from '@/components/common/StatCard.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseChart from '@/components/common/BaseChart.vue';
import BaseSpinner from '@/components/ui/BaseSpinner.vue';

const auth = useAuthStore();
const stats = ref(null);
const failed = ref(false);

const chartOptions = {
  chart: { id: 'signups', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  colors: ['#6366f1'],
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 }
  },
  xaxis: {
    categories: [],
    labels: { style: { fontSize: '11px' } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: { labels: { style: { fontSize: '11px' } }, min: 0, forceNiceScale: true },
  grid: { borderColor: '#e5e7eb55', strokeDashArray: 4 },
  tooltip: { theme: 'dark' }
};

const series = ref([{ name: 'Signups', data: [] }]);

onMounted(async () => {
  try {
    if (!auth.can('stats:read')) return;
    stats.value = await statsApi.overview({ days: 14 });

    const byDay = new Map(stats.value.series.map((point) => [point.day, point.count]));
    const days = [];
    for (let index = 13; index >= 0; index -= 1) {
      const day = new Date(Date.now() - index * 86400000).toISOString().slice(0, 10);
      days.push(day);
    }

    chartOptions.xaxis.categories = days.map((day) => day.slice(5));
    series.value = [{ name: 'Signups', data: days.map((day) => byDay.get(day) || 0) }];
  } catch {
    failed.value = true;
  }
});
</script>

<template>
  <div>
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back, {{ auth.user?.firstName }} — here is what's happening.
        </p>
      </div>
    </div>

    <div v-if="auth.can('stats:read')" class="space-y-6">
      <div v-if="stats" class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" :value="stats.totals.users.toLocaleString()" />
        <StatCard label="Files stored" :value="stats.totals.files.toLocaleString()" />
        <StatCard label="Active sessions" :value="stats.totals.activeSessions.toLocaleString()" />
        <StatCard label="Registered devices" :value="stats.totals.devices.toLocaleString()" />
      </div>

      <BaseCard title="New signups - last 14 days">
        <BaseChart
          v-if="series[0].data.length"
          type="area"
          :height="320"
          :options="chartOptions"
          :series="series"
        />
        <BaseSpinner v-else />
      </BaseCard>
    </div>

    <BaseCard v-else title="Getting started">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        You're all set! Platform statistics are available to roles with the
        <code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">stats:read</code>
        permission. Ask an administrator to grant it if you need access.
      </p>
    </BaseCard>
  </div>
</template>
