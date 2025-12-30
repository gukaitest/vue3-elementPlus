<script lang="ts" setup>
import { ElButton } from 'element-plus';

interface FileUploadStatus {
  allChunkList: FileChunk[]; // 文件分块列表
  cancel: null | (() => void); // 取消上传的函数，可能为 null
  errNumber: number; // 错误数量
  fileHash: string; // 文件哈希值
  fileName: string; // 文件名
  fileSize: number; // 文件大小（字节）
  finishNumber: number; // 已完成分块数量
  id: string; // 文件唯一标识
  percentage: number; // 上传百分比
  state: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0是什么都不做,1文件处理中,2是上传中,3是暂停,4是上传完成,5上传中断，6是上传失败
}

interface FileChunk {
  chunkFile: Blob; // 分块文件内容
  chunkHash: string; // 分块哈希值
  chunkNumber: number; // 分块编号（从1开始）
  chunkSize: number; // 分块大小（字节）
  fileHash: string; // 所属文件的哈希值
  fileName: string; // 所属文件名
  fileSize: number; // 所属文件总大小
  finish: boolean; // 分块是否上传完成
  index: number; // 分块在数组中的索引（从0开始）
}
const props = defineProps<{
  uploadFileList: FileUploadStatus[]; // 直接使用类型，无需运行时声明
}>();
const emit = defineEmits(['pauseUpload', 'resumeUpload', 'cancelSingle']);
// 暂停
const pauseUpload = (item: FileUploadStatus) => {
  console.log('pauseUpload item', item);
  emit('pauseUpload', item);
};
// 继续上传
const resumeUpload = (item: FileUploadStatus) => {
  emit('resumeUpload', item);
};
// 取消
const cancelSingle = (item: FileUploadStatus) => {
  // 如果已上传完成，不允许取消
  if (item.state === 4) {
    return;
  }
  emit('cancelSingle', item);
};

// 判断是否可以取消（上传完成后不可取消）
const canCancel = (item: FileUploadStatus) => {
  return item.state !== 4;
};

// 显示文件大小
const fileSize = (val: number) => {
  const m = 1024 * 1024;
  if (val > m) {
    const num = Math.ceil(val / m);
    const numB = Math.ceil(num / 1024);
    if (numB > 1) {
      return `${numB}G`;
    }
    return `${num}M`;
  }
  const numC = Math.ceil(val / 1024);
  return `${numC}KB`;
};

defineOptions({ name: 'ListItem' });
</script>

<template>
  <div v-for="item in props.uploadFileList" :key="item.id">
    <div class="list_item">
      <div class="left_box">
        <p class="left_box_fileName">
          {{ item.fileName }}
        </p>
        <!-- 单个文件进度条 -->
        <div class="left_box_percentage">
          <div class="percentage_bac">
            <div class="percentage_box" :style="{ width: `${item.percentage}%` }"></div>
            <div class="percentage_box_span">
              <span>{{ Math.floor(item.percentage) }}%</span>
            </div>
          </div>
          <div class="bottom_hint">
            <div>
              <p>{{ fileSize(item.fileSize) }}</p>
            </div>
            <div style="margin-left: 4px">
              <div v-if="item.state === 0" style="height: 24px; width: 100%"></div>
              <p v-else-if="item.state === 1">正在解析中...</p>
              <p v-else-if="item.state === 2">正在上传中...</p>
              <p v-else-if="item.state === 3">暂停中</p>
              <p v-else-if="item.state === 4">上传完成</p>
              <p v-else-if="item.state === 5">上传中断</p>
              <p v-else-if="item.state === 6">上传失败</p>
            </div>
          </div>
        </div>
      </div>
      <!-- 右侧按钮 -->
      <div class="rightBtn">
        <!-- 必须解析完才能暂停，不然是没有接口取消调用的 -->
        <ElButton v-if="[2].includes(item.state)" type="warning" size="small" plain @click="pauseUpload(item)">
          暂停
        </ElButton>
        <!-- 暂停中显示的继续按钮 -->
        <ElButton v-if="[3, 5].includes(item.state)" type="primary" size="small" plain @click="resumeUpload(item)">
          继续
        </ElButton>
        <!-- 取消按钮：上传完成后禁用 -->
        <ElButton
          type="danger"
          size="small"
          plain
          :disabled="!canCancel(item)"
          :class="{ 'cancel-btn-disabled': !canCancel(item) }"
          @click="cancelSingle(item)"
        >
          取消
        </ElButton>
      </div>
    </div>
  </div>
  <div style="height: 108px"></div>
</template>

<style scoped>
.list_item {
  margin: 0 10px 20px 10px;
  display: flex;
  transition: all 1s;
}
.percentage_bac {
  height: 20px;
  width: 100%;
  border-radius: 8px;
  background-color: #1b1f24;
  margin: 10px 0;
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5) inset;
  position: relative;
  overflow: hidden;
}
.percentage_box {
  height: 100%;
  transition: all 0.1s;
  background-color: #73c944;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.percentage_box_span {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  font-size: 14px;
  color: #e1eae2;
  height: 20px;
  line-height: 20px;
}
.left_box {
  flex: 1;
  margin: 10px 0;
  font-size: 14px;
}
.left_box_percentage {
  flex: 1;
  margin: 0 10px;
}
.left_box_fileName {
  margin: 0 10px;
  font-weight: bold;
  font-size: 18px;
}
.rightBtn {
  display: flex;
  font-size: 14px;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
  flex-basis: 200px;
  gap: 8px;
  padding-right: 8px;
}

.rightBtn :deep(.el-button) {
  min-width: 64px;
  font-size: 13px;
}

.cancel-btn-disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.cancel-btn-disabled:hover {
  opacity: 0.5;
}
.bottom_hint {
  opacity: 0.8;
  display: flex;
  align-items: center;
}
</style>
