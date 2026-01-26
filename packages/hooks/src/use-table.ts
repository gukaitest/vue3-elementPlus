/**
 * 通用表格数据管理 Hook
 *
 * 这是一个框架无关的通用表格 Hook，提供表格数据的核心管理功能：
 *
 * - 数据获取与加载状态管理
 * - 搜索参数管理
 * - 列配置管理（显示/隐藏）
 * - 数据转换处理
 *
 * 该 Hook 不依赖任何 UI 库，可以被不同的 UI 库封装层复用
 *
 * @file use-table.ts
 */

import { computed, reactive, ref } from 'vue';
import type { Ref } from 'vue';
import { jsonClone } from '@sa/utils';
import useBoolean from './use-boolean';
import useLoading from './use-loading';

/** 可能是 Promise 或普通值的类型 用于支持同步和异步的回调函数 */
export type MaybePromise<T> = T | Promise<T>;

/** API 函数类型定义 接收任意参数，返回 Promise */
export type ApiFn = (args: any) => Promise<unknown>;

/** 表格列显示/隐藏配置项 */
export type TableColumnCheck = {
  /** 列的属性名（唯一标识） */
  prop: string;
  /** 列的显示标签 */
  label: string;
  /** 是否选中（显示） */
  checked: boolean;
};

/** 带索引的表格数据类型 在原始数据基础上添加了 index 字段，用于显示行号 */
export type TableDataWithIndex<T> = T & { index: number };

/** 转换后的表格数据结构 包含数据列表、分页信息等 */
export type TransformedData<T> = {
  /** 表格数据列表（每条数据都包含 index 字段） */
  data: TableDataWithIndex<T>[];
  /** 当前页码 */
  pageNum: number;
  /** 每页条数 */
  pageSize: number;
  /** 总记录数 */
  total: number;
};

/**
 * 数据转换函数类型 将 API 响应数据转换为表格所需的数据格式
 *
 * @template T 表格数据类型
 * @template Response API 响应类型
 */
export type Transformer<T, Response> = (response: Response) => TransformedData<T>;

/**
 * 表格配置项类型
 *
 * @template A API 函数类型
 * @template T 表格数据类型
 * @template C 列配置类型
 */
export type TableConfig<A extends ApiFn, T, C> = {
  /** 获取表格数据的 API 函数 */
  apiFn: A;
  /** API 请求的初始参数 Parameters 是 TS 内置泛型工具类型，核心功能是提取函数的参数类型并返回元组； */
  apiParams?: Parameters<A>[0];
  /** 将 API 响应数据转换为表格数据格式的转换函数 ReturnType 是 TS 内置泛型工具类型，核心功能是提取函数的返回值类型并直接返回 */
  transformer: Transformer<T, Awaited<ReturnType<A>>>;
  /** 列配置工厂函数，返回列配置数组 */
  columns: () => C[];
  /**
   * 根据列配置生成列显示/隐藏配置项
   *
   * @param columns 列配置数组
   * @returns 列显示/隐藏配置项数组
   */
  getColumnChecks: (columns: C[]) => TableColumnCheck[];
  /**
   * 根据列配置和显示/隐藏配置，返回过滤后的列配置
   *
   * @param columns 所有列配置
   * @param checks 列显示/隐藏配置项
   * @returns 过滤后的列配置数组
   */
  getColumns: (columns: C[], checks: TableColumnCheck[]) => C[];
  /**
   * 数据获取完成后的回调函数 可以在这里处理分页信息更新等操作
   *
   * @param transformed 转换后的表格数据
   */
  onFetched?: (transformed: TransformedData<T>) => MaybePromise<void>;
  /**
   * 是否在初始化时立即获取数据
   *
   * @default true
   */
  immediate?: boolean;
};

/**
 * 通用表格数据管理 Hook
 *
 * 提供表格数据的核心管理功能，包括：
 *
 * - 数据获取与状态管理
 * - 搜索参数管理
 * - 列配置管理
 *
 * @template A API 函数类型
 * @template T 表格数据类型
 * @template C 列配置类型
 * @param config 表格配置项
 * @returns 返回表格相关的状态和方法
 */
export default function useHookTable<A extends ApiFn, T, C>(config: TableConfig<A, T, C>) {
  // 加载状态管理
  const { loading, startLoading, endLoading } = useLoading();
  // 空数据状态管理
  const { bool: empty, setBool: setEmpty } = useBoolean();

  // 解构配置项，设置默认值
  const { apiFn, apiParams, transformer, immediate = true, getColumnChecks, getColumns } = config;

  // 搜索参数：使用 reactive 创建响应式对象，深拷贝初始参数避免引用问题
  const searchParams: NonNullable<Parameters<A>[0]> = reactive(jsonClone({ ...apiParams }));

  // 所有列配置（包括隐藏的列）
  const allColumns = ref(config.columns()) as Ref<C[]>;

  // 表格数据列表（每条数据都包含 index 字段）
  const data: Ref<TableDataWithIndex<T>[]> = ref([]);

  // 列显示/隐藏配置项
  const columnChecks: Ref<TableColumnCheck[]> = ref(getColumnChecks(config.columns()));

  // 计算属性：根据显示/隐藏配置过滤后的列配置
  const columns = computed(() => getColumns(allColumns.value, columnChecks.value));

  /** 重新加载列配置 当列配置发生变化时（如语言切换），重新生成列配置 同时保留用户之前的显示/隐藏选择 */
  function reloadColumns() {
    // 重新获取列配置
    allColumns.value = config.columns();

    // 创建当前显示/隐藏状态的映射表，用于保留用户选择
    const checkMap = new Map(columnChecks.value.map(col => [col.prop, col.checked]));

    // 根据新的列配置生成默认的显示/隐藏配置
    const defaultChecks = getColumnChecks(allColumns.value);

    // 合并：保留用户之前的选择，新列使用默认值
    columnChecks.value = defaultChecks.map(col => ({
      ...col,
      checked: checkMap.get(col.prop) ?? col.checked
    }));
  }

  /** 获取表格数据 执行完整的数据获取流程：格式化参数 -> 调用 API -> 转换数据 -> 更新状态 */
  async function getData() {
    // 开始加载
    startLoading();

    // 格式化搜索参数（过滤掉 null 和 undefined）
    const formattedParams = formatSearchParams(searchParams);

    // 调用 API 获取数据
    const response = await apiFn(formattedParams);

    // 转换数据格式（添加 index 字段等）
    const transformed = transformer(response as Awaited<ReturnType<A>>);

    // 更新表格数据
    data.value = transformed.data;

    // 更新空数据状态
    setEmpty(transformed.data.length === 0);

    // 执行数据获取完成后的回调（如更新分页信息）
    await config.onFetched?.(transformed);

    // 结束加载
    endLoading();
  }

  /**
   * 格式化搜索参数 过滤掉 null 和 undefined 值，避免发送无效参数到后端
   *
   * @param params 原始搜索参数
   * @returns 格式化后的搜索参数
   */
  function formatSearchParams(params: Record<string, unknown>) {
    const formattedParams: Record<string, unknown> = {};

    // 遍历参数，只保留有效值
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formattedParams[key] = value;
      }
    });

    return formattedParams;
  }

  /**
   * 更新搜索参数 部分更新搜索参数，用于搜索、筛选等场景
   *
   * @param params 要更新的参数（部分参数）
   */
  function updateSearchParams(params: Partial<Parameters<A>[0]>) {
    Object.assign(searchParams, params);
  }

  /** 重置搜索参数 将搜索参数重置为初始值 */
  function resetSearchParams() {
    Object.assign(searchParams, jsonClone(apiParams));
  }

  // 如果配置了立即获取数据，则在初始化时执行
  if (immediate) {
    getData();
  }

  return {
    /** 加载状态 */
    loading,
    /** 是否为空数据 */
    empty,
    /** 表格数据列表 */
    data,
    /** 过滤后的列配置（根据显示/隐藏配置） */
    columns,
    /** 列显示/隐藏配置项 */
    columnChecks,
    /** 重新加载列配置 */
    reloadColumns,
    /** 获取表格数据 */
    getData,
    /** 搜索参数（响应式对象） */
    searchParams,
    /** 更新搜索参数 */
    updateSearchParams,
    /** 重置搜索参数 */
    resetSearchParams
  };
}
