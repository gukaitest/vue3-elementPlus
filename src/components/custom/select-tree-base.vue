<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { ElSelect, ElTreeV2 } from 'element-plus';
// import { Folder, FolderOpened } from '@element-plus/icons-vue';

// 定义树节点接口
export interface TreeNode {
  [key: string]: any;
  id?: string | number;
  label?: string;
  children?: TreeNode[];
}

// 定义组件属性接口
interface Props {
  // 树形数据
  data: TreeNode[];
  // 选中的值
  modelValue?: string | number;
  // 占位符
  placeholder?: string;
  // 树形配置
  treeProps?: {
    value?: string;
    label?: string;
    children?: string;
  };
  // 树高度（像素）
  treeHeight?: number;
  // 节点唯一标识字段
  nodeKey?: string;
  // 是否可清空
  clearable?: boolean;
  // 默认展开所有节点
  defaultExpandAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  modelValue: '',
  placeholder: '请选择',
  treeProps: () => ({
    value: 'id',
    label: 'label',
    children: 'children'
  }),
  treeHeight: 300,
  nodeKey: 'id',
  clearable: true,
  defaultExpandAll: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
  (e: 'change', key: string | number, data: TreeNode): void;
}>();

// 选中的值
const selectedValue = ref<string | number>(props.modelValue ?? '');
// 当前选中的节点key
const currentNodeKey = ref<string | number>(props.modelValue ?? '');
// 组件引用
const selectRef = ref<InstanceType<typeof ElSelect> | null>(null);
const treeRef = ref<InstanceType<typeof ElTreeV2> | null>(null);

// 监听值变化
watch(
  () => props.modelValue,
  newVal => {
    selectedValue.value = newVal ?? '';
    currentNodeKey.value = newVal ?? '';
  }
);
watch(
  () => props.data,
  newVal => {
    console.log('props.data:', newVal);
  },
  { deep: true, immediate: true }
);

// 处理节点点击
const handleNodeClick = (data: TreeNode) => {
  const key = data[props.nodeKey] as string | number;

  // 更新选中值
  selectedValue.value = key;
  currentNodeKey.value = key;

  // 触发事件
  emit('update:modelValue', key);
  emit('change', key, data);

  // 关闭下拉框
  nextTick(() => {
    selectRef.value?.blur();
  });
};
</script>

<template>
  <ElSelect
    ref="selectRef"
    v-model="selectedValue"
    :placeholder="placeholder"
    :clearable="clearable"
    :filterable="false"
    :popper-append-to-body="false"
    class="tree-select"
  >
    <template #default>
      <ElTreeV2
        ref="treeRef"
        :data="data"
        :props="treeProps"
        :height="treeHeight"
        :node-key="nodeKey"
        :default-expand-all="defaultExpandAll"
        :expand-on-click-node="false"
        :current-node-key="currentNodeKey"
        @node-click="handleNodeClick"
      ></ElTreeV2>
    </template>
  </ElSelect>
</template>

<style scoped>
.tree-select {
  width: 100%;
}

/* 覆盖下拉框样式 */
:deep(.el-select__popper) {
  padding: 0;
  overflow: hidden;
}

:deep(.el-tree-v2) {
  padding: 8px 0;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 100%;
}

.node-icon {
  margin-right: 6px;
  color: #f9a825;
}
</style>
