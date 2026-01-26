/**
 * Element Plus 表格 Hook 封装
 *
 * 基于通用表格 Hook (useHookTable) 进行封装，添加了 Element Plus 特定的功能：
 *
 * - Element Plus 分页组件支持
 * - 特殊列类型处理（selection、expand、index）
 * - 国际化支持
 * - 移动端适配
 * - 表格操作管理（增删改查）
 *
 * @file table.ts
 */

import { computed, effectScope, onScopeDispose, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { PaginationEmits, PaginationProps } from 'element-plus';
import { jsonClone } from '@sa/utils';
import { useBoolean, useHookTable } from '@sa/hooks';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';

/** 移除类型的 readonly 修饰符 用于 Element Plus 分页组件的类型处理 */
type RemoveReadonly<T> = {
  -readonly [key in keyof T]: T[key];
};

/** 表格数据类型 */
type TableData = UI.TableData;
/** 从 API 函数类型中提取表格数据类型 */
type GetTableData<A extends UI.TableApiFn> = UI.GetTableData<A>;
/** 表格列配置类型 */
type TableColumn<T> = UI.TableColumn<T>;

/**
 * Element Plus 表格数据管理 Hook
 *
 * 提供完整的表格功能，包括：
 *
 * - 数据获取与管理
 * - Element Plus 分页支持
 * - 列显示/隐藏管理
 * - 移动端适配
 * - 国际化支持
 *
 * @template A API 函数类型
 * @param config 表格配置项
 * @returns 返回表格相关的状态、方法和分页配置
 */
export function useTable<A extends UI.TableApiFn>(config: UI.NaiveTableConfig<A>) {
  // 创建 effect 作用域，用于管理副作用
  const scope = effectScope();
  // 应用状态管理
  const appStore = useAppStore();

  // 是否为移动端
  const isMobile = computed(() => appStore.isMobile);

  // 解构配置项
  const { apiFn, apiParams, immediate } = config;

  // 特殊列类型的唯一标识键
  const SELECTION_KEY = '__selection__'; // 选择列
  const EXPAND_KEY = '__expand__'; // 展开列
  const INDEX_KEY = '__index__'; // 索引列

  // 调用通用表格 Hook，获取基础功能
  const {
    loading,
    empty,
    data,
    columns,
    columnChecks,
    reloadColumns,
    getData,
    searchParams,
    updateSearchParams,
    resetSearchParams
  } = useHookTable<A, GetTableData<A>, TableColumn<UI.TableDataWithIndex<GetTableData<A>>>>({
    apiFn,
    apiParams,
    columns: config.columns,
    /** 数据转换函数 将后端返回的分页数据转换为表格所需格式，并为每条数据添加索引 */
    transformer: res => {
      // 解构后端返回的分页数据，设置默认值
      const { records = [], current = 1, size = 10, total = 0 } = res.data || {};

      // 确保每页条数大于 0，避免分页计算错误
      const pageSize = size <= 0 ? 10 : size;

      // 为每条数据添加索引（用于显示行号）
      // 索引计算：(当前页 - 1) * 每页条数 + 当前行索引 + 1
      const recordsWithIndex = records.map((item, index) => {
        return {
          ...item,
          index: (current - 1) * pageSize + index + 1
        };
      });

      return {
        data: recordsWithIndex,
        pageNum: current,
        pageSize,
        total
      };
    },
    /** 生成列显示/隐藏配置项 处理特殊列类型（selection、expand、index），为它们分配唯一标识 */
    getColumnChecks: cols => {
      const checks: UI.TableColumnCheck[] = [];

      cols.forEach(column => {
        // 选择列：用于多选功能
        if (column.type === 'selection') {
          checks.push({
            prop: SELECTION_KEY,
            label: $t('common.check'),
            checked: true
          });
        }
        // 展开列：用于行展开功能
        else if (column.type === 'expand') {
          checks.push({
            prop: EXPAND_KEY,
            label: $t('common.expandColumn'),
            checked: true
          });
        }
        // 索引列：用于显示行号
        else if (column.type === 'index') {
          checks.push({
            prop: INDEX_KEY,
            label: $t('common.index'),
            checked: true
          });
        }
        // 普通列：使用 prop 作为标识
        else {
          checks.push({
            prop: column.prop as string,
            label: column.label as string,
            checked: true
          });
        }
      });

      return checks;
    },
    /** 根据显示/隐藏配置过滤列 只返回用户选择显示的列配置 */
    getColumns: (cols, checks) => {
      // 创建列配置映射表，用于快速查找
      const columnMap = new Map<string, TableColumn<GetTableData<A>>>();

      // 将所有列配置存入映射表，使用特殊键或 prop 作为 key
      cols.forEach(column => {
        if (column.type === 'selection') {
          columnMap.set(SELECTION_KEY, column);
        } else if (column.type === 'expand') {
          columnMap.set(EXPAND_KEY, column);
        } else if (column.type === 'index') {
          columnMap.set(INDEX_KEY, column);
        } else {
          columnMap.set(column.prop as string, column);
        }
      });

      // 根据显示/隐藏配置过滤列：只返回 checked 为 true 的列
      const filteredColumns = checks
        .filter(item => item.checked)
        .map(check => columnMap.get(check.prop) as TableColumn<GetTableData<A>>);

      return filteredColumns;
    },
    /** 数据获取完成后的回调 更新 Element Plus 分页组件的状态 */
    onFetched: async transformed => {
      const { pageNum, pageSize, total } = transformed;

      // 更新分页信息
      updatePagination({
        currentPage: pageNum,
        pageSize,
        total
      });
    },
    immediate
  });

  /** Element Plus 分页组件配置 包含分页状态和事件处理函数 */
  const pagination: Partial<RemoveReadonly<PaginationProps & PaginationEmits>> = reactive({
    currentPage: 1, // 当前页码
    pageSize: 10, // 每页条数
    pageSizes: [10, 15, 20, 25, 30], // 每页条数选项
    /** 页码改变事件处理 当用户点击分页器切换页码时触发 */
    'current-change': (page: number) => {
      // 更新当前页码
      pagination.currentPage = page;

      // 更新搜索参数中的页码
      updateSearchParams({ current: page, size: pagination.pageSize! });

      // 重新获取数据
      getData();

      return true;
    },
    /** 每页条数改变事件处理 当用户改变每页显示条数时触发 */
    'size-change': (pageSize: number) => {
      // 重置到第一页
      pagination.currentPage = 1;
      // 更新每页条数
      pagination.pageSize = pageSize;

      // 更新搜索参数
      updateSearchParams({ current: pagination.currentPage, size: pageSize });

      // 重新获取数据
      getData();
      return true;
    }
  });

  /** 移动端适配的分页配置 根据设备类型调整分页器显示的页码数量 如果系统不支持移动端，可以直接使用 `pagination` */
  const mobilePagination = computed(() => {
    const p: Partial<RemoveReadonly<PaginationProps & PaginationEmits>> = {
      ...pagination,
      // 移动端显示 3 个页码按钮，PC 端显示 9 个
      pagerCount: isMobile.value ? 3 : 9
    };

    return p;
  });

  /**
   * 更新分页配置
   *
   * @param update 要更新的分页配置项
   */
  function updatePagination(update: Partial<PaginationProps>) {
    Object.assign(pagination, update);
  }

  /**
   * 根据页码获取数据 便捷方法，用于跳转到指定页码
   *
   * @param pageNum 页码，默认为 1
   */
  async function getDataByPage(pageNum: number = 1) {
    // 更新分页状态
    updatePagination({
      currentPage: pageNum
    });

    // 更新搜索参数
    updateSearchParams({
      current: pageNum,
      size: pagination.pageSize!
    });

    // 获取数据
    await getData();
  }

  // 监听语言切换，重新加载列配置（更新列标签的翻译）
  scope.run(() => {
    watch(
      () => appStore.locale,
      () => {
        reloadColumns();
      }
    );
  });

  // 组件卸载时清理副作用
  onScopeDispose(() => {
    scope.stop();
  });

  return {
    loading,
    empty,
    data,
    columns,
    columnChecks,
    reloadColumns,
    pagination,
    mobilePagination,
    updatePagination,
    getData,
    getDataByPage,
    searchParams,
    updateSearchParams,
    resetSearchParams
  };
}

/**
 * 表格操作管理 Hook
 *
 * 提供表格的增删改查操作管理功能：
 *
 * - 新增/编辑抽屉管理
 * - 选中行管理
 * - 删除操作回调
 *
 * @template T 表格数据类型
 * @param data 表格数据列表
 * @param getData 获取数据的函数
 * @returns 返回操作相关的状态和方法
 */
export function useTableOperate<T extends TableData = TableData>(data: Ref<T[]>, getData: () => Promise<void>) {
  // 抽屉显示/隐藏状态管理
  const { bool: drawerVisible, setTrue: openDrawer, setFalse: closeDrawer } = useBoolean();

  // 操作类型：'add' 新增 | 'edit' 编辑
  const operateType = ref<UI.TableOperateType>('add');

  /** 处理新增操作 设置操作类型为新增，并打开抽屉 */
  function handleAdd() {
    operateType.value = 'add';
    openDrawer();
  }

  /** 正在编辑的行数据 */
  const editingData: Ref<T | null> = ref(null);

  /**
   * 处理编辑操作 根据 ID 查找数据，深拷贝后设置到编辑数据中，并打开抽屉
   *
   * @param id 要编辑的数据 ID
   */
  function handleEdit(id: T['id']) {
    operateType.value = 'edit';
    // 从表格数据中查找要编辑的项
    const findItem = data.value.find(item => item.id === id) || null;
    // 深拷贝避免直接修改原数据
    editingData.value = jsonClone(findItem);

    openDrawer();
  }

  /** 表格中选中的行 key 数组 */
  const checkedRowKeys = ref<string[]>([]);

  /** 批量删除操作完成后的回调 显示成功提示，清空选中项，并刷新数据 */
  async function onBatchDeleted() {
    window.$message?.success($t('common.deleteSuccess'));

    // 清空选中项
    checkedRowKeys.value = [];

    // 刷新表格数据
    await getData();
  }

  /** 单个删除操作完成后的回调 显示成功提示，并刷新数据 */
  async function onDeleted() {
    window.$message?.success($t('common.deleteSuccess'));

    // 刷新表格数据
    await getData();
  }

  return {
    drawerVisible,
    openDrawer,
    closeDrawer,
    operateType,
    handleAdd,
    editingData,
    handleEdit,
    checkedRowKeys,
    onBatchDeleted,
    onDeleted
  };
}
