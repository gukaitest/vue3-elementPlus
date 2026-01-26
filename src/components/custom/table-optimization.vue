<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { fetchGetProductList } from '@/service/api';

const tableRef = ref(null);
const loading = ref(false);
const hasMoreData = ref(true);
const tableData = ref<Api.productsList.Product[]>([]);
const params = reactive({
  pageNo: 0,
  pageSize: 50,
  total: 51
});
const columns = [
  {
    key: 'product_id',
    dataKey: 'product_id',
    title: '产品id',
    width: 150
  },
  {
    key: 'product_name',
    dataKey: 'product_name',
    title: '产品名称',
    width: 150
  },
  {
    key: 'price',
    dataKey: 'price',
    title: '价格',
    width: 150
  },
  {
    key: 'category',
    dataKey: 'category',
    title: '分类',
    width: 150
  },
  {
    key: 'stock',
    dataKey: 'stock',
    title: '库存',
    width: 150
  },
  {
    key: 'description',
    dataKey: 'description',
    title: '描述',
    width: 150
  }
];
// 加载更多数据依赖的函数需提前声明
const getOptionData = async () => {
  console.log('2222222222222');
  loading.value = true;
  await fetchGetProductList({ product_name: '', pageNo: params.pageNo, pageSize: params.pageSize })
    .then(res => {
      console.log('res', res);
      tableData.value = [...tableData.value, ...(res?.data?.products || [])];
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
