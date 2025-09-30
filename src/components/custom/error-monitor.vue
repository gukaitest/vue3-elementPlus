<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { ErrorLevel, reportCustomError } from '@/plugins/error-monitor';
import { fetchGetErrorList, fetchReportError } from '@/service/api';

const tableRef = ref(null);
const loading = ref(false);
const hasMoreData = ref(true);
const tableData = ref<Api.ErrorMonitor.ErrorInfo[]>([]);
const params = reactive({
  pageNo: 0,
  pageSize: 50,
  total: 51
});
const columns = [
  {
    key: '_id',
    dataKey: '_id',
    title: '错误ID',
    width: 150
  },
  {
    key: 'type',
    dataKey: 'type',
    title: '错误类型',
    width: 120,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      const typeColorMap: Record<string, { color: string; bgColor: string; text: string }> = {
        javascript: { color: '#E6A23C', bgColor: '#FDF6EC', text: 'JS错误' },
        vue: { color: '#409EFF', bgColor: '#ECF5FF', text: 'Vue错误' },
        promise: { color: '#9C27B0', bgColor: '#F3E5F5', text: 'Promise错误' },
        resource: { color: '#FF9800', bgColor: '#FFF3E0', text: '资源错误' },
        ajax: { color: '#F56C6C', bgColor: '#FEF0F0', text: '请求错误' },
        custom: { color: '#909399', bgColor: '#F4F4F5', text: '自定义错误' }
      };

      const typeConfig = typeColorMap[rowData.type] || {
        color: '#909399',
        bgColor: '#F4F4F5',
        text: rowData.type
      };

      return h(
        'span',
        {
          style: {
            color: typeConfig.color,
            backgroundColor: typeConfig.bgColor,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'inline-block'
          }
        },
        typeConfig.text
      );
    }
  },
  {
    key: 'level',
    dataKey: 'level',
    title: '错误级别',
    width: 100,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      const levelColorMap: Record<string, { color: string; bgColor: string; text: string }> = {
        low: { color: '#67C23A', bgColor: '#F0F9FF', text: '低' },
        medium: { color: '#E6A23C', bgColor: '#FDF6EC', text: '中' },
        high: { color: '#F56C6C', bgColor: '#FEF0F0', text: '高' },
        critical: { color: '#F56C6C', bgColor: '#FEF0F0', text: '严重' }
      };

      const levelConfig = levelColorMap[rowData.level || 'medium'] || {
        color: '#909399',
        bgColor: '#F4F4F5',
        text: rowData.level || '未知'
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
            display: 'inline-block'
          }
        },
        levelConfig.text
      );
    }
  },
  {
    key: 'message',
    dataKey: 'message',
    title: '错误消息',
    width: 200
  },
  {
    key: 'url',
    dataKey: 'url',
    title: '页面URL',
    width: 200
  },
  {
    key: 'timestamp',
    dataKey: 'timestamp',
    title: '时间戳',
    width: 150,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      return h('span', new Date(rowData.timestamp).toLocaleString());
    }
  },
  {
    key: 'filename',
    dataKey: 'filename',
    title: '文件名',
    width: 150
  },
  {
    key: 'lineno',
    dataKey: 'lineno',
    title: '行号',
    width: 80
  },
  {
    key: 'colno',
    dataKey: 'colno',
    title: '列号',
    width: 80
  },
  {
    key: 'userId',
    dataKey: 'userId',
    title: '用户ID',
    width: 120
  },
  {
    key: 'sessionId',
    dataKey: 'sessionId',
    title: '会话ID',
    width: 150
  },
  {
    key: 'componentName',
    dataKey: 'componentName',
    title: '组件名称',
    width: 120
  },
  {
    key: 'route',
    dataKey: 'route',
    title: '路由路径',
    width: 150
  },
  {
    key: 'resourceType',
    dataKey: 'resourceType',
    title: '资源类型',
    width: 100
  },
  {
    key: 'resourceUrl',
    dataKey: 'resourceUrl',
    title: '资源URL',
    width: 200
  },
  {
    key: 'requestUrl',
    dataKey: 'requestUrl',
    title: '请求URL',
    width: 200
  },
  {
    key: 'requestMethod',
    dataKey: 'requestMethod',
    title: '请求方法',
    width: 100,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      if (!rowData.requestMethod) return h('span', '-');

      const methodColors: Record<string, string> = {
        GET: '#67C23A',
        POST: '#409EFF',
        PUT: '#E6A23C',
        DELETE: '#F56C6C',
        PATCH: '#9C27B0'
      };

      const color = methodColors[rowData.requestMethod.toUpperCase()] || '#909399';

      return h(
        'span',
        {
          style: {
            color: '#fff',
            backgroundColor: color,
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px',
            fontWeight: '500',
            display: 'inline-block'
          }
        },
        rowData.requestMethod.toUpperCase()
      );
    }
  },
  {
    key: 'responseStatus',
    dataKey: 'responseStatus',
    title: '响应状态',
    width: 100,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      if (!rowData.responseStatus) return h('span', '-');

      const status = rowData.responseStatus;
      let color = '#909399';

      if (status >= 200 && status < 300) color = '#67C23A';
      else if (status >= 300 && status < 400) color = '#E6A23C';
      else if (status >= 400 && status < 500) color = '#F56C6C';
      else if (status >= 500) color = '#F56C6C';

      return h(
        'span',
        {
          style: {
            color: '#fff',
            backgroundColor: color,
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px',
            fontWeight: '500',
            display: 'inline-block'
          }
        },
        status.toString()
      );
    }
  },
  {
    key: 'userAgent',
    dataKey: 'userAgent',
    title: '用户代理',
    width: 200,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      if (!rowData.userAgent) return h('span', '-');

      // 提取浏览器信息
      const ua = rowData.userAgent;
      let browser = 'Unknown';

      if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';
      else if (ua.includes('Opera')) browser = 'Opera';

      return h('span', { title: ua }, browser);
    }
  },
  {
    key: 'stack',
    dataKey: 'stack',
    title: '错误堆栈',
    width: 300,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      if (!rowData.stack) return h('span', '-');

      // 只显示堆栈的第一行，鼠标悬停显示完整堆栈
      const firstLine = rowData.stack.split('\n')[0];
      return h(
        'span',
        {
          style: {
            cursor: 'pointer',
            color: '#409EFF',
            textDecoration: 'underline'
          },
          title: rowData.stack
        },
        firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine
      );
    }
  },
  {
    key: 'customData',
    dataKey: 'customData',
    title: '自定义数据',
    width: 150,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      if (!rowData.customData) return h('span', '-');

      return h(
        'span',
        {
          style: {
            cursor: 'pointer',
            color: '#409EFF'
          },
          title: JSON.stringify(rowData.customData, null, 2)
        },
        '查看详情'
      );
    }
  },
  {
    key: 'created_at',
    dataKey: 'created_at',
    title: '创建时间',
    width: 150,
    cellRenderer: ({ rowData }: { rowData: Api.ErrorMonitor.ErrorInfo }) => {
      if (!rowData.created_at) return h('span', '-');

      return h('span', new Date(rowData.created_at).toLocaleString());
    }
  },
  {
    key: 'errorId',
    dataKey: 'errorId',
    title: '错误标识',
    width: 120
  }
];
// 加载更多数据依赖的函数需提前声明
const getOptionData = async () => {
  console.log('2222222222222');
  loading.value = true;
  await fetchGetErrorList({ pageNo: params.pageNo, pageSize: params.pageSize })
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
// 错误触发函数
const triggerJSError = () => {
  // 故意触发一个JavaScript错误
  // @ts-ignore
  undefinedVariable.someMethod();
};

const triggerVueError = () => {
  // 通过修改响应式数据触发Vue错误
  const obj = ref({ nested: { value: 1 } });
  // @ts-ignore
  obj.value.nested.undefinedProperty.trigger = 'error';
};

const triggerPromiseError = () => {
  // 触发未处理的Promise拒绝
  Promise.reject(new Error('这是一个测试的Promise错误'));
};

const triggerResourceError = () => {
  // 触发资源加载错误
  const img = new Image();
  img.src = 'https://testtesttesterror.com/test-image.jpg';
  img.onerror = () => {
    console.log('图片加载失败，资源错误已触发');
  };
  document.body.appendChild(img);
  console.log('图片加载失败，资源错误已触发');
};

const triggerAjaxError = async () => {
  // 触发HTTP请求错误 - 多种错误场景
  const errorScenarios = [
    // 场景1: 无效的API端点
    () => fetch('/api/nonexistent-endpoint', { method: 'GET' }),

    // 场景2: 无效的请求参数
    () =>
      fetchGetErrorList({
        pageNo: -1,
        pageSize: 'invalid',
        invalidParam: 'test'
      } as any),

    // 场景3: 网络超时请求
    () =>
      fetch('/api/timeout-test', {
        method: 'GET',
        signal: AbortSignal.timeout(100) // 100ms超时
      }),

    // 场景4: 服务器错误状态码
    () => fetch('/api/server-error', { method: 'GET' }),

    // 场景5: 无效的请求方法
    () =>
      fetch('/monitor/errors', {
        method: 'INVALID_METHOD',
        headers: { 'Content-Type': 'application/json' }
      })
  ];

  // 随机选择一个错误场景
  const randomScenario = errorScenarios[Math.floor(Math.random() * errorScenarios.length)];

  try {
    await randomScenario();
  } catch (error) {
    console.log('请求错误已触发111:', error);
    // 手动报告这个错误到监控系统
    const errorObj = error as Error;
    reportCustomError(
      `HTTP请求错误: ${errorObj.message || '未知错误'}`,
      {
        errorType: 'ajax',
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        errorDetails: {
          name: errorObj.name,
          message: errorObj.message,
          stack: errorObj.stack
        }
      },
      ErrorLevel.HIGH
    );
  }
};

const triggerCustomError = () => {
  // 触发自定义错误
  reportCustomError(
    '这是一个测试的自定义错误',
    {
      testData: 'custom error data',
      timestamp: Date.now(),
      source: 'error-monitor-component'
    },
    ErrorLevel.MEDIUM
  );
};

// 新增：更复杂的错误请求场景
const triggerAdvancedAjaxError = async () => {
  const advancedErrorScenarios = [
    // 场景1: 并发请求冲突，无影响
    // async () => {
    //   const promises = Array.from({ length: 10 }, (_, i) =>
    //     fetchGetErrorList({ pageNo: i, pageSize: 1000 })
    //   );
    //   await Promise.all(promises);
    // },

    // 场景2: 大数据量请求
    // async () => {
    //   await fetchGetErrorList({
    //     pageNo: 1,
    //     pageSize: 999999
    //   });
    // },

    // 场景3: 无效的JSON响应处理
    async () => {
      const response = await fetch('/api/invalid-json');
      const data = await response.json(); // 这里会抛出JSON解析错误
    },

    // 场景4: 跨域请求错误
    async () => {
      await fetch('https://cors-test.example.com/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      });
    },

    // 场景5: 请求中断
    async () => {
      const controller = new AbortController();
      const promise = fetch('/api/slow-endpoint', {
        signal: controller.signal
      });

      // 立即中断请求
      setTimeout(() => controller.abort(), 10);
      await promise;
    }
  ];

  const randomScenario = advancedErrorScenarios[Math.floor(Math.random() * advancedErrorScenarios.length)];

  try {
    await randomScenario();
  } catch (error) {
    console.log('高级请求错误已触发:', error);
    const errorObj = error as Error;
    reportCustomError(
      `高级HTTP请求错误: ${errorObj.name} - ${errorObj.message}`,
      {
        errorType: 'ajax',
        errorCategory: 'advanced',
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        errorDetails: {
          name: errorObj.name,
          message: errorObj.message,
          stack: errorObj.stack,
          cause: (errorObj as any).cause
        }
      },
      ErrorLevel.CRITICAL
    );
  }
};

onMounted(() => {
  // getOptionData();
});
</script>

<template>
  <div style="width: 100%">
    <!-- 错误测试按钮区域 -->
    <div class="error-test-buttons mb-4">
      <h4 class="mb-3 text-lg font-semibold">错误测试</h4>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-7 md:grid-cols-4">
        <ElButton type="danger" size="small" @click="triggerJSError">生成JS错误</ElButton>
        <ElButton type="warning" size="small" @click="triggerVueError">生成Vue错误</ElButton>
        <ElButton type="info" size="small" @click="triggerPromiseError">生成Promise错误</ElButton>
        <ElButton type="primary" size="small" @click="triggerResourceError">生成资源错误</ElButton>
        <ElButton type="success" size="small" @click="triggerAjaxError">生成请求错误</ElButton>
        <ElButton type="danger" size="small" @click="triggerAdvancedAjaxError">生成高级请求错误</ElButton>
        <ElButton type="default" size="small" @click="triggerCustomError">生成自定义错误</ElButton>
      </div>
    </div>

    <ElTableV2
      ref="tableRef"
      :columns="columns"
      :data="tableData"
      :width="2000"
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

<style scoped>
.error-test-buttons {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin-bottom: 16px;
}

.error-test-buttons h4 {
  margin: 0 0 12px 0;
  color: #495057;
}

.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 768px) {
  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-7 {
    grid-template-columns: repeat(7, 1fr);
  }
}

.gap-3 {
  gap: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mb-3 {
  margin-bottom: 12px;
}

.loading-container {
  padding: 16px;
  text-align: center;
}

.no-more-data {
  padding: 16px;
  text-align: center;
  color: #6c757d;
  font-style: italic;
}
</style>
