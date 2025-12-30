<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { ElAlert, ElButton, ElEmpty, ElMessage } from 'element-plus';
import { InfoFilled, Upload } from '@element-plus/icons-vue';
import { checkFile, mergeChunk, uploadFile } from '@/service/api';
import ListItem from '@/components/ListItem/index.vue';

// 文件大小限制常量 (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const MAX_FILE_SIZE_MB = 100; // 100MB for display

interface FileUploadStatus {
  allChunkList: FileChunk[]; // 文件分块列表
  whileRequests: FileChunk[]; // 正在上传的分块列表
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
  cancel?: () => void; // 取消上传的函数
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

// 定义 Worker 返回结果的类型
interface WorkerResult {
  fileHash: string;
  fileChunkList: FileChunk[]; // 根据实际情况调整类型
}

// 1kb = 1024b   1kb * 1024 = 1M
// 切片大小 1 * 1024 * 1024 刚好1M
const chunkSize = 1 * 1024 * 1024;
// 上传文件列表
// const uploadFileList = ref([]);
const uploadFileList = ref<FileUploadStatus[]>([]);

// 请求最大并发数
const maxRequest = ref(6);

const statistics = computed(() => {
  // 正在上传的文件个数 / 上传总数
  const otherArr = uploadFileList.value.filter(item => item.state !== 4);
  return `${otherArr.length}/${uploadFileList.value.length}`;
});

// 计算是否有上传中的文件
const hasUploadingFiles = computed(() => {
  return uploadFileList.value.some(item => [1, 2].includes(item.state));
});

// 计算是否可以全部取消（如果所有文件都已完成，则不可取消）
const canCancelAll = computed(() => {
  if (uploadFileList.value.length === 0) {
    return false;
  }
  // 如果所有文件都已完成（state === 4），则不可取消
  return uploadFileList.value.some(item => item.state !== 4);
});

// 计算顶部按钮区域样式
const topRightStyle = computed(() => ({
  justifyContent: uploadFileList.value.length > 1 ? 'space-between' : 'flex-end'
}));

// 生成文件 hash（web-worker）
const useWorker = (file: File): Promise<WorkerResult> => {
  return new Promise(resolve => {
    const worker = new Worker(
      new URL('@/worker/hash-worker.js', import.meta.url)
      // {
      //   type: 'module',
      // }
    );
    worker.postMessage({ file, chunkSize });
    worker.onmessage = e => {
      const { fileHash, fileChunkList } = e.data;
      if (fileHash) {
        resolve({
          fileHash,
          fileChunkList
        });
      }
    };
  });
};

// 暂停上传（是暂停剩下未上传的）
const pauseUpload = (taskArrItem: FileUploadStatus, elsePause = true) => {
  // elsePause为true就是主动暂停，为false就是请求中断
  // 4是成功 6是失败  如果不是成功或者失败状态，
  if (![4, 6].includes(taskArrItem.state)) {
    // 3是暂停，5是中断
    if (elsePause) {
      taskArrItem.state = 3;
    } else {
      taskArrItem.state = 5;
    }
  }
  taskArrItem.errNumber = 0;

  // 取消还在请求中的所有接口
  if (taskArrItem.whileRequests.length > 0) {
    console.log('取消还在请求中的所有接口', taskArrItem.whileRequests);
    for (const itemB of taskArrItem.whileRequests) {
      if (itemB.cancel) {
        itemB.cancel();
      }
    }
  }
  // // 所有剩下的请求都触发取消请求
  // for (const itemB of item.allChunkList) {
  //   //  如果cancel是函数则触发取消函数
  //   itemB.cancel ? itemB.cancel() : ''
  // }
};

// 取消单个
const cancelSingle = async (taskArrItem: FileUploadStatus) => {
  pauseUpload(taskArrItem);
  // 取消上传后列表删除该文件
  uploadFileList.value = uploadFileList.value.filter(itemB => itemB.fileHash !== taskArrItem.fileHash);
};

// 全部取消
const cancelAll = () => {
  // 如果所有文件都已完成，不允许取消
  if (!canCancelAll.value) {
    return;
  }

  for (const item of uploadFileList.value) {
    pauseUpload(item);
  }

  uploadFileList.value = [];
};

// 更新单个文件进度条
const signleFileProgress = (needObj: FileChunk, taskArrItem: FileUploadStatus) => {
  // 即使是超时请求也是会频繁的返回上传进度的,所以只能写成完成一片就添加它所占百分之多少,否则会造成误会
  taskArrItem.percentage = Number(((taskArrItem.finishNumber / needObj.chunkNumber) * 100).toFixed(2));
};

// 设置单个文件上传已完成
const finishTask = (item: FileUploadStatus) => {
  item.percentage = 100;
  // 4是上传完成
  item.state = 4;
};
// 调取合并接口处理所有切片
const handleMerge = async (taskArrItem: FileUploadStatus) => {
  const { fileName, fileHash } = taskArrItem;
  const res = await mergeChunk({
    chunkSize,
    fileName,
    fileHash
  }).catch(() => {});
  //  如果合并成功则标识该文件已经上传完成

  if (res && res.response.data.code === '0000') {
    // 设置文件上传状态
    finishTask(taskArrItem);
    console.log('文件合并成功！');
  } else {
    // 否则暂停上传该文件
    pauseUpload(taskArrItem, true);
    console.log('文件合并失败！');
  }
  // 最后赋值文件切片上传完成个数为0
  taskArrItem.finishNumber = 0;
};
// 单个文件上传
const uploadSignleFile = (taskArrItem: FileUploadStatus) => {
  console.log('单个文件上传');
  // 如果没有需要上传的切片 / 正在上传的切片还没传完，就不做处理
  if (taskArrItem.allChunkList.length === 0 || taskArrItem.whileRequests.length > 0) {
    return false;
  }
  // 找到文件处于处理中/上传中的 文件列表（是文件而不是切片）
  const isTaskArrIng = uploadFileList.value.filter(itemB => itemB.state === 1 || itemB.state === 2);

  // 实时动态获取并发请求数,每次调请求前都获取一次最大并发数
  // 浏览器同域名同一时间请求的最大并发数限制为6
  // 例如如果有3个文件同时上传/处理中，则每个文件切片接口最多调 6 / 3 == 2个相同的接口
  maxRequest.value = Math.ceil(6 / isTaskArrIng.length);

  // 从数组的末尾开始提取 maxRequest 个元素。
  const whileRequest = taskArrItem.allChunkList.slice(-maxRequest.value);

  // 设置正在请求中的个数
  taskArrItem.whileRequests.push(...whileRequest);
  //  如果总请求数大于并发数
  if (taskArrItem.allChunkList.length > maxRequest.value) {
    // 则减去并发数
    taskArrItem.allChunkList.splice(-maxRequest.value);
  } else {
    // 否则总请求数置空,说明已经把没请求的全部放进请求列表了，不需要做过多请求
    taskArrItem.allChunkList = [];
  }

  // 单个分片请求
  const uploadChunk = async (needObj: FileChunk) => {
    const fd = new FormData();
    const {
      fileHash,
      fileSize,
      fileName,
      index,
      chunkFile,
      chunkHash,
      chunkSize: fileChunkSize,
      chunkNumber
    } = needObj;

    fd.append('fileHash', fileHash);
    fd.append('fileSize', String(fileSize));
    fd.append('fileName', fileName);
    fd.append('index', String(index));
    fd.append('chunkFile', chunkFile);
    fd.append('chunkHash', chunkHash);
    fd.append('chunkSize', String(fileChunkSize));
    fd.append('chunkNumber', String(chunkNumber));
    console.log('单个分片请求', fd);
    try {
      const res = await uploadFile(fd, (onCancelFunc: () => void) => {
        needObj.cancel = onCancelFunc;
      });

      // 先判断是不是处于暂停还是取消状态
      if (taskArrItem.state === 3 || taskArrItem.state === 5) {
        return false; // 明确返回 false
      }

      // 请求异常或服务端返回报错
      if (!res || res.response.data.code !== '0000') {
        taskArrItem.errNumber += 1;
        if (taskArrItem.errNumber > 3) {
          console.log('切片上传失败超过三次了');
          pauseUpload(taskArrItem, false); // 上传中断
          return false; // 明确返回 false
        }
        console.log('切片上传失败还没超过3次');
        return uploadChunk(needObj); // 返回递归调用的 Promise
      } else if (res.response.data.code === '0000') {
        taskArrItem.errNumber = Math.max(taskArrItem.errNumber - 1, 0);
        taskArrItem.finishNumber += 1;
        needObj.finish = true;
        signleFileProgress(needObj, taskArrItem); // 更新进度条
        taskArrItem.whileRequests = taskArrItem.whileRequests.filter(item => item.chunkFile !== needObj.chunkFile);

        if (taskArrItem.finishNumber === chunkNumber) {
          handleMerge(taskArrItem);
        } else {
          uploadSignleFile(taskArrItem);
        }

        return true; // 成功分支显式返回 true（或其他合理值）
      }
    } catch (error) {
      // 处理请求异常（原代码中 .catch(() => {}) 可改为 try/catch）
      console.error('切片上传请求异常', error);
      return false; // 异常分支返回 false
    }

    // 新增：处理默认情况（非上述条件时返回 undefined，但为了满足 ESLint 规则，可显式返回）
    return undefined;
  };

  // 开始单个上传
  for (const item of whileRequest) {
    console.log('XXXXXXXXXXXXXXXX单个切片上传', item);
    uploadChunk(item);
  }
  return true;
};
// 继续上传
const resumeUpload = (taskArrItem: FileUploadStatus) => {
  // 2为上传中
  taskArrItem.state = 2;
  // 把刚才暂停的正在上传中所有切片放到待上传切片列表中
  taskArrItem.allChunkList.push(...taskArrItem.whileRequests);
  taskArrItem.whileRequests = [];
  uploadSignleFile(taskArrItem);
};
// 输入框change事件
const handleUploadFile = async (e: Event) => {
  // const fileEle = e.target;
  // 使用类型断言 + 空值检查
  const fileEle = e.target as HTMLInputElement;
  // 如果没有文件内容
  if (!fileEle || !fileEle.files || fileEle.files.length === 0) {
    return false;
  }
  const files = fileEle.files;

  // 检查文件大小
  const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    const fileNames = oversizedFiles.map(file => file.name).join(', ');
    ElMessage.error(`文件大小超过限制：${fileNames}。请上传小于${MAX_FILE_SIZE_MB}MB的文件。`);

    // 清空文件输入框
    fileEle.value = '';
    return false;
  }

  // 多文件
  Array.from(files).forEach(async (item, i) => {
    const file = item;

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      ElMessage.error(`文件 "${file.name}" 大小超过${MAX_FILE_SIZE_MB}MB限制，已跳过上传。`);
      return false;
    }

    // 单个上传文件
    // 这里要注意vue2跟vue3不同，
    // 如果在循环 + await中，如果把一个普通对象push进一个响应式数组
    // 直接修改原对象可能不会触发vue的DOM视图更新（但最终值会改变）
    // 所以这里用了reactive做响应式代理,当前要处理的某个文件inTaskArrItem
    const inTaskArrItem = reactive<FileUploadStatus>({
      id: `${new Date().getTime()}${i}`, // 使用时间戳 + 索引作为唯一ID// 因为forEach是同步，所以需要用指定id作为唯一标识
      state: 0, // 0是什么都不做,1文件处理中,2是上传中,3是暂停,4是上传完成,5上传中断，6是上传失败
      fileHash: '',
      fileName: file.name,
      fileSize: file.size,
      allChunkList: [], // 所有请求的数据
      whileRequests: [], // 正在请求中的请求个数,目前是要永远都保存请求个数为6
      finishNumber: 0, // 请求完成的个数
      errNumber: 0, // 报错的个数,默认是0个,超多3个就是直接上传中断
      percentage: 0, // 单个文件上传进度条
      cancel: null // 用于取消切片上传接口
    });
    // uploadFileList.value要上传的文件列表
    uploadFileList.value.push(inTaskArrItem);
    // 如果不使用reactive，就得使用以下两种方式
    // inTaskArrItem = uploadFileList.value[i]
    // uploadFileList.value[i].state = 2
    // 开始处理解析文件，vue3引用传递原理,此时uploadFileList.value里面的对应的inTaskArrItem数据会改变
    inTaskArrItem.state = 1;

    if (file.size === 0) {
      // 文件大小为0直接上传失败
      inTaskArrItem.state = 6;
      // 上传中断
      pauseUpload(inTaskArrItem, false);
    }
    console.log('文件开始解析');

    // 计算文件hash
    const { fileHash, fileChunkList } = await useWorker(file);

    console.log(fileHash, '文件hash计算完成');

    // 解析完成开始上传文件
    let baseName = '';
    // 查找'.'在fileName中最后出现的位置
    const lastIndex = file.name.lastIndexOf('.');
    // 如果'.'不存在，则返回整个文件名
    if (lastIndex === -1) {
      baseName = file.name;
    }
    // 否则，返回从fileName开始到'.'前一个字符的子串作为文件名（不包含'.'）
    baseName = file.name.slice(0, lastIndex);

    // 这里要注意！可能同一个文件，是复制出来的，出现文件名不同但是内容相同，导致获取到的hash值也是相同的
    // 所以文件hash要特殊处理
    inTaskArrItem.fileHash = `${fileHash}${baseName}`;
    inTaskArrItem.state = 2;
    console.log(uploadFileList.value, 'uploadFileList.value');
    // 上传之前要检查服务器是否存在该文件
    try {
      const res = await checkFile({
        fileHash: `${fileHash}${baseName}`,
        fileName: file.name
      });
      console.log('res============', res);
      if (res.response.data.code === '0000') {
        const { shouldUpload, uploadedList } = res.data;

        if (!shouldUpload) {
          finishTask(inTaskArrItem);
          console.log('文件已存在，实现秒传');
          return false;
        }

        inTaskArrItem.allChunkList = fileChunkList.map((chunk, index) => {
          return {
            // 总文件hash
            fileHash: `${fileHash}${baseName}`,
            // 总文件size
            fileSize: file.size,
            // 总文件name
            fileName: file.name,
            index,
            // 切片文件本身
            chunkFile: chunk.chunkFile,
            // 单个切片hash,以 - 连接
            chunkHash: `${fileHash}-${index}`,
            // 切片文件大小
            chunkSize,
            // 切片个数
            chunkNumber: fileChunkList.length,
            // 切片是否已经完成
            finish: false
          };
        });

        // 如果已存在部分文件切片，则要过滤调已经上传的切片
        if (uploadedList.length > 0) {
          // 过滤掉已经上传过的切片
          inTaskArrItem.allChunkList = inTaskArrItem.allChunkList.filter(
            chunk => !uploadedList.includes(chunk.chunkHash)
          );

          // 如果存在需要上传的，但是又为空，可能是因为还没合并，
          if (!inTaskArrItem.allChunkList.length) {
            // 所以需要调用合并接口
            await handleMerge(inTaskArrItem);
            return false;
          }
          // 同时要注意处理切片数量
          inTaskArrItem.allChunkList = inTaskArrItem.allChunkList.map(chunk => {
            return {
              ...chunk,
              chunkNumber: inTaskArrItem.allChunkList.length
            };
          });
        }
        console.log('文件开始切片');
        // 逐步对单个文件进行切片上传
        uploadSignleFile(inTaskArrItem);
      }
    } catch (err) {
      console.error('文件检查失败', err); // 记录错误日志
      inTaskArrItem.state = 6; // 标记上传失败
    }
    return true; // 函数末尾添加默认返回值
  });
  return true; // 函数末尾添加默认返回值
};
</script>

<template>
  <div class="page">
    <!-- 提示信息 -->
    <ElAlert :closable="false" type="info" :icon="InfoFilled" class="demo-notice">
      <template #default>
        <span class="notice-text">
          服务器内存限制，请上传小于
          <strong>{{ MAX_FILE_SIZE_MB }}MB</strong>
          的文件。超过限制的文件将被拒绝上传。
        </span>
      </template>
    </ElAlert>

    <!-- 顶部工具栏 -->
    <div class="page_top">
      <div class="page_top_left">
        <span class="upload-status">
          正在上传
          <span class="status-count">({{ statistics }})</span>
        </span>
      </div>
      <div class="page_top_right" :style="topRightStyle">
        <ElButton
          v-if="uploadFileList.length > 1"
          type="danger"
          size="small"
          plain
          :disabled="!canCancelAll"
          :class="{ 'cancel-all-btn-disabled': !canCancelAll }"
          @click="cancelAll"
        >
          全部取消
        </ElButton>
      </div>
    </div>

    <!-- 文件列表内容区 -->
    <div ref="contentRef" class="content">
      <ListItem
        v-if="uploadFileList.length > 0"
        :upload-file-list="uploadFileList"
        @pause-upload="pauseUpload"
        @resume-upload="resumeUpload"
        @cancel-single="cancelSingle"
      />
      <ElEmpty v-else description="暂无上传文件" :image-size="120" class="empty-state">
        <template #description>
          <p class="empty-text">点击下方按钮选择文件开始上传</p>
        </template>
      </ElEmpty>
    </div>

    <!-- 底部上传区域 -->
    <div class="bottom_box">
      <div class="upload-area">
        <div class="input_btn">
          <ElButton type="primary" :icon="hasUploadingFiles ? undefined : Upload">
            {{ hasUploadingFiles ? '继续添加文件' : '选择文件' }}
          </ElButton>
          <input
            type="file"
            multiple
            class="is_input"
            accept="*/*"
            aria-label="选择要上传的文件"
            @change="handleUploadFile"
          />
        </div>
        <div class="file-info">
          <span class="info-item">
            <i class="info-icon">📄</i>
            支持格式：任意文件
          </span>
          <span class="info-item">
            <i class="info-icon">📦</i>
            大小限制：{{ MAX_FILE_SIZE_MB }}MB
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  margin: 0 auto;
  background-color: #ffffff;
  width: 100%;
  height: 100vh;
  color: #000;
  position: relative;
}

/* 提示信息样式 */
.demo-notice {
  margin: 0;
  border-radius: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.notice-text {
  font-size: 14px;
  line-height: 1.5;
}

.notice-text strong {
  color: var(--el-color-primary);
  font-weight: 600;
}

/* 顶部工具栏 */
.page_top {
  height: 56px;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.page_top_left {
  flex: 1;
  display: flex;
  align-items: center;
}

.upload-status {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.status-count {
  color: var(--el-color-primary);
  font-weight: 600;
}

.page_top_right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
  justify-content: flex-end;
}

.cancel-all-btn-disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.cancel-all-btn-disabled:hover {
  opacity: 0.5;
}

@media (max-width: 768px) {
  .page_top {
    padding: 0 16px;
    flex-wrap: wrap;
    height: auto;
    min-height: 56px;
    gap: 8px;
  }

  .page_top_left {
    width: 100%;
  }
}
.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  overflow-y: auto;
  height: calc(100vh - 300px);
  min-height: 300px;
  background-color: #fff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
}

.empty-text {
  color: #909399;
  font-size: 14px;
  margin-top: 8px;
}
.bottom_box {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  padding: 20px 24px;
  background: linear-gradient(to top, #fff 0%, #fff 80%, rgba(255, 255, 255, 0.95) 100%);
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.upload-area {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.input_btn {
  position: relative;
  display: inline-block;
}

.input_btn > input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

.file-info {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #606266;
  flex-wrap: wrap;
  justify-content: center;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
}

.info-item:hover {
  background-color: #ecf5ff;
  color: var(--el-color-primary);
}

.info-icon {
  font-size: 14px;
  line-height: 1;
}

@media (max-width: 768px) {
  .bottom_box {
    padding: 16px;
  }

  .file-info {
    gap: 12px;
    font-size: 12px;
  }

  .info-item {
    padding: 4px 8px;
  }
}
:deep(.messageBac) {
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  transition: all 0.3s;
  transform: translateY(-34px);
  opacity: 0;
}
:deep(.messageShow) {
  transform: translateY(20px);
  opacity: 1;
}
:deep(.message) {
  background-color: #c7d1e5;
  color: #737a88;
  border-radius: 8px;
  padding: 4px 16px;
}
/* 滚动条优化 */
.content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.content::-webkit-scrollbar-track {
  background-color: #f5f5f5;
  border-radius: 4px;
}

.content::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.content::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}
@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
