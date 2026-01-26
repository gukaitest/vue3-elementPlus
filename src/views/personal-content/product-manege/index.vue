/** * 产品管理页面 * * 功能包括： * - 产品列表展示 * - 产品搜索与筛选 * - 产品新增/编辑/删除 * - 批量删除 * -
列显示/隐藏配置 * * @file index.vue */

<script setup lang="tsx">
import { ElButton, ElPopconfirm } from 'element-plus';
import { productCategoryRecord } from '@/constants/business';
import { fetchBatchDeleteProduct, fetchDeleteProduct, fetchGetProductList } from '@/service/api';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserSearch from './modules/user-search.vue';

// 定义组件名称
defineOptions({ name: 'ProductManage' });

// 包装产品API函数，将返回格式转换为标准分页格式
function fetchProductListAdapter(params?: Api.productsList.ProductSearchParams) {
  return fetchGetProductList(params).then(res => {
    // 将产品API返回的 { products, total } 转换为标准格式 { records, current, size, total }
    const { products = [], total = 0 } = res.data || {};
    const current = params?.current || 1;
    const size = params?.size || 10;

    return {
      ...res,
      data: {
        records: products,
        current,
        size,
        total
      }
    };
  });
}

// 使用表格 Hook，获取表格相关的状态和方法
const {
  columns, // 过滤后的列配置
  columnChecks, // 列显示/隐藏配置项
  data, // 表格数据列表
  getData, // 获取数据方法
  getDataByPage, // 按页码获取数据方法
  loading, // 加载状态
  mobilePagination, // 移动端适配的分页配置
  searchParams, // 搜索参数
  resetSearchParams // 重置搜索参数方法
} = useTable({
  // API 函数：获取产品列表（使用适配器转换数据格式）
  apiFn: fetchProductListAdapter as any,
  showTotal: true,
  // API 初始参数
  apiParams: {
    current: 1, // 当前页码
    size: 10, // 每页条数
    product_id: undefined, // 产品ID
    product_name: undefined, // 产品名称
    category: undefined, // 分类
    price: undefined, // 价格
    stock: undefined // 库存
  },
  // 列配置工厂函数
  columns: () => [
    // 选择列：用于多选功能
    { type: 'selection', width: 48 },
    // 索引列：显示行号
    { prop: 'index', label: $t('common.index'), width: 64 },
    // 产品ID列
    { prop: 'product_id', label: $t('page.personalContent.productManege.product_id'), width: 100 },
    // 产品名称列
    { prop: 'product_name', label: $t('page.personalContent.productManege.product_name'), minWidth: 150 },
    // 分类列
    {
      prop: 'category',
      label: $t('page.personalContent.productManege.category'),
      width: 120,
      formatter: (row: any) => {
        // 如果分类未定义，返回空字符串
        if (!row.category) {
          return '';
        }

        // 获取分类标签文本
        const label = $t(productCategoryRecord[row.category as keyof typeof productCategoryRecord] || '');

        return label || row.category;
      }
    },
    // 价格列
    { prop: 'price', label: $t('page.personalContent.productManege.price'), width: 100 },
    // 库存列
    { prop: 'stock', label: $t('page.personalContent.productManege.stock'), width: 100 },
    // 描述列
    { prop: 'description', label: '描述', minWidth: 200, showOverflowTooltip: true },
    // 操作列：包含编辑和删除按钮
    {
      prop: 'operate',
      label: $t('common.operate'),
      minWidth: 120,
      align: 'center',
      formatter: (row: any) => (
        <div class="flex-center">
          {/* 编辑按钮 */}
          {/* eslint-disable-next-line no-underscore-dangle */}
          <ElButton type="primary" plain size="small" onClick={() => edit(row._id)}>
            {$t('common.edit')}
          </ElButton>
          {/* 删除按钮：带确认提示 */}
          {/* eslint-disable-next-line no-underscore-dangle */}
          <ElPopconfirm title={$t('common.confirmDelete')} onConfirm={() => handleDelete(row._id)}>
            {{
              reference: () => (
                <ElButton type="danger" plain size="small">
                  {$t('common.delete')}
                </ElButton>
              )
            }}
          </ElPopconfirm>
        </div>
      )
    }
  ]
});

// 使用表格操作 Hook，获取操作相关的状态和方法
const {
  drawerVisible, // 抽屉显示/隐藏状态
  operateType, // 操作类型：'add' | 'edit'
  editingData, // 正在编辑的数据
  handleAdd, // 处理新增操作
  handleEdit: baseHandleEdit, // 处理编辑操作
  checkedRowKeys, // 选中的行 key 数组
  onBatchDeleted, // 批量删除完成后的回调
  onDeleted // 单个删除完成后的回调
  // closeDrawer // 关闭抽屉方法（未使用）
} = useTableOperate(data as any, getData);

/** 处理批量删除 删除选中的多个产品 */
async function handleBatchDelete() {
  try {
    const { error } = await fetchBatchDeleteProduct(checkedRowKeys.value);
    if (!error) {
      // 执行删除完成后的回调（显示提示、清空选中、刷新数据）
      onBatchDeleted();
    }
  } catch (err) {
    window.$message?.error('批量删除失败，请重试');
  }
}

/**
 * 处理单个删除 删除指定的产品
 *
 * @param id 产品 ID
 */
async function handleDelete(id: string) {
  try {
    const { error } = await fetchDeleteProduct(id);
    if (!error) {
      // 执行删除完成后的回调（显示提示、刷新数据）
      onDeleted();
    }
  } catch (err) {
    window.$message?.error('删除失败，请重试');
  }
}

/**
 * 处理编辑操作 打开编辑抽屉
 *
 * @param id 产品 ID
 */
function edit(id: string) {
  // 从表格数据中查找要编辑的产品
  // eslint-disable-next-line no-underscore-dangle
  const findItem = data.value.find((item: any) => item._id === id);
  if (findItem) {
    operateType.value = 'edit';
    editingData.value = findItem as any;
    drawerVisible.value = true;
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <!-- 搜索组件：双向绑定搜索参数，监听重置和搜索事件 -->
    <UserSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />

    <!-- 表格卡片容器 -->
    <ElCard class="sm:flex-1-hidden card-wrapper" body-class="ht50">
      <!-- 卡片头部：标题和操作按钮 -->
      <template #header>
        <div class="flex items-center justify-between">
          <p>{{ $t('page.personalContent.productManege.title') }}</p>
          <!-- 表格头部操作组件：列配置、新增、删除、刷新 -->
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            @add="handleAdd"
            @delete="handleBatchDelete"
            @refresh="getData"
          />
        </div>
      </template>

      <!-- 表格容器 -->
      <div class="h-[calc(100%-50px)]">
        <!-- Element Plus 表格组件 -->
        <ElTable
          v-loading="loading"
          height="100%"
          border
          class="sm:h-full"
          :data="data"
          row-key="_id"
          @selection-change="checkedRowKeys = $event"
        >
          <!-- 动态渲染列 -->
          <ElTableColumn v-for="col in columns" :key="col.prop" v-bind="col" />
        </ElTable>
      </div>

      <!-- 分页组件 -->
      <div class="mt-20px flex justify-end">
        <ElPagination
          v-if="mobilePagination.total"
          layout="total,prev,pager,next,sizes"
          v-bind="mobilePagination"
          @current-change="mobilePagination['current-change']"
          @size-change="mobilePagination['size-change']"
        />
      </div>

      <!-- 产品操作抽屉：新增/编辑产品 -->
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData as any"
        @submitted="getDataByPage"
      />
    </ElCard>
  </div>
</template>

<style lang="scss" scoped>
/**
 * 卡片样式
 * 设置卡片内容区域高度，减去头部高度（50px）
 */
:deep(.el-card) {
  .ht50 {
    height: calc(100% - 50px);
  }
}
</style>
