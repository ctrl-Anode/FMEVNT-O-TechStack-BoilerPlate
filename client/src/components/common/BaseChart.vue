<script setup>
import VueApexCharts from 'vue3-apexcharts';
import 'apexcharts/dist/apexcharts.css';

defineProps({
  type: { type: String, default: 'area' },
  height: { type: Number, default: 300 },
  options: { type: Object, required: true },
  series: { type: Array, required: true }
});
</script>

<template>
  <VueApexCharts :type="type" :height="height" :options="options" :series="series" />
</template>
