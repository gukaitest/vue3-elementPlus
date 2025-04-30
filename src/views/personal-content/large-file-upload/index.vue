<!-- <script setup lang="ts">
import { reactive, ref } from 'vue';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import SparkMD5 from 'spark-md5';

interface Chunk {
  index: number;
  hash: string;
  chunk: Blob;
  progress: number;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CONCURRENT = 3; // 最大并发数

const currentFile = ref<File | null>(null);
const isPaused = ref(false);
const uploadStatus = ref('');
const totalProgress = ref(0);
const controller = ref<AbortController | null>(null);
const chunks = reactive<Chunk[]>([]);

// 2.生成文件指纹（抽样哈希）
const generateFileHash = (file: File): Promise<string> => {
  return new Promise(resolve => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    const size = file.size;
    const sampleSize = 2 * 1024 * 1024; // 取样2MB

    // 取样规则：头部+中部+尾部
    const chunksTemp = [
      file.slice(0, sampleSize),
      file.slice(size / 2 - sampleSize / 2, size / 2 + sampleSize / 2),
      file.slice(size - sampleSize, size)
    ];

    reader.onload = e => {
      spark.append(e.target?.result as ArrayBuffer);
      resolve(spark.end());
    };
    reader.readAsArrayBuffer(new Blob(chunksTemp));
  });
};

// 3.创建分片
const createChunks = (file: File, fileHash: string): Chunk[] => {
  const chunksTemp: Chunk[] = [];
  let cur = 0;
  let index = 0;

  while (cur < file.size) {
    chunksTemp.push({
      index,
      hash: `${fileHash}-${index}`,
      chunk: file.slice(cur, cur + CHUNK_SIZE),
      progress: 0
    });
    cur += CHUNK_SIZE;
    index += 1;
  }
  return chunksTemp;
};

// 5.创建上传请求
const createRequest = (chunk: Chunk, fileHash: string) => {
  const formData = new FormData();
  formData.append('chunk', chunk.chunk);
  formData.append('hash', chunk.hash);
  formData.append('filename', fileHash);
  formData.append('index', chunk.index.toString());

  return {
    formData,
    index: chunk.index,
    config: {
      // onUploadProgress: (progressEvent: ProgressEvent) => {
      //   const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      //   chunks[chunk.index].progress = percent;
      //   updateTotalProgress();
      // },
      signal: controller.value?.signal
    } as AxiosRequestConfig
  };
};

// 6.上传分片（并发控制）
const uploadChunks = async (requests: any[]) => {
  const pool = new Set();
  let finished = 0;

  while (requests.length > 0) {
    if (isPaused.value) {
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (!isPaused.value) {
            clearInterval(interval);
            resolve(true);
          }
        }, 500);
      });
    }

    while (pool.size < MAX_CONCURRENT && requests.length > 0) {
      const { formData, index, config } = requests.shift();
      const promise = axios
        .post('/api/upload', formData, config)
        .then(() => {
          pool.delete(promise);
          finished += 1;
        })
        .catch(() => {
          requests.push({ formData, index, config });
        });

      pool.add(promise);
    }
    await Promise.race(pool);
  }
  await Promise.all(pool);
  console.log('finished', finished);
};
// 4.开始上传流程
const startUpload = async (file: File) => {
  try {
    // 1. 生成文件哈希
    const fileHash = await generateFileHash(file);

    // 2. 验证文件是否存在
    const { data } = await axios.post('/api/verify', {
      filename: file.name,
      hash: fileHash
    });

    if (data.exists) {
      ElMessage.success('秒传成功！');
      return;
    }

    // 3. 创建分片
    chunks.splice(0, chunks.length, ...createChunks(file, fileHash));

    // 4. 过滤已上传分片
    const requests = chunks
      .filter(chunk => !data.uploadedChunks.includes(chunk.hash))
      .map(chunk => createRequest(chunk, fileHash));

    // 5. 开始上传
    controller.value = new AbortController();
    await uploadChunks(requests);

    // 6. 合并请求
    await axios.post('/api/merge', {
      filename: file.name,
      hash: fileHash,
      size: CHUNK_SIZE
    });

    uploadStatus.value = 'success';
    ElMessage.success('上传成功！');
  } catch (err) {
    uploadStatus.value = 'exception';
    ElMessage.error('上传失败', err);
  }
};
// 1.文件预处理
const beforeUpload = (file: File) => {
  currentFile.value = file;
  startUpload(file);
  return false;
};
// 7.更新总进度
const updateTotalProgress = () => {
  const loaded = chunks.reduce((acc, chunk) => {
    return acc + (chunk.progress * chunk.chunk.size) / 100;
  }, 0);
  totalProgress.value = Math.round((loaded / currentFile.value!.size) * 100);
};

// 8.暂停/恢复控制
const togglePause = () => {
  isPaused.value = !isPaused.value;
  if (isPaused.value) {
    controller.value?.abort();
  } else {
    controller.value = new AbortController();
    startUpload(currentFile.value!);
  }
};

// 明确定义上传处理方法 ✅
const handleUpload = async (options: UploadRequestOptions) => {
  try {
    const file = options.file; // 通过 options.file 获取文件对象
    // ...后续的分片上传逻辑（保持原有逻辑）
    console.log('开始上传:', file.name);

    // 生成文件hash
    const fileHash = await createFileHash(file);

    // 验证文件是否存在
    const { data } = await axios.post('/api/verify', {
      filename: file.name,
      hash: fileHash
    });

    // ...其他原有逻辑
  } catch (err) {
    console.error('上传失败:', err);
  }
};
</script>

<template>
  <ElUpload action="#" :show-file-list="false" :http-request="handleUpload" :before-upload="beforeUpload">
    <ElButton type="primary">选择大文件</ElButton>
    <div v-if="currentFile" class="mt-4">
      <ElProgress :percentage="totalProgress" :status="uploadStatus" :stroke-width="16" />
      <div class="mt-2">
        <ElButton @click="togglePause">
          {{ isPaused ? '继续上传' : '暂停上传' }}
        </ElButton>
      </div>
    </div>
  </ElUpload>
</template> -->
