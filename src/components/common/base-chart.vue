<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
defineOptions({ name: 'BaseChart' });
const props = defineProps({
  option: { type: Object, required: true },
  theme: { type: [String, Object], default: null },
  loading: { type: Boolean, default: false },
  width: { type: String, default: '100%' },
  height: { type: String, default: '100%' }
});

const emit = defineEmits(['chart-init']);

const chartEl = ref(null);
let chartInstance = null;

// 初始化图表
const initChart = () => {
  if (!chartEl.value) return;

  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(chartEl.value, props.theme);
  chartInstance.setOption(props.option);
  emit('chart-init', chartInstance);

  // 处理加载状态
  if (props.loading) {
    chartInstance.showLoading();
  } else {
    chartInstance.hideLoading();
  }
};

// 监听窗口大小变化
const resizeHandler = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

// 监听配置变化
watch(
  () => props.option,
  newOption => {
    if (chartInstance) {
      chartInstance.setOption(newOption);
    }
  },
  { deep: true }
);

// 监听主题变化
watch(
  () => props.theme,
  newTheme => {
    if (chartInstance) {
      chartInstance.dispose();
      chartInstance = echarts.init(chartEl.value, newTheme);
      chartInstance.setOption(props.option);
    }
  }
);

// 监听加载状态变化
watch(
  () => props.loading,
  loading => {
    if (!chartInstance) return;

    if (loading) {
      chartInstance.showLoading();
    } else {
      chartInstance.hideLoading();
    }
  }
);

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  window.removeEventListener('resize', resizeHandler);
});

// 暴露图表实例
defineExpose({ chartInstance });
</script>

<template>
  <div ref="chartEl" :style="{ width: '500px', height: '500px' }"></div>
</template>
