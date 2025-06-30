<script lang="ts" setup>
// 按需导入 vxe-grid 及相关组件
import { onMounted, reactive, ref } from 'vue';
import { VxeGrid } from 'vxe-table';
import { fetchGetProductList } from '@/service/api';

// 按需导入样式（必须）
import 'vxe-table/lib/style.css';
defineOptions({ name: 'VxeTableDemo' });

const loading = ref(false);

const params = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 51
});
// 创建表格引用
const gridRef = ref(null);

// 表格配置（使用 TypeScript 类型）
const gridOptions = reactive({
  border: true,
  loading: false,
  showOverflow: true,
  showHeaderOverflow: true,
  showFooterOverflow: true,
  height: 400,
  columnConfig: {
    resizable: true
  },
  scrollY: {
    enabled: true,
    gt: 0
  }
});

const columns = [
  {
    field: 'product_id',
    title: '产品id',
    width: 150
  },
  {
    field: 'product_name',
    title: '产品名称',
    width: 150
  },
  {
    field: 'price',
    title: '价格',
    width: 150
  },
  {
    field: 'category',
    title: '分类',
    width: 150
  },
  {
    field: 'stock',
    title: '库存',
    width: 150
  },
  {
    field: 'description',
    title: '描述',
    width: 300
  }
];

const tableData = ref<Api.productsList.Product[]>([]);

const getOptionData = async () => {
  console.log('2222222222222');
  loading.value = true;
  await fetchGetProductList({ search: '', pageNo: params.pageNo, pageSize: params.pageSize })
    .then(res => {
      console.log('res', res);
      // tableData.value = res?.data?.products || [];
      tableData.value = [...tableData.value, ...(res?.data?.products || [])];
      console.log('tableData.value', tableData.value);
    })
    .finally(() => {
      loading.value = false;
    });
};
const gridEvents = {
  scroll: (event: any) => {
    const { scrollTop, bodyHeight, scrollHeight } = event;

    // 增加容差（1-2px）解决精度问题
    const isBottom = scrollTop + bodyHeight >= scrollHeight - 1;

    if (isBottom) {
      console.log('实际已滚动到底部');
      params.pageNo += 1;
      getOptionData();
    }
  }
};
onMounted(() => {
  getOptionData();
});
</script>

<template>
  <div class="grid-demo">
    <!-- 使用 vxe-grid 组件 -->
    <VxeGrid ref="gridRef" v-bind="gridOptions" :columns="columns" :data="tableData" v-on="gridEvents"></VxeGrid>
  </div>
</template>

<style scoped>
.grid-demo {
  padding: 20px;
}
</style>
