<script lang="ts" setup>
/**
 * 演示用：ElInput + Teleport 下拉 + vue-virtual-scroller DynamicScroller（不定高） 数据与 VueVirtualScroller 一致，来自
 * fetchGetProductList；列表项为多行展示以体现测量行高。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { fetchGetProductList } from '@/service/api';

defineOptions({ name: 'VirtualSelectProductDynamic' });

interface OptionRow {
  value: number;
  /** 选中后输入框展示（单行） */
  shortLabel: string;
  /** 下拉内多行展示 */
  displayLines: string;
}

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    disabled?: boolean;
    clearable?: boolean;
    filterable?: boolean;
    teleported?: boolean;
    listMaxHeight?: number;
    minItemSize?: number;
    fetchPageSize?: number;
    popoverWidth?: string | number;
  }>(),
  {
    placeholder: '请选择产品（不定高虚拟列表）',
    disabled: false,
    clearable: true,
    filterable: true,
    teleported: true,
    listMaxHeight: 280,
    minItemSize: 52,
    fetchPageSize: 5000,
    popoverWidth: 320
  }
);

const emit = defineEmits<{
  (e: 'change', v: number | null): void;
}>();

const modelValue = defineModel<number | null>('modelValue');

const wrapperRef = ref<HTMLElement | null>(null);
const dropdownPanelRef = ref<HTMLElement | null>(null);
const showDropdown = ref(false);
const inputValue = ref('');
const options = ref<OptionRow[]>([]);
const loading = ref(false);

const { bottom, left, width } = useElementBounding(wrapperRef, {
  windowScroll: true,
  windowResize: true
});

const dropdownFixedStyle = computed(() => {
  if (!props.teleported) return {};
  const w = typeof props.popoverWidth === 'number' ? `${props.popoverWidth}px` : props.popoverWidth;
  return {
    position: 'fixed' as const,
    top: `${bottom.value + 4}px`,
    left: `${left.value}px`,
    width: w,
    zIndex: 2000
  };
});

function buildDisplayLines(p: Api.productsList.Product): string {
  const desc = (p.description || '').trim();
  const descLine = desc.length > 48 ? `${desc.slice(0, 48)}…` : desc;
  const tail = descLine ? `\n${descLine}` : '';
  return `${p.product_name}\n#${p.product_id} · ${p.category} · 库存 ${p.stock} · ¥${p.price}${tail}`;
}

async function loadProducts() {
  loading.value = true;
  try {
    const res = await fetchGetProductList({
      product_name: '',
      pageNo: 1,
      pageSize: props.fetchPageSize
    });
    const list = res?.data?.products ?? [];
    options.value = list.map(p => ({
      value: p.product_id,
      shortLabel: p.product_name,
      displayLines: buildDisplayLines(p)
    }));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadProducts().catch(() => {});
});

const selectedShortLabel = computed(() => {
  const v = modelValue.value;
  if (v === null || v === undefined) return '';
  const row = options.value.find(o => o.value === v);
  return row?.shortLabel ?? '';
});

const filteredOptions = computed(() => {
  if (!props.filterable || !inputValue.value.trim()) return options.value;
  const q = inputValue.value.trim().toLowerCase();
  return options.value.filter(o => o.shortLabel.toLowerCase().includes(q) || o.displayLines.toLowerCase().includes(q));
});

function syncInputClosed() {
  inputValue.value = selectedShortLabel.value;
}

watch(showDropdown, visible => {
  if (visible) {
    inputValue.value = props.filterable ? '' : selectedShortLabel.value;
  } else {
    syncInputClosed();
  }
});

watch(selectedShortLabel, () => {
  if (!showDropdown.value) syncInputClosed();
});

onClickOutside(
  wrapperRef,
  () => {
    if (showDropdown.value) showDropdown.value = false;
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
  modelValue.value = null;
  emit('change', null);
  inputValue.value = '';
}

function handleSelect(row: OptionRow) {
  modelValue.value = row.value;
  emit('change', row.value);
  showDropdown.value = false;
}

function isSelected(row: OptionRow) {
  return row.value === modelValue.value;
}

function sizeDeps(row: OptionRow) {
  return [row.displayLines, isSelected(row)];
}

function asRow(item: unknown): OptionRow {
  return item as OptionRow;
}

function onPick(item: unknown) {
  handleSelect(asRow(item));
}

function isSelectedItem(item: unknown) {
  return isSelected(asRow(item));
}

function sizeDepsItem(item: unknown) {
  return sizeDeps(asRow(item));
}
</script>

<template>
  <div ref="wrapperRef" class="vspd-wrapper">
    <ElInput
      v-model="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="!filterable"
      :clearable="clearable"
      class="vspd-input"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @clear="handleClear"
    />

    <Teleport to="body" :disabled="!teleported">
      <div
        v-show="showDropdown"
        ref="dropdownPanelRef"
        class="vspd-panel"
        :class="{ 'vspd-panel--inline': !teleported }"
        :style="teleported ? dropdownFixedStyle : undefined"
      >
        <div v-loading="loading" class="vspd-list" :style="{ height: `${listMaxHeight}px` }">
          <DynamicScroller
            v-if="filteredOptions.length > 0"
            class="vspd-scroller"
            :items="filteredOptions"
            :min-item-size="minItemSize"
            key-field="value"
          >
            <template #default="{ item, active }">
              <DynamicScrollerItem :item="item" :active="active" :size-dependencies="sizeDepsItem(item)">
                <div
                  class="vspd-option"
                  :class="{ 'is-active': isSelectedItem(item) }"
                  @click="onPick(item)"
                  @mousedown.prevent
                >
                  <span class="vspd-option__text">{{ asRow(item).displayLines }}</span>
                </div>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          <ElEmpty v-else description="暂无数据" :image-size="64" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.vspd-wrapper {
  position: relative;
  width: 100%;
}

.vspd-input {
  width: 360px;
}

.vspd-panel {
  box-sizing: border-box;
  padding: 8px;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
}

.vspd-panel--inline {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 2000;
  min-width: 0;
}

.vspd-list {
  position: relative;
  overflow: hidden;
  border-radius: var(--el-border-radius-base);
}

.vspd-scroller {
  height: 100%;
}

.vspd-option {
  box-sizing: border-box;
  padding: 8px 12px;
  font-size: var(--el-font-size-base);
  line-height: 1.45;
  cursor: pointer;
  transition: background-color 0.15s;

  &__text {
    display: block;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &.is-active {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}
</style>
