<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { fetchGetPerformanceOptimizationList } from '@/service/api';

const tableRef = ref(null);
const loading = ref(false);
const hasMoreData = ref(true);
const tableData = ref<Api.performanceOptimization.performanceOptimization[]>([]);
const params = reactive({
  pageNo: 0,
  pageSize: 50,
  total: 51
});
const columns = [
  {
    key: '_id',
    dataKey: '_id',
    title: '性能指标id',
    width: 150
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '性能指标名称',
    width: 150
  },
  {
    key: 'value',
    dataKey: 'value',
    title: '性能指标值',
    width: 150,
    cellRenderer: ({ rowData }: { rowData: Api.performanceOptimization.performanceOptimization }) => {
      const value = rowData.value;
      const name = rowData.name;
      console.log('value', value);
      if (!value || !name) return h('span', value || '0');

      // 根据性能指标名称添加对应单位
      const unitMap: Record<string, string> = {
        FCP: 'ms',
        'First Contentful Paint': 'ms',
        LCP: 'ms',
        'Largest Contentful Paint': 'ms',
        FID: 'ms',
        'First Input Delay': 'ms',
        TTFB: 'ms',
        'Time to First Byte': 'ms',
        FMP: 'ms',
        'First Meaningful Paint': 'ms',
        'Speed Index': 'ms',
        CLS: '',
        'Cumulative Layout Shift': '',
        INP: 'ms',
        Memory: 'MB',
        'Memory Usage': 'MB',
        MemoryLeak: '%',
        LongTask: 'ms',
        FPS: 'fps'
      };

      const unit = unitMap[name] || '';
      const displayValue = unit ? `${value} ${unit}` : value;
      console.log('displayValue', displayValue);
      return h('span', displayValue);
    }
  },
  {
    key: 'rating',
    dataKey: 'rating',
    title: '性能指标评级',
    width: 150,
    cellRenderer: ({ rowData }: { rowData: Api.performanceOptimization.performanceOptimization }) => {
      const rating = rowData.rating;

      if (!rating) return h('span', rating || '');

      // 定义评级到颜色的映射
      const ratingColorMap: Record<string, { color: string; bgColor: string; text: string }> = {
        good: {
          color: '#67C23A',
          bgColor: '#F0F9FF',
          text: '良好'
        },
        'needs-improvement': {
          color: '#E6A23C',
          bgColor: '#FDF6EC',
          text: '需改进'
        },
        poor: {
          color: '#F56C6C',
          bgColor: '#FEF0F0',
          text: '较差'
        }
      };

      const ratingConfig = ratingColorMap[rating] || {
        color: '#909399',
        bgColor: '#F4F4F5',
        text: rating
      };

      return h(
        'span',
        {
          style: {
            color: ratingConfig.color,
            backgroundColor: ratingConfig.bgColor,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'inline-block',
            minWidth: '60px',
            textAlign: 'center'
          }
        },
        ratingConfig.text
      );
    }
  },
  {
    key: 'delta',
    dataKey: 'delta',
    title: '性能指标增量',
    width: 150
  },
  {
    key: 'navigationType',
    dataKey: 'navigationType',
    title: '导航类型',
    width: 150
  },
  {
    key: 'timestamp',
    dataKey: 'timestamp',
    title: '时间戳',
    width: 150
  },
  {
    key: 'url',
    dataKey: 'url',
    title: 'URL',
    width: 150
  },
  {
    key: 'userAgent',
    dataKey: 'userAgent',
    title: '用户代理',
    width: 150
  },
  {
    key: 'taskType',
    dataKey: 'taskType',
    title: '任务类型',
    width: 150
  },
  {
    key: 'leakType',
    dataKey: 'leakType',
    title: '泄漏类型',
    width: 150
  },
  {
    key: 'created_at',
    dataKey: 'created_at',
    title: '创建时间',
    width: 150
  },
  {
    key: '__v',
    dataKey: '__v',
    title: '版本号',
    width: 150
  }
];
// 加载更多数据依赖的函数需提前声明
const getOptionData = async () => {
  console.log('2222222222222');
  loading.value = true;
  await fetchGetPerformanceOptimizationList({ pageNo: params.pageNo, pageSize: params.pageSize })
    .then(res => {
      console.log('res', res);
      tableData.value = [...tableData.value, ...(res?.data?.list || [])];
    })
    .finally(() => {
      loading.value = false;
    });
};
const loadMoreData = async () => {
  params.pageNo += 1;
  getOptionData();
};
// 处理滚动事件
const handleScroll = () => {
  const element = document.querySelector('.el-table-v2__body div') as HTMLElement;
  if (loading.value || !hasMoreData.value) return;
  console.log(
    'element.scrollHeight,element.scrollTop,element.clientHeight,阈值:',
    element.scrollHeight,
    element.scrollTop,
    element.clientHeight,
    0
  );
  if (
    element.scrollHeight <= element.scrollTop + element.clientHeight + 0 &&
    params.total > params.pageNo * params.pageSize
  ) {
    loadMoreData();
  }
};
const debounceHandleScroll = useDebounceFn(handleScroll, 300);
onMounted(() => {
  // getOptionData();
});
</script>

<template>
  <div style="width: 100%">
    <ElTableV2
      ref="tableRef"
      :columns="columns"
      :data="tableData"
      :width="1000"
      :height="400"
      fixed
      @scroll="debounceHandleScroll"
    />
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <ElSkeleton animated row="1" :column-width="[200]" />
    </div>

    <!-- 没有更多数据 -->
    <div v-if="!loading && hasMoreData === false" class="no-more-data">没有更多数据了</div>
  </div>
</template>

<style scoped></style>
