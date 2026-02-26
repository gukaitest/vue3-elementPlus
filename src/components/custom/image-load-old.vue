<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import img001 from '../../assets/imgs/001.webp?url';
import img002 from '../../assets/imgs/002.webp?url';
import img003 from '../../assets/imgs/003.webp?url';
import img004 from '../../assets/imgs/004.webp?url';
import img005 from '../../assets/imgs/005.webp?url';
import img006 from '../../assets/imgs/006.webp?url';
import img007 from '../../assets/imgs/007.webp?url';
import img008 from '../../assets/imgs/008.webp?url';
import img009 from '../../assets/imgs/009.webp?url';

defineOptions({ name: 'ImageLoadOld' });

// 生产：用 import ?url 让 Vite 解析为插件输出的带 hash 的 URL，产物在 dist/assets/webp/001-[hash].webp
const globJpg = import.meta.glob<string>('../../assets/imgs/*.jpg', { eager: true, as: 'url' });
const allImagesProd = [img001, img002, img003, img004, img005, img006, img007, img008, img009];
const allImagesDev = Object.entries(globJpg)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);
const allImages = import.meta.env.PROD ? allImagesProd : allImagesDev;

const totalImages = allImages.length;

// 响应式数据
const loadedImages = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = 3;
const loading = ref(false);
const hasMore = ref(true);
const scrollContainer = ref<HTMLElement | null>(null);

// 加载图片（模拟异步）
const loadImages = async () => {
  if (loading.value || !hasMore.value) return;

  loading.value = true;
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  // console.log('allImages', allImages);
  loadedImages.value.push(...allImages.slice(start, end));
  // console.log('loadedImages', loadedImages.value);
  hasMore.value = end < allImages.length;
  currentPage.value += 1;
  loading.value = false;
};

// 滚动判断逻辑
const isNearBottom = (el: HTMLElement, threshold = 100) => {
  console.log(
    'isNearBottom:el.scrollTop, el.clientHeight, el.scrollHeight, threshold',
    el.scrollTop + el.clientHeight >= el.scrollHeight - threshold,
    el.scrollTop,
    el.clientHeight,
    el.scrollHeight,
    threshold
  );
  return el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
};

// 防抖处理
const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// 滚动处理
const handleScroll = debounce(() => {
  if (!scrollContainer.value) return;
  if (isNearBottom(scrollContainer.value)) {
    loadImages();
  }
}, 300);

// 初始化和清理
onMounted(async () => {
  await loadImages(); // 首次加载
});

onBeforeUnmount(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <div ref="scrollContainer" class="scroll-container" @scroll="handleScroll">
    <div v-for="(img, index) in loadedImages" :key="index" class="image-item">
      <img :src="img" alt="图片" />
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="!hasMore" class="no-more">没有更多了~</div>
  </div>
</template>

<style scoped>
/* .scroll-container {
  height: 100vh;
  overflow-y: auto;
  padding: 20px;
} */
.scroll-container {
  height: calc(100vh - 240px); /* 固定视口高度 */
  overflow-y: auto; /* 垂直滚动 */
  padding: 20px;

  /* 增强滚动体验 */
  scroll-behavior: smooth; /* 平滑滚动 */
  overscroll-behavior: contain; /* 防止滚动链 */
}
.image-item {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  display: block;
}

.loading,
.no-more {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}
</style>
