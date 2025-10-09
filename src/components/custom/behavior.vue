<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { fetchGetUserBehaviors } from '@/service/api';

const tableRef = ref(null);
const loading = ref(false);
const hasMoreData = ref(true);
const tableData = ref<Api.UserBehavior.BehaviorInfo[]>([]);
const params = reactive({
  pageNo: 0,
  pageSize: 50,
  total: 51
});
const columns = [
  {
    key: 'behaviorId',
    dataKey: 'behaviorId',
    title: '行为ID',
    width: 200
  },
  {
    key: 'type',
    dataKey: 'type',
    title: '行为类型',
    width: 150
  },
  {
    key: 'level',
    dataKey: 'level',
    title: '级别',
    width: 120,
    cellRenderer: ({ rowData }: { rowData: any }) => {
      const level = rowData.level;

      if (!level) return h('span', '');

      // 定义级别到颜色的映射
      const levelColorMap: Record<string, { color: string; bgColor: string; text: string }> = {
        high: {
          color: '#F56C6C',
          bgColor: '#FEF0F0',
          text: '高'
        },
        medium: {
          color: '#E6A23C',
          bgColor: '#FDF6EC',
          text: '中'
        },
        low: {
          color: '#67C23A',
          bgColor: '#F0F9FF',
          text: '低'
        }
      };

      const levelConfig = levelColorMap[level] || {
        color: '#909399',
        bgColor: '#F4F4F5',
        text: level
      };

      return h(
        'span',
        {
          style: {
            color: levelConfig.color,
            backgroundColor: levelConfig.bgColor,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'inline-block',
            minWidth: '50px',
            textAlign: 'center'
          }
        },
        levelConfig.text
      );
    }
  },
  {
    key: 'sessionId',
    dataKey: 'sessionId',
    title: '会话ID',
    width: 250
  },
  {
    key: 'userId',
    dataKey: 'userId',
    title: '用户ID',
    width: 150,
    cellRenderer: ({ rowData }: { rowData: any }) => {
      const userId = rowData.userId;
      return h('span', userId || '未登录');
    }
  },
  {
    key: 'pageLoadTime',
    dataKey: 'pageLoadTime',
    title: '页面加载时间',
    width: 150,
    cellRenderer: ({ rowData }: { rowData: any }) => {
      const pageLoadTime = rowData.pageLoadTime;
      return h('span', pageLoadTime ? `${pageLoadTime} ms` : '');
    }
  },
  {
    key: 'timestamp',
    dataKey: 'timestamp',
    title: '时间戳',
    width: 180,
    cellRenderer: ({ rowData }: { rowData: any }) => {
      const timestamp = rowData.timestamp;
      if (!timestamp) return h('span', '');
      const date = new Date(timestamp);
      return h('span', date.toLocaleString('zh-CN'));
    }
  },
  {
    key: 'url',
    dataKey: 'url',
    title: 'URL',
    width: 300
  },
  {
    key: 'userAgent',
    dataKey: 'userAgent',
    title: '用户代理',
    width: 300
  },
  {
    key: 'customData',
    dataKey: 'customData',
    title: '自定义数据',
    width: 200,
    cellRenderer: ({ rowData }: { rowData: any }) => {
      const customData = rowData.customData;
      if (!customData || Object.keys(customData).length === 0) {
        return h('span', '-');
      }
      return h('span', JSON.stringify(customData));
    }
  }
];
// 加载更多数据依赖的函数需提前声明
const getOptionData = async () => {
  console.log('加载用户行为数据');
  loading.value = true;
  await fetchGetUserBehaviors({ pageNo: params.pageNo, pageSize: params.pageSize })
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
