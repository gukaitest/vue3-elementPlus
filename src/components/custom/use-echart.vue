<!--
 <script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { fetchGetProductList } from '@/service/api';

const darkMode = ref(false);
const loading = ref(true);
const displayMode = ref('sampled'); // all, aggregated, sampled
const productsData = ref([]);
const filteredData = ref([]);
const filterInput = ref('');
const paramsPage = reactive({
  pageNo: 1,
  pageSize: 1000,
  total: 51
});
// 模拟大数据生成
const getProductData = async () => {
  loading.value = true;
  await fetchGetProductList({ search: filterInput.value, pageNo: paramsPage.pageNo, pageSize: paramsPage.pageSize })
    .then(res => {
      console.log('res', res);
      productsData.value = res?.data?.products;
      paramsPage.total = res?.data?.total ?? 0;
    })
    .finally(() => {
      loading.value = false;
    });

  return productsData.value;
};

// 主题处理
const theme = computed(() => {
  return darkMode.value ? 'dark' : 'light';
});

// 图表配置
const chartOption = computed(() => {
  const isDark = darkMode.value;

  // 根据显示模式处理数据
  let xAxisData = [];
  let seriesData = [];

  if (displayMode.value === 'aggregated') {
    // 按类别聚合数据
    const categoryMap = new Map();
    console.log('productsData.value', productsData.value);
    productsData.value.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          category: item.category,
          totalStock: 0,
          count: 0
        });
      }

      const categoryData = categoryMap.get(item.category);
      categoryData.totalStock += item.stock;
      categoryData.count += 1;
    });

    // 转换为图表数据
    categoryMap.forEach((value, key) => {
      xAxisData.push(key);
      seriesData.push(Math.round(value.totalStock / value.count)); // 平均库存
    });
  } else if (displayMode.value === 'all') {
    // 显示所有数据（大数据量性能警告）
    console.log('XXXXXXXX  productsData.value', productsData.value);
    xAxisData = filteredData.value.map(item => item.product_name);
    seriesData = filteredData.value.map(item => item.stock);
  } else {
    // 采样模式 - 显示500个点
    const sampleSize = 500;
    const step = Math.max(1, Math.floor(productsData.value.length / sampleSize));

    for (let i = 0; i < productsData.value.length; i += step) {
      xAxisData.push(productsData.value[i].product_name);
      seriesData.push(productsData.value[i].stock);
    }
  }

  return {
    backgroundColor: isDark ? '#121212' : '#fff',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(40, 40, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDark ? '#555' : '#ddd',
      textStyle: {
        color: isDark ? '#eee' : '#333'
      },
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: isDark ? 'rgba(150, 150, 150, 0.1)' : 'rgba(150, 150, 150, 0.05)'
        }
      },
      formatter(params) {
        const data = params[0].data;
        if (displayMode.value === 'aggregated') {
          return `${params[0].name}<br/>平均库存: ${data}`;
        }
        const item = productsData.value.find(p => p.product_name === params[0].name);
        if (!item) return '';
        return `
          <strong>${item.product_name}</strong><br/>
          类别: ${item.category}<br/>
          库存: ${item.stock}<br/>
          价格: ¥${item.price}<br/>
          更新时间: ${new Date(item.updated_at).toLocaleDateString()}
        `;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        interval: 0,
        rotate: 45,
        color: isDark ? '#aaa' : '#666',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: isDark ? '#444' : '#ddd'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '库存量',
      nameTextStyle: {
        color: isDark ? '#aaa' : '#666'
      },
      axisLine: {
        lineStyle: {
          color: isDark ? '#444' : '#ddd'
        }
      },
      axisLabel: {
        color: isDark ? '#aaa' : '#666'
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#333' : '#eee'
        }
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 1
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        bottom: '5%',
        height: 20,
        backgroundColor: isDark ? '#333' : '#f5f7fa',
        borderColor: isDark ? '#555' : '#ddd',
        textStyle: {
          color: isDark ? '#ccc' : '#666'
        },
        handleStyle: {
          color: isDark ? '#555' : '#ddd',
          borderColor: isDark ? '#777' : '#bbb'
        }
      }
    ],
    series: [
      {
        name: '库存量',
        type: 'bar',
        data: seriesData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#5470c6' },
            { offset: 1, color: '#83a0ed' }
          ]),
          borderRadius: [2, 2, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(84, 112, 198, 0.5)'
          }
        },
        // 大数据量优化
        large: true,
        largeThreshold: 1000,
        progressive: 200,
        progressiveThreshold: 3000,
        progressiveChunkMode: 'mod'
      }
    ]
  };
});

// 切换主题
const toggleTheme = () => {
  document.documentElement.classList.toggle('dark', darkMode.value);
};

// 切换加载状态
const toggleLoading = () => {
  loading.value = !loading.value;
};

// 刷新数据
const refreshData = () => {
  console.log('refreshData');
  loading.value = true;
  setTimeout(() => {
    productsData.value = getProductData();
    filteredData.value = getCurrentPageData();
    loading.value = false;
  }, 1000);
};

// 处理分页变化
const handlePageChange = page => {
  console.log('page:', page);
  paramsPage.pageNo = page;
  getProductData();
};

// 处理每页数量变化
const handleSizeChange = size => {
  console.log('size:', size);
  paramsPage.pageSize = size;
  getProductData();
};

// 获取当前页数据
const getCurrentPageData = () => {
  return productsData.value;
};

// 监听显示模式变化
watch(displayMode, () => {
  if (displayMode.value === 'all') {
    filteredData.value = getCurrentPageData();
  }
});

onMounted(() => {
  toggleTheme();
  refreshData();
});
</script>

<template>
  <div class="dashboard" :class="[{ dark: darkMode }]">
    <div class="header">
      <h1>产品库存数据可视化</h1>
      <div class="controls">
        <ElSwitch v-model="darkMode" active-text="暗色模式" inactive-text="亮色模式" @change="toggleTheme" />
        <ElButton type="primary" @click="toggleLoading">
          {{ loading ? '隐藏加载' : '显示加载' }}
        </ElButton>
        <ElButton @click="refreshData">刷新数据</ElButton>
        <ElSelect v-model="displayMode" placeholder="显示模式" style="width: 150px">
          <ElOption label="全部数据" value="all" />
          <ElOption label="分类聚合" value="aggregated" />
          <ElOption label="随机采样" value="sampled" />
        </ElSelect>

        <ElSelect v-model="paramsPage.pageSize" placeholder="每页数量" style="width: 120px">
          <ElOption label="100条" :value="100" />
          <ElOption label="1000条" :value="1000" />
          <ElOption label="3000条" :value="3000" />
        </ElSelect>
      </div>
    </div>

    <div class="chart-container">
      <BaseChart ref="chartRef" :option="chartOption" :theme="theme" :loading="loading" height="500px" />

      <div v-if="loading" class="loading-overlay">
        <ElIcon class="is-loading" :size="36">
          <Loading />
        </ElIcon>
      </div>
    </div>

    <div class="pagination-container">
      <ElPagination
        v-model:current-page="paramsPage.pageNo"
        v-model:page-size="paramsPage.pageSize"
        :total="paramsPage.total"
        :page-sizes="[100, 1000, 3000]"
        layout="prev, pager, next, sizes, total"
        class="pagination-background"
        @update:current-page="handlePageChange"
        @update:page-size="handleSizeChange"
      />
    </div>
  </div>
</template>
-->

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { ComputedRef, Reactive, Ref } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { fetchGetProductList } from '@/service/api';

// 引入所需类型

// 定义产品数据接口
// interface Product {
//   product_id: string;
//   product_name: string;
//   category: string;
//   stock: number;
//   price: number;
//   updated_at: string;
//   description: string;
// }

// 定义API返回数据接口
// interface ProductListResponse {
//   products: Product[];
//   total: number;
// }

// 变量类型定义
const darkMode: Ref<boolean> = ref(false);
const loading: Ref<boolean> = ref(true);
const displayMode: Ref<'all' | 'aggregated' | 'sampled'> = ref('sampled');
const productsData = ref<Api.productsList.Product[]>([]);
const filteredData = ref<Api.productsList.Product[]>([]);
const filterInput: Ref<string> = ref('');

// 分页参数类型定义
interface PaginationParams {
  pageNo: number;
  pageSize: number;
  total: number;
}
const paramsPage: Reactive<PaginationParams> = reactive({
  pageNo: 1,
  pageSize: 1000,
  total: 51
});

// 模拟大数据生成函数类型定义
const getProductData = async (): Promise<Api.productsList.Product[]> => {
  loading.value = true;
  try {
    const res = await fetchGetProductList({
      search: filterInput.value,
      pageNo: paramsPage.pageNo,
      pageSize: paramsPage.pageSize
    });
    console.log('res', res);
    productsData.value = res?.data?.products || [];
    paramsPage.total = res?.data?.total || 0;
    return productsData.value;
  } catch (error) {
    console.error('获取产品数据失败', error);
    return [];
  } finally {
    loading.value = false;
  }
};

// 主题处理计算属性类型定义
const theme: ComputedRef<'dark' | 'light'> = computed(() => {
  return darkMode.value ? 'dark' : 'light';
});

// 图表配置计算属性类型定义
const chartOption: ComputedRef<EChartsOption> = computed(() => {
  const isDark = darkMode.value;

  // 根据显示模式处理数据
  let xAxisData: string[] = [];
  let seriesData: number[] = [];

  if (displayMode.value === 'aggregated') {
    // 按类别聚合数据
    const categoryMap = new Map<string, { category: string; totalStock: number; count: number }>();
    console.log('productsData.value', productsData.value);
    productsData.value.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          category: item.category,
          totalStock: 0,
          count: 0
        });
      }

      const categoryData = categoryMap.get(item.category)!;
      categoryData.totalStock += item.stock;
      categoryData.count += 1;
    });

    // 转换为图表数据
    categoryMap.forEach((value, key) => {
      xAxisData.push(key);
      seriesData.push(Math.round(value.totalStock / value.count)); // 平均库存
    });
  } else if (displayMode.value === 'all') {
    // 显示所有数据（大数据量性能警告）
    console.log('XXXXXXXX  productsData.value', productsData.value);
    xAxisData = filteredData.value.map(item => item.product_name);
    seriesData = filteredData.value.map(item => item.stock);
  } else {
    // 采样模式 - 显示500个点
    const sampleSize = 500;
    const step = Math.max(1, Math.floor(productsData.value.length / sampleSize));

    for (let i = 0; i < productsData.value.length; i += step) {
      xAxisData.push(productsData.value[i].product_name);
      seriesData.push(productsData.value[i].stock);
    }
  }

  return {
    backgroundColor: isDark ? '#121212' : '#fff',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(40, 40, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDark ? '#555' : '#ddd',
      textStyle: {
        color: isDark ? '#eee' : '#333'
      },
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: isDark ? 'rgba(150, 150, 150, 0.1)' : 'rgba(150, 150, 150, 0.05)'
        }
      },
      formatter(params: any) {
        const data = params[0].data;
        if (displayMode.value === 'aggregated') {
          return `${params[0].name}<br/>平均库存: ${data}`;
        }
        const item = productsData.value.find(p => p.product_name === params[0].name);
        if (!item) return '';
        return `
          <strong>${item.product_name}</strong><br/>
          类别: ${item.category}<br/>
          库存: ${item.stock}<br/>
          价格: ¥${item.price}<br/>
          更新时间: ${new Date(item.updated_at).toLocaleDateString()}
        `;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        interval: 0,
        rotate: 45,
        color: isDark ? '#aaa' : '#666',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: isDark ? '#444' : '#ddd'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '库存量',
      nameTextStyle: {
        color: isDark ? '#aaa' : '#666'
      },
      axisLine: {
        lineStyle: {
          color: isDark ? '#444' : '#ddd'
        }
      },
      axisLabel: {
        color: isDark ? '#aaa' : '#666'
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#333' : '#eee'
        }
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 1
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        bottom: '5%',
        height: 20,
        backgroundColor: isDark ? '#333' : '#f5f7fa',
        borderColor: isDark ? '#555' : '#ddd',
        textStyle: {
          color: isDark ? '#ccc' : '#666'
        },
        handleStyle: {
          color: isDark ? '#555' : '#ddd',
          borderColor: isDark ? '#777' : '#bbb'
        }
      }
    ],
    series: [
      {
        name: '库存量',
        type: 'bar',
        data: seriesData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#5470c6' },
            { offset: 1, color: '#83a0ed' }
          ]),
          borderRadius: [2, 2, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(84, 112, 198, 0.5)'
          }
        },
        // 大数据量优化
        large: true,
        largeThreshold: 1000,
        progressive: 200,
        progressiveThreshold: 3000,
        progressiveChunkMode: 'mod'
      }
    ]
  };
});

// 切换主题函数类型定义
const toggleTheme = (): void => {
  document.documentElement.classList.toggle('dark', darkMode.value);
};

// 切换加载状态函数类型定义
const toggleLoading = (): void => {
  loading.value = !loading.value;
};

// 获取当前页数据函数类型定义
const getCurrentPageData = (): Api.productsList.Product[] => {
  return productsData.value;
};

// 刷新数据函数类型定义
const refreshData = (): void => {
  console.log('refreshData');
  loading.value = true;
  setTimeout(() => {
    getProductData();
    filteredData.value = getCurrentPageData();
    loading.value = false;
  }, 1000);
};

// 处理分页变化函数类型定义
const handlePageChange = (page: number): void => {
  console.log('page:', page);
  paramsPage.pageNo = page;
  getProductData();
};

// 处理每页数量变化函数类型定义
const handleSizeChange = (size: number): void => {
  console.log('size:', size);
  paramsPage.pageSize = size;
  getProductData();
};

// 监听显示模式变化
watch(displayMode, (newValue: string) => {
  if (newValue === 'all') {
    filteredData.value = getCurrentPageData();
  }
});

onMounted(() => {
  toggleTheme();
  refreshData();
});
</script>

<template>
  <div class="dashboard" :class="[{ dark: darkMode }]">
    <div class="header">
      <h1>产品库存数据可视化</h1>
      <div class="controls">
        <ElSwitch v-model="darkMode" active-text="暗色模式" inactive-text="亮色模式" @change="toggleTheme" />
        <ElButton type="primary" @click="toggleLoading">
          {{ loading ? '隐藏加载' : '显示加载' }}
        </ElButton>
        <ElButton @click="refreshData">刷新数据</ElButton>
        <ElSelect v-model="displayMode" placeholder="显示模式" style="width: 150px">
          <ElOption label="全部数据" value="all" />
          <ElOption label="分类聚合" value="aggregated" />
          <ElOption label="随机采样" value="sampled" />
        </ElSelect>

        <ElSelect v-model="paramsPage.pageSize" placeholder="每页数量" style="width: 120px">
          <ElOption label="100条" :value="100" />
          <ElOption label="1000条" :value="1000" />
          <ElOption label="3000条" :value="3000" />
        </ElSelect>
      </div>
    </div>

    <div class="chart-container">
      <BaseChart ref="chartRef" :option="chartOption" :theme="theme" :loading="loading" height="500px" />

      <div v-if="loading" class="loading-overlay">
        <ElIcon class="is-loading" :size="36">
          <Loading />
        </ElIcon>
      </div>
    </div>

    <div class="pagination-container">
      <ElPagination
        v-model:current-page="paramsPage.pageNo"
        v-model:page-size="paramsPage.pageSize"
        :total="paramsPage.total"
        :page-sizes="[100, 1000, 3000]"
        layout="prev, pager, next, sizes, total"
        class="pagination-background"
        @update:current-page="handlePageChange"
        @update:page-size="handleSizeChange"
      />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  transition: background-color 0.3s;
  display: flex;
  flex-direction: column;
}

.dashboard.dark {
  background-color: #121212;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  flex-shrink: 0;
}

.header h1 {
  font-size: 24px;
  color: var(--el-color-primary);
  margin: 0;
}

.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.chart-container {
  flex: 1;
  min-height: 500px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  padding: 20px;
  margin-bottom: 20px;
  position: relative;
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

.pagination-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.data-info {
  margin-top: auto;
}

.statistics {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.stat-item {
  padding: 10px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 5px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--el-color-primary);
}

@media (max-width: 992px) {
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .controls {
    width: 100%;
  }

  .chart-container {
    min-height: 400px;
  }

  .statistics {
    flex-wrap: wrap;
  }

  .stat-item {
    flex: 1 0 50%;
    margin-bottom: 10px;
  }
}

@media (max-width: 768px) {
  .chart-container {
    min-height: 350px;
    padding: 15px;
  }

  .controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .controls .el-button,
  .controls .el-select {
    width: 100%;
    margin-bottom: 8px;
  }

  .stat-item {
    flex: 1 0 100%;
  }
}
</style>
