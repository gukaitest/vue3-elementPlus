<script lang="ts" setup>
import { ref } from 'vue';
import type { TabsPaneContext } from 'element-plus';

const activeName = ref('first');
const selectValue = ref([]);
// const selectValue = ref([{ label: '产品Product-1_001children', value: '1_001' }]);
const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};
</script>

<template>
  <ElTabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
    <ElTabPane label="虚拟SelectTree优化" name="first">
      <SelectTree v-if="activeName === 'first'" v-model:select-value="selectValue"></SelectTree>
      <!-- <div>当前选中的值：{{ selectValue }}</div> -->
    </ElTabPane>

    <!--
 <ElTabPane label="VXE-Table实现方式" name="second">
      <VxeTableDemo v-if="activeName === 'second'"></VxeTableDemo>
    </ElTabPane>
-->
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
