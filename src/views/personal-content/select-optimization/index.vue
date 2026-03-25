<script lang="ts" setup>
import { ref } from 'vue';
import type { TabsPaneContext } from 'element-plus';

const activeName = ref('first');

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};

/** 第二个 Tab：虚拟下拉，数据由 fetchGetProductList 一次性拉取 */
const virtualSelectValue = ref<number | null>(null);
const virtualSelectMulti = ref<number[]>([]);
/** 第三个 Tab：ElInput + DynamicScroller 不定高（接口产品多行展示） */
const virtualProductDynamic = ref<number | null>(null);
</script>

<template>
  <ElTabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
    <ElTabPane label="Element Plus Select 优化" name="first">
      <UseSelectOptimization v-if="activeName === 'first'" />
    </ElTabPane>

    <ElTabPane label="vue-virtual-scroller优化" name="second">
      <div v-if="activeName === 'second'" class="flex flex-col gap-16px">
        <!--
 <VueVirtualScroller
          v-model="virtualSelectValue"
          use-product-list-api
          filterable
          clearable
          placeholder="单选（虚拟列表）"
          class="w-280px"
        /> 
-->
        <VueVirtualScroller
          v-model="virtualSelectMulti"
          use-product-list-api
          multiple
          collapse-tags
          :max-collapse-tags="2"
          filterable
          clearable
          placeholder="多选 + 折叠展示"
          class="w-280px"
        />
      </div>
    </ElTabPane>

    <ElTabPane label="vue-virtual-scroller不定高" name="third">
      <div v-if="activeName === 'third'" class="flex flex-col gap-16px">
        <VirtualSelectProductDynamic v-model="virtualProductDynamic" class="w-320px" />
      </div>
    </ElTabPane>
  </ElTabs>
</template>

<style scoped>
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}
</style>
