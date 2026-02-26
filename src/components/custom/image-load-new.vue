<script setup lang="ts">
import { type ComponentPublicInstance, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

// 类型定义
type ImageStatus = boolean[];
type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let observer: IntersectionObserver | null = null;
// 使用静态路径让 Vite 在构建时解析每张图（动态 new URL 在生产会变成 undefined）
// 生产：每个 .webp 走 vitePluginImgsWebp 从 .jpg 转出；开发：glob 匹配实际存在的 .jpg
const globJpg = import.meta.glob<string>('../../assets/imgs/*.jpg', { eager: true, as: 'url' });
const allImagesProd = [
  new URL('../../assets/imgs/001.webp', import.meta.url).href,
  new URL('../../assets/imgs/002.webp', import.meta.url).href,
  new URL('../../assets/imgs/003.webp', import.meta.url).href,
  new URL('../../assets/imgs/004.webp', import.meta.url).href,
  new URL('../../assets/imgs/005.webp', import.meta.url).href,
  new URL('../../assets/imgs/006.webp', import.meta.url).href,
  new URL('../../assets/imgs/007.webp', import.meta.url).href,
  new URL('../../assets/imgs/008.webp', import.meta.url).href,
  new URL('../../assets/imgs/009.webp', import.meta.url).href
];
const allImagesDev = Object.entries(globJpg)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);
const allImages = import.meta.env.PROD ? allImagesProd : allImagesDev;

const totalImages = allImages.length;
const CONFIG = {
  totalImages,
  pageSize: 3,
  allImages,
  observerOptions: {
    root: null,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0.1
  }
} as const;

// 响应式数据
const loadedImages = ref<string[]>([]);
const currentPage = ref(1);
const loading = ref(false);
const hasMore = ref(true);
const loadedStatus = ref<ImageStatus>([]);

// 使用响应式引用
const itemRefs = ref<HTMLElement[]>([]);

// 引用收集函数
const setItemRef = (el: Element | ComponentPublicInstance | null) => {
  if (!el) return;

  // 处理组件实例的情况
  const domEl = (el as ComponentPublicInstance).$el ?? el;

  if (domEl instanceof HTMLElement) {
    // 去重处理
    if (!itemRefs.value.includes(domEl)) {
      itemRefs.value.push(domEl);
    }
  }
};

// Intersection Observer 逻辑
const handleIntersection: ObserverCallback = entries => {
  console.log('Intersection Observer triggered,entries:', entries);
  entries.forEach(entry => {
    // console.log('entry.isIntersecting,loading.value:', entry.isIntersecting, loading.value);
    if (entry.isIntersecting && !loading.value) {
      loadImages();
      observer?.unobserve(entry.target);
    }
  });
};

const setupObserver = () => {
  observer?.disconnect();

  nextTick(() => {
    // 确保 DOM 更新完成
    observer = new IntersectionObserver(handleIntersection, CONFIG.observerOptions);

    // 只观察最后一个有效元素
    const validElements = itemRefs.value.filter(el => el.isConnected && el.offsetParent !== null);

    const lastItem = validElements[validElements.length - 1];

    if (lastItem) {
      console.log('添加观察元素Observing element:', lastItem);
      observer.observe(lastItem);
    } else {
      console.warn('No valid elements to observe');
    }
  });
};

// 图片加载处理
const handleImageLoad = (index: number) => {
  loadedStatus.value[index] = true;
};

// 核心加载逻辑
const loadImages = async () => {
  if (loading.value || !hasMore.value) return;

  loading.value = true;

  // 模拟异步加载
  // await new Promise<void>(resolve => setTimeout(resolve, 500));

  const start = (currentPage.value - 1) * CONFIG.pageSize;
  const end = start + CONFIG.pageSize;

  // 更新加载数据
  loadedImages.value = [...loadedImages.value, ...CONFIG.allImages.slice(start, end)];

  // 严格类型初始化
  loadedStatus.value = [
    ...loadedStatus.value,
    ...Array.from<boolean>({ length: Math.min(CONFIG.pageSize, CONFIG.allImages.length - start) })
  ];

  // 更新状态
  hasMore.value = end < CONFIG.allImages.length;
  currentPage.value += 1;
  loading.value = false;

  nextTick(() => setupObserver());
};

// 生命周期
onMounted(async () => {
  await loadImages();
  // setupObserver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <div class="scroll-container">
    <div v-for="(img, index) in loadedImages" :key="index" :ref="el => setItemRef(el)" class="image-item">
      <img :src="img" alt="Gallery Image" :class="{ loaded: loadedStatus[index] }" @load="handleImageLoad(index)" />
      <div v-if="!loadedStatus[index]" class="loading-indicator">
        <div class="loader"></div>
      </div>
    </div>
    <div v-if="loading" class="loading-more">加载中...</div>
    <div v-if="!hasMore" class="no-more">已加载全部内容</div>
  </div>
</template>

<style scoped>
.scroll-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.image-item {
  width: 100%;
  height: 300px;
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

img.loaded {
  opacity: 1;
  transform: scale(1.02);
}

.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
}

.loader {
  width: 24px;
  height: 24px;
  border: 3px solid #ddd;
  border-top-color: #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-more,
.no-more {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 10px;
}
</style>
