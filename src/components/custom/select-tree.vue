<script lang="ts" setup>
import type { PropType } from 'vue';
import { onMounted, reactive, ref, watch } from 'vue';
import type { TreeKey, TreeNodeData } from 'element-plus';
import { ElSelect, ElTreeV2 } from 'element-plus';
import { fetchGetProductList } from '@/service/api';
// 定义对象结构的类型
interface DataValueOption {
  label: string | number;
  value: string | number;
}
const propsTree = {
  value: 'value',
  label: 'label',
  children: 'children'
};
// 正确的CheckedInfo接口定义
interface CheckedInfo {
  checkedKeys: TreeKey[]; // 选中节点的键数组
  halfCheckedKeys: TreeKey[]; // 半选中节点的键数组
  checkedNodes: TreeNodeData[]; // 选中的节点数组
  halfCheckedNodes: TreeNodeData[]; // 半选中的节点数组
}
// 定义选项类型
interface Option {
  value: string | number;
  label: string;
}

// 定义树节点类型
interface TreeData extends TreeNodeData {
  value: string | number;
  label: string;
  children?: TreeData[];
  disabled?: boolean;
}

// 定义组件props
const props = defineProps({
  // 是否多选
  modelValue: {
    type: Array as PropType<DataValueOption[]>, // 关键修正
    default: () => [] // 数组默认值需用工厂函数
  },
  // 提示信息
  placeholder: {
    type: String,
    default: '请选择'
  },
  showRoot: {
    type: Boolean,
    default: false
  },
  // 是否排除供应商
  isExcludeSupplier: {
    type: Boolean,
    default: false
  }
});
// 重新定义 dataValue
const dataValue = ref<DataValueOption[]>([]);
const listData = ref<TreeData[]>([]);
const options = ref<Option[]>([]);
const selsectOptions = ref<Option[]>([]);
const defaultExpandedKeys = ref<string[]>([]); // 确保初始值为空数组

// 选择状态
const select = reactive({
  currentNodeKey: '',
  currentNodeLabel: ''
});

// 组件引用
const treeSelect = ref<InstanceType<typeof ElSelect> | null>(null);
const treeV2 = ref<InstanceType<typeof ElTreeV2> | null>(null);

// 监听model变化
watch(
  () => props.modelValue,
  (newValue: DataValueOption[]) => {
    // 多选模式
    dataValue.value = newValue || [];
    console.log(props.modelValue, 'props.modelValue');
  },
  { immediate: true }
);

// 组件挂载时初始化
onMounted(() => {
  console.log(props.modelValue, 'props.modelValue');
  // 多选模式
  dataValue.value = props.modelValue || [];
  console.log(props.modelValue, 'props.modelValue');
  // 服务端请求数据
  fetchGetProductList({ search: '', pageNo: 1, pageSize: 3000 }).then((res: any) => {
    console.log('XXXXXXXXXXXXXX res', res);
    if (res.data) {
      listData.value = res.data.products.map((item: any) => {
        return {
          value: item.product_id,
          label: item.product_name,
          level: 1,
          children: [
            {
              value: `${item.product_id}_001`,
              label: `${item.product_name}_001children`,
              level: 2
            }
          ]
        };
      });
      // console.log('XXXXXXXXXXXXX res.data.products', res.data.products);
      console.log('XXXXXXXXXXXXX listData.value', listData.value);
    }
  });
});

// 清空选择
const clearSelected = () => {
  dataValue.value = [];
  treeV2.value?.setCheckedKeys([]); // 清除所有选中节点
};

// 选择过滤
const selectFilter = (query: string) => {
  console.log('11111111111111 query', query);
  selsectOptions.value = [];
  treeV2.value?.filter(query);
  console.log('2222222222222', treeV2.value?.filter(query), treeV2.value);
};
const checkClick = (data: TreeNodeData, checkedInfo: CheckedInfo) => {
  console.log('11111XXXXXXXXXXXX data,info:', data, data.children, checkedInfo);
  // 假设checkedInfo.checkedNodes类型为TreeNodeData[]
  dataValue.value = checkedInfo.checkedNodes
    .filter((item: TreeNodeData) => item.level === 2)
    .map(
      (item: TreeNodeData): DataValueOption => ({
        label: item.label as string, // 类型断言
        value: item.value as string | number // 类型断言
      })
    );
  console.log('xxxxxxxxxxxxxxx  dataValue.value', dataValue.value);
};
// 节点点击处理
const nodeClick = (data: TreeNodeData) => {
  console.log('XXXXXXXXXXXX data,node:', data);
};
// 选择变化处理
const selectChange = (value: string | number | Array<string | number>) => {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const op = selsectOptions.value?.find((item: Option) => item.value === value[index]);
      if (op) {
        const n = options.value.findIndex((item: Option) => item.value === op.value);
        if (n >= 0) {
          options.value.push(op);
        }
      }
    }
  }
  (treeSelect.value as any)?.blur();
};

// 树过滤方法
const treeFilter = (query: string, node: TreeNodeData) => {
  if (query) {
    const match = node.label!.includes(query);
    console.log('3333333333', match);
    return match;
  }
  return true;
};
</script>

<template>
  <div class="select_tree_box">
    <ElSelect
      ref="treeSelect"
      v-model="dataValue"
      value-key="value"
      clearable
      filterable
      multiple
      collapse-tags
      collapse-tags-tooltip
      :placeholder="placeholder || '请选择'"
      :filter-method="selectFilter"
      @clear="clearSelected"
      @change="selectChange"
    >
      <ElOption :value="select.currentNodeKey" :label="select.currentNodeLabel">
        <ElTreeV2
          id="tree_v2"
          ref="treeV2"
          :data="listData"
          :props="propsTree"
          show-checkbox
          :filter-method="treeFilter"
          :default-expand-all="false"
          :default-expanded-keys="defaultExpandedKeys"
          @node-click="nodeClick"
          @check="checkClick"
        ></ElTreeV2>
      </ElOption>
    </ElSelect>
  </div>
</template>

<style lang="scss" scoped>
.select_tree_box {
  width: 100%;
}
:deep(.el-select__selection) {
  width: 214px;
}
:deep(.el-tag.is-closable) {
  max-width: 130px !important;
}
.el-select-dropdown.is-multiple .el-select-dropdown__item.is-selected:after {
  content: none;
}
.el-scrollbar .el-scrollbar__view .el-select-dropdown__item {
  height: auto;
  max-height: 274px;
  padding: 0;
  overflow: hidden;
}

.el-select-dropdown__item.selected {
  font-weight: normal;
}

ul li :deep(.el-tree .el-tree-node__content) {
  height: auto;
  padding: 0 20px;
}

.el-tree-node__label {
  font-weight: normal;
}

.el-tree :deep(.is-current .el-tree-node__label) {
  color: #409eff;
  font-weight: 700;
}

.el-tree :deep(.is-current .el-tree-node__children .el-tree-node__label) {
  color: #606266;
  font-weight: normal;
}
.selectInput {
  padding: 0 5px;
  box-sizing: border-box;
}
.el-select {
  width: 100% !important;
}
.i-custom-tree {
  font-weight: 100;
}
.i-custom-tree.active {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  font-weight: 100;
  color: var(--next-main-color);
  .el-icon {
    padding-top: 18px;
  }
}
</style>
