<script setup>
import { computed, ref } from 'vue';
import { DataLine, Download, Loading, Refresh } from '@element-plus/icons-vue';
import BaseChart from './base-chart.vue';
defineOptions({ name: 'ChartContainer' });
const props = defineProps({
  title: { type: String, default: '图表' },
  option: { type: Object, required: true },
  theme: { type: [String, Object], default: 'light' },
  loading: { type: Boolean, default: false },
  emptyData: { type: Boolean, default: false },
  showRefresh: { type: Boolean, default: true },
  showDownload: { type: Boolean, default: true }
});

const emit = defineEmits(['refresh', 'download']);

const chartRef = ref(null);
const chartOption = computed(() => props.option);

// 刷新图表
const refreshChart = () => {
  emit('refresh');
};

// 下载图表
const downloadChart = () => {
  if (chartRef.value && chartRef.value.chartInstance) {
    const dataURL = chartRef.value.chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: props.theme === 'dark' ? '#121212' : '#fff'
    });

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${props.title || 'chart'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    emit('download');
  }
};

// 暴露图表实例
const getChartInstance = () => {
  return chartRef.value?.chartInstance;
};

defineExpose({ getChartInstance });
</script>

<template>
  <div class="chart-container">
    <div class="chart-header">
      <div class="title">{{ title }}</div>
      <div class="actions">
        <ElButton v-if="showRefresh" size="small" :icon="Refresh" circle @click="refreshChart" />
        <ElButton v-if="showDownload" size="small" :icon="Download" circle @click="downloadChart" />
      </div>
    </div>

    <div class="chart-wrapper">
      <BaseChart ref="chartRef" :option="chartOption" :theme="theme" :loading="loading" height="100%" />

      <div v-if="loading" class="loading-overlay">
        <ElIcon class="is-loading" :size="36">
          <Loading />
        </ElIcon>
      </div>

      <div v-if="emptyData" class="empty-state">
        <ElIcon :size="60">
          <DataLine />
        </ElIcon>
        <p>暂无数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* 关键：确保容器高度100% */
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header .title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-header .actions {
  display: flex;
  gap: 8px;
}

.chart-wrapper {
  flex: 1; /* 关键：占据剩余空间 */
  position: relative;
  min-height: 300px; /* 确保最小高度 */
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.dark .loading-overlay {
  background: rgba(30, 30, 30, 0.7);
}

.empty-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
  z-index: 5;
}
</style>
