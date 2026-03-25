<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { Check } from '@element-plus/icons-vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { fetchGetProductList } from '@/service/api';

defineOptions({ name: 'VueVirtualScroller' });

export type VirtualSelectValue = string | number | null | undefined;
export type VirtualSelectMultiValue = (string | number)[];

interface Props {
  /** 选项列表（与 useProductListApi 二选一：为 true 时由接口填充） */
  options?: Record<string, unknown>[];
  /** 为 true 时挂载后一次性请求 /products 拉全量产品（映射为 label/value） */
  useProductListApi?: boolean;
  /** 一次性拉取条数上限（需后端允许） */
  fetchPageSize?: number;
  /** 展示字段 */
  labelKey?: string;
  /** 值字段 */
  valueKey?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  filterable?: boolean;
  /** 多选：v-model 为 value 数组，选后不自动收起面板 */
  multiple?: boolean;
  /** 多选收起后折叠展示（仅影响输入框文案，与 ElSelect collapse-tags 类似） */
  collapseTags?: boolean;
  /** 与 collapseTags 配合：完整展示前 N 个 label，其余显示为 +剩余数量 */
  maxCollapseTags?: number;
  /** 是否将下拉层挂到 body（避免被父级 overflow 裁剪） */
  teleported?: boolean;
  /** 虚拟列表单行高度（px） */
  itemHeight?: number;
  /** 列表区域最大高度（px） */
  listMaxHeight?: number;
  /** 下拉层宽度（px 或带单位字符串，仅 teleported 时覆盖与输入框同宽） */
  popoverWidth?: string | number;
  popperClass?: string;
  /** 自定义选项展示文案（默认取 labelKey） */
  formatLabel?: (row: Record<string, unknown>) => string;
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  useProductListApi: false,
  fetchPageSize: 10000,
  labelKey: 'label',
  valueKey: 'value',
  placeholder: '请选择',
  disabled: false,
  clearable: false,
  filterable: false,
  multiple: false,
  collapseTags: false,
  maxCollapseTags: 1,
  teleported: true,
  itemHeight: 40,
  listMaxHeight: 280,
  popoverWidth: 300,
  popperClass: '',
  formatLabel: undefined
});

const emit = defineEmits<{
  (e: 'change', v: VirtualSelectValue | VirtualSelectMultiValue): void;
}>();

const modelValue = defineModel<VirtualSelectValue | VirtualSelectMultiValue>('modelValue');

const wrapperRef = ref<HTMLElement | null>(null);
const dropdownPanelRef = ref<HTMLElement | null>(null);
const showDropdown = ref(false);
/** 输入框展示/过滤文案 */
const inputValue = ref('');

const productOptions = ref<Record<string, unknown>[]>([]);
const loading = ref(false);

const { bottom, left, width } = useElementBounding(wrapperRef, {
  windowScroll: true,
  windowResize: true
});

const dropdownFixedStyle = computed(() => {
  if (!props.teleported) return {};
  const w =
    props.popoverWidth === undefined
      ? `${width.value}px`
      : typeof props.popoverWidth === 'number'
        ? `${props.popoverWidth}px`
        : props.popoverWidth;
  return {
    position: 'fixed' as const,
    top: `${bottom.value + 4}px`,
    left: `${left.value}px`,
    width: w,
    zIndex: 2000
  };
});

const resolvedOptions = computed(() => {
  return props.useProductListApi ? productOptions.value : props.options;
});

async function loadProductList() {
  loading.value = true;
  try {
    const res = await fetchGetProductList({
      product_name: '',
      pageNo: 1,
      pageSize: props.fetchPageSize
    });
    const list = res?.data?.products ?? [];
    productOptions.value = list.map(p => ({
      value: p.product_id,
      label: p.product_name
    }));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.useProductListApi) {
    loadProductList().catch(() => {});
  }
});

function getLabel(row: Record<string, unknown>) {
  const v = row[props.labelKey];
  if (v === undefined || v === null) return '';
  return String(v);
}

function getValue(row: Record<string, unknown>) {
  return row[props.valueKey] as string | number;
}

function normalizeMulti(v: unknown): VirtualSelectMultiValue {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? (v as VirtualSelectMultiValue).slice() : [];
}

function labelsForMultiValues(values: VirtualSelectMultiValue): string[] {
  return values.map(v => {
    const row = resolvedOptions.value.find(o => getValue(o as Record<string, unknown>) === v);
    return row ? getLabel(row as Record<string, unknown>) : String(v);
  });
}

const selectedLabel = computed(() => {
  if (props.multiple) {
    const values = normalizeMulti(modelValue.value);
    if (values.length === 0) return '';
    const labels = labelsForMultiValues(values);
    if (!props.collapseTags || labels.length <= props.maxCollapseTags) {
      return labels.join(', ');
    }
    const head = labels.slice(0, props.maxCollapseTags).join(', ');
    const rest = labels.length - props.maxCollapseTags;
    return `${head} +${rest}`;
  }
  const v = modelValue.value as VirtualSelectValue;
  if (v === null || v === undefined || v === '') return '';
  const row = resolvedOptions.value.find(o => getValue(o as Record<string, unknown>) === v);
  return row ? getLabel(row as Record<string, unknown>) : '';
});

const filteredOptions = computed(() => {
  if (!props.filterable || !inputValue.value.trim()) return resolvedOptions.value;
  const q = inputValue.value.trim().toLowerCase();
  return resolvedOptions.value.filter(o => {
    const text = props.formatLabel
      ? props.formatLabel(o as Record<string, unknown>)
      : getLabel(o as Record<string, unknown>);
    return text.toLowerCase().includes(q);
  });
});

function syncInputClosed() {
  inputValue.value = selectedLabel.value;
}

watch(showDropdown, visible => {
  if (visible) {
    if (props.filterable) {
      inputValue.value = '';
    } else {
      inputValue.value = selectedLabel.value;
    }
  } else {
    syncInputClosed();
  }
});

watch(selectedLabel, () => {
  if (!showDropdown.value) {
    syncInputClosed();
  }
});

onClickOutside(
  wrapperRef,
  () => {
    if (!showDropdown.value) return;
    showDropdown.value = false;
  },
  { ignore: [dropdownPanelRef] }
);

function handleInput() {
  if (!props.filterable) return;
  if (!showDropdown.value) showDropdown.value = true;
}

function handleFocus() {
  if (props.disabled) return;
  showDropdown.value = true;
}

function handleBlur() {
  window.setTimeout(() => {
    const el = wrapperRef.value;
    const active = document.activeElement;
    if (el && active && el.contains(active)) return;
    showDropdown.value = false;
  }, 0);
}

function handleClear() {
  if (props.multiple) {
    modelValue.value = [];
    emit('change', []);
  } else {
    modelValue.value = null;
    emit('change', null);
  }
  inputValue.value = '';
}

function handleSelect(row: Record<string, unknown>) {
  const v = getValue(row);
  if (props.multiple) {
    const next = normalizeMulti(modelValue.value);
    const i = next.indexOf(v);
    if (i >= 0) next.splice(i, 1);
    else next.push(v);
    modelValue.value = next;
    emit('change', next);
  } else {
    modelValue.value = v;
    emit('change', v);
    showDropdown.value = false;
  }
}

function isSelected(row: Record<string, unknown>) {
  const v = getValue(row);
  if (props.multiple) return normalizeMulti(modelValue.value).includes(v);
  return v === (modelValue.value as VirtualSelectValue);
}

function displayLabel(row: Record<string, unknown>) {
  return props.formatLabel ? props.formatLabel(row) : getLabel(row);
}

function asRow(item: unknown) {
  return item as Record<string, unknown>;
}

function isSelectedItem(item: unknown) {
  return isSelected(asRow(item));
}

function onSelectItem(item: unknown) {
  handleSelect(asRow(item));
}

function rowLabel(item: unknown) {
  return displayLabel(asRow(item));
}
</script>

<template>
  <div ref="wrapperRef" class="virtual-select-wrapper">
    <ElInput
      v-model="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="!filterable"
      :clearable="clearable"
      class="virtual-select-input"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @clear="handleClear"
    />

    <Teleport to="body" :disabled="!teleported">
      <div
        v-show="showDropdown"
        ref="dropdownPanelRef"
        class="dropdown-panel"
        :class="[popperClass, { 'dropdown-panel--inline': !teleported }]"
        :style="teleported ? dropdownFixedStyle : undefined"
      >
        <div v-loading="loading" class="virtual-select-list-wrap" :style="{ height: `${listMaxHeight}px` }">
          <RecycleScroller
            v-if="filteredOptions.length > 0"
            class="virtual-scroller"
            :items="filteredOptions"
            :item-size="itemHeight"
            :key-field="valueKey"
          >
            <template #default="{ item }">
              <div
                class="option-item"
                :class="{ active: isSelectedItem(item), 'option-item--multiple': multiple }"
                @click="onSelectItem(item)"
                @mousedown.prevent
              >
                <span class="option-item__label">{{ rowLabel(item) }}</span>
                <ElIcon v-if="multiple" class="option-item__check" :class="{ 'is-on': isSelectedItem(item) }">
                  <Check />
                </ElIcon>
              </div>
            </template>
          </RecycleScroller>
          <ElEmpty v-else description="暂无数据" :image-size="64" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.virtual-select-wrapper {
  position: relative;
  width: 100%;
}

.virtual-select-input {
  width: 360px;
}

.dropdown-panel {
  box-sizing: border-box;
  padding: 8px;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
}

.dropdown-panel--inline {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 2000;
  min-width: 0;
}

.virtual-select-list-wrap {
  position: relative;
  overflow: hidden;
  border-radius: var(--el-border-radius-base);
}

.virtual-scroller {
  height: 100%;
  max-height: inherit;
}

.option-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  font-size: var(--el-font-size-base);
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 0.15s;

  &__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__check {
    flex-shrink: 0;
    margin-left: 8px;
    font-size: 16px;
    color: transparent;

    &.is-on {
      color: var(--el-color-primary);
    }
  }

  &--multiple {
    justify-content: space-between;
  }

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &.active {
    font-weight: 500;
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}
</style>
