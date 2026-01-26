/** * 用户管理页面 * * 功能包括： * - 用户列表展示 * - 用户搜索与筛选 * - 用户新增/编辑/删除 * - 批量删除 * -
列显示/隐藏配置 * * @file index.vue */

<script setup lang="tsx">
import { ElButton, ElPopconfirm, ElTag } from 'element-plus';
import { enableStatusRecord, userGenderRecord } from '@/constants/business';
import { fetchGetUserList } from '@/service/api';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserSearch from './modules/user-search.vue';

// 定义组件名称
defineOptions({ name: 'UserManage' });

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
  // API 函数：获取用户列表
  apiFn: fetchGetUserList,
  showTotal: true,
  // API 初始参数
  apiParams: {
    current: 1, // 当前页码
    size: 10, // 每页条数
    status: undefined, // 用户状态
    userName: undefined, // 用户名
    userGender: undefined, // 用户性别
    nickName: undefined, // 昵称
    userPhone: undefined, // 手机号
    userEmail: undefined // 邮箱
  },
  // 列配置工厂函数
  columns: () => [
    // 选择列：用于多选功能
    { type: 'selection', width: 48 },
    // 索引列：显示行号
    { prop: 'index', label: $t('common.index'), width: 64 },
    // 用户名列
    { prop: 'userName', label: $t('page.manage.user.userName'), minWidth: 100 },
    // 用户性别列：使用标签显示
    {
      prop: 'userGender',
      label: $t('page.manage.user.userGender'),
      width: 100,
      formatter: row => {
        // 如果性别未定义，返回空字符串
        if (row.userGender === undefined) {
          return '';
        }

        // 性别对应的标签颜色映射：1-男性(primary)，2-女性(danger)
        const tagMap: Record<Api.SystemManage.UserGender, UI.ThemeColor> = {
          1: 'primary',
          2: 'danger'
        };

        // 获取性别标签文本
        const label = $t(userGenderRecord[row.userGender]);

        // 返回标签组件
        return <ElTag type={tagMap[row.userGender]}>{label}</ElTag>;
      }
    },
    // 昵称列
    { prop: 'nickName', label: $t('page.manage.user.nickName'), minWidth: 100 },
    // 手机号列
    { prop: 'userPhone', label: $t('page.manage.user.userPhone'), width: 120 },
    // 邮箱列
    { prop: 'userEmail', label: $t('page.manage.user.userEmail'), minWidth: 200 },
    // 用户状态列：使用标签显示
    {
      prop: 'status',
      label: $t('page.manage.user.userStatus'),
      align: 'center',
      formatter: row => {
        // 如果状态未定义，返回空字符串
        if (row.status === undefined) {
          return '';
        }

        // 状态对应的标签颜色映射：1-启用(success)，2-禁用(warning)
        const tagMap: Record<Api.Common.EnableStatus, UI.ThemeColor> = {
          1: 'success',
          2: 'warning'
        };

        // 获取状态标签文本
        const label = $t(enableStatusRecord[row.status]);

        // 返回标签组件
        return <ElTag type={tagMap[row.status]}>{label}</ElTag>;
      }
    },
    // 操作列：包含编辑和删除按钮
    {
      prop: 'operate',
      label: $t('common.operate'),
      align: 'center',
      formatter: row => (
        <div class="flex-center">
          {/* 编辑按钮 */}
          <ElButton type="primary" plain size="small" onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </ElButton>
          {/* 删除按钮：带确认提示 */}
          <ElPopconfirm title={$t('common.confirmDelete')} onConfirm={() => handleDelete(row.id)}>
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
  handleEdit, // 处理编辑操作
  checkedRowKeys, // 选中的行 key 数组
  onBatchDeleted, // 批量删除完成后的回调
  onDeleted // 单个删除完成后的回调
  // closeDrawer // 关闭抽屉方法（未使用）
} = useTableOperate(data, getData);

/** 处理批量删除 删除选中的多个用户 */
async function handleBatchDelete() {
  // eslint-disable-next-line no-console
  console.log(checkedRowKeys.value);
  // 调用批量删除 API
  // await fetchBatchDeleteUser(checkedRowKeys.value);

  // 执行删除完成后的回调（显示提示、清空选中、刷新数据）
  onBatchDeleted();
}

/**
 * 处理单个删除 删除指定的用户
 *
 * @param id 用户 ID
 */
function handleDelete(id: number) {
  // eslint-disable-next-line no-console
  console.log(id);
  // 调用删除 API
  // await fetchDeleteUser(id);

  // 执行删除完成后的回调（显示提示、刷新数据）
  onDeleted();
}

/**
 * 处理编辑操作 打开编辑抽屉
 *
 * @param id 用户 ID
 */
function edit(id: number) {
  handleEdit(id);
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
          <p>{{ $t('page.manage.user.title') }}</p>
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
          row-key="id"
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

      <!-- 用户操作抽屉：新增/编辑用户 -->
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
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
