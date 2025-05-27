<script lang="ts" setup>
import { ref } from 'vue';
import type { TabsPaneContext } from 'element-plus';

const activeName = ref('first');

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};
</script>

<template>
  <ElTabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
    <ElTabPane label="传统实现方式" name="first"><ImageLoadOld v-if="activeName === 'first'"></ImageLoadOld></ElTabPane>
    <ElTabPane label="IntersectionObserver实现方式" name="second">
      <ImageLoadNew v-if="activeName === 'second'"></ImageLoadNew>
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
