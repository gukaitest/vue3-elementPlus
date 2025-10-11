<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { setupWebVitals, startFPSMonitor, stopFPSMonitor, stopLongTaskMonitor } from '@/plugins/web-vitals';
import { fetchGetProductList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';

const filterInput = ref('');
const element = ref<Element | null>(null);
const appStore = useAppStore();
const params = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 51
});
const gap = computed(() => (appStore.isMobile ? 0 : 16));

// FPS监控配置 - 启用数据上报
const fpsConfig = {
  enableConsoleLog: true,
  enableReport: true, // 启用数据上报
  // reportUrl 会自动从环境变量 VITE_WEB_VITALS_REPORT_URL 中获取
  // 开发环境: http://localhost:3000/monitor/webvitals
  // 生产环境: http://47.103.169.121:8084/monitor/webvitals
  thresholds: {
    fps: 30 // 30fps作为基准
  },
  fpsConfig: {
    duration: 2000, // 监控2秒（足够覆盖API请求和渲染时间）
    sampleInterval: 100, // 100ms采样一次
    enabled: true
  }
};

// 监听Web Vitals事件，处理FPS数据
const handleWebVitalsEvent = (event: CustomEvent) => {
  const data = event.detail;
  if (data.name === 'FPS') {
    console.log('🎯 Select Optimization FPS监控结果:', {
      average: `${data.value}fps`,
      rating: data.rating,
      action: '下拉框API请求&重新渲染'
    });
  }
};

interface ListItem {
  value: number;
  label: string;
}
const value = ref([]);
const options = ref<ListItem[]>([]);
const loading = ref(false);

const getOptionData = async () => {
  // 不能添加loading，因为会导致下拉框刷新，无法触发remote-method
  // loading.value = true;

  try {
    // 开始FPS监控
    console.log('🚀 开始监控下拉框API请求和渲染FPS...');
    startFPSMonitor(fpsConfig);

    await fetchGetProductList({
      search: filterInput.value,
      pageNo: params.pageNo,
      pageSize: params.pageSize
    }).then(res => {
      console.log('res', res);
      const tempRes =
        res?.data?.products.map((item): ListItem => {
          return { value: item.product_id, label: item.product_name };
        }) ?? [];
      params.total = res?.data?.total ?? 0;
      options.value.push(...tempRes);
    });
  } finally {
    // loading.value = false;
    // 等待DOM更新完成后停止FPS监控
    // await nextTick();
    // setTimeout(() => {
    //   stopFPSMonitor();
    //   console.log('⏹️ 停止FPS监控');
    // }, 1000); // 给一点时间让渲染完成
  }
};

const handleScroll = () => {
  if (element.value) {
    console.log(
      'loadMore判断依据,scrollHeight,scrollTop,clientHeight,阈值,total,pageNo,pageSize',
      element.value.scrollHeight,
      element.value.scrollTop,
      element.value.clientHeight,
      0,
      params.total,
      params.pageNo,
      params.pageSize
    );
    const loadMore =
      element.value.scrollHeight <= element.value.clientHeight + element.value.scrollTop + 0 &&
      params.total > params.pageNo * params.pageSize;
    console.log('加载更多 loadMore:', loadMore);
    if (loadMore) {
      params.pageNo += 1;
      getOptionData();
    }
  }
};

const handleFocus = () => {
  element.value = document.querySelector('.selectRef .el-select-dropdown__list');
  // console.log('element.value', element.value);
  if (element.value) {
    element.value.addEventListener('scroll', handleScroll);
  }
};

const remoteMethod = async (query: string) => {
  console.log('query', query);
  filterInput.value = query;
  params.pageNo = 1;
  params.pageSize = 50;
  options.value.splice(0, options.value.length);

  // 执行API请求（会触发FPS监控）
  await getOptionData();

  setTimeout(() => {
    handleFocus();
  }, 2000);
};

const debounceRemoteMethod = useDebounceFn(remoteMethod, 500);

// 生命周期钩子
onMounted(() => {
  // 监听Web Vitals事件
  window.addEventListener('web-vitals', handleWebVitalsEvent as EventListener);

  // 基本设置
  setupWebVitals({
    longTaskConfig: {
      enabled: true,
      threshold: 50,
      maxTasks: 100,
      includeAttribution: true
    }
  });
});

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('web-vitals', handleWebVitalsEvent as EventListener);
  // 停止FPS监控
  stopFPSMonitor();
  // 停止长任务监控
  stopLongTaskMonitor();
});
</script>

<template>
  <ElCard class="card-wrapper">
    <ElRow :gutter="gap" class="px-8px">
      <ElCol :md="18" :sm="24">
        <div class="flex-col-top size-full min-h-420px gap-24px overflow-hidden">
          <span>产品:</span>
          <ElSelectV2
            v-model="value"
            popper-class="selectRef"
            class="m-6"
            :popper-append-to-body="false"
            multiple
            filterable
            remote
            collapse-tags
            :max-collapse-tags="3"
            :remote-method="debounceRemoteMethod"
            clearable
            :options="options"
            :loading="loading"
            placeholder="请输入关键字再选择"
            style="width: 240px"
            @focus="handleFocus"
          />
        </div>
      </ElCol>
    </ElRow>
  </ElCard>
</template>

<style scoped>
:deep(.el-card__body) {
  background-color: #ffffff;
}
</style>
