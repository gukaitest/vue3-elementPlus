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
    <ElTabPane label="elementPlus Virtualized Table实现方式" name="first">
      <TableOptimization v-if="activeName === 'first'"></TableOptimization>
    </ElTabPane>

    <ElTabPane label="VXE-Table实现方式" name="second">
      <!-- <VxeTableOptimization v-if="activeName === 'second'"></VxeTableOptimization> -->
      <VxeTableDemo v-if="activeName === 'second'"></VxeTableDemo>
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
