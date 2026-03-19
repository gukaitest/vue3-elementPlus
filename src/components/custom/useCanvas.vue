<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

defineOptions({ name: 'UseCanvas' });

type Mode = 'dirty' | 'layer' | 'callCost' | 'worker';

const activeMode = ref<Mode>('dirty');
const fps = ref(0);

type CallCostStats = {
  dotCount: number;
  naiveBeginCalls: number;
  naiveFillCalls: number;
  naiveStrokeCalls: number;
  optimizedBeginCalls: number;
  optimizedFillCalls: number;
  optimizedStrokeCalls: number;
};

const callCostStats = ref<CallCostStats>({
  dotCount: 0,
  naiveBeginCalls: 0,
  naiveFillCalls: 0,
  naiveStrokeCalls: 0,
  optimizedBeginCalls: 0,
  optimizedFillCalls: 0,
  optimizedStrokeCalls: 0
});

const containerRef = ref<HTMLDivElement | null>(null);
const bgCanvasRef = ref<HTMLCanvasElement | null>(null);
const fgCanvasRef = ref<HTMLCanvasElement | null>(null);
const trailCanvasRef = ref<HTMLCanvasElement | null>(null);

let bgCtx: CanvasRenderingContext2D | null = null;
let fgCtx: CanvasRenderingContext2D | null = null;
let trailCtx: CanvasRenderingContext2D | null = null;

let rafId: number | null = null;
let lastTimestamp = 0;
let frameIndex = 0;
let runToken = 0;

let dpr = 1;
let cssW = 600;
let cssH = 360;

// 离屏 Canvas 缓存（背景 + 小球精灵）
type CanvasLike = HTMLCanvasElement | OffscreenCanvas;
let bgCache: CanvasLike | null = null;

// 统一的小球参数（所有 tab 共享视觉）
const ballR = 18;
const spritePadding = 8;
const spriteHalfCss = ballR + spritePadding; // 精灵中心到边缘（CSS 坐标）
const spriteSizeCss = spriteHalfCss * 2;

const TAU = Math.PI * 2;

let angle = 0;
let prevX = 0;
let prevY = 0;
const speedRadPerMs = 0.03 / 16; // 让视觉速度大致等价于旧 demo（0.03/帧）

const fgBallFill = '#409EFF';
const fgBallStroke = 'rgba(64, 158, 255, 0.45)';

let orbitRadius = 100;
let centerX = 0;
let centerY = 0;

// Tab: 合并调用成本/缓存绘制用的精灵（主线程生成）
let ballSpriteBitmap: ImageBitmap | null = null;

let worker: Worker | null = null;
let workerSpriteReady = false;

const modeLabel = computed(() => {
  const map: Record<Mode, string> = {
    dirty: '减少重绘范围',
    layer: '分层渲染',
    callCost: '降低调用成本',
    worker: 'Worker + OffscreenCanvas'
  };
  return map[activeMode.value];
});

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined';
const supportsWorker = typeof Worker !== 'undefined';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function getCanvasCssSize() {
  const el = containerRef.value;
  if (!el) return { w: 600, h: 360 };
  // 组件的高度来自 CSS，这里以实际像素取值
  const w = Math.max(320, Math.floor(el.clientWidth || 600));
  const h = Math.max(240, Math.floor(el.clientHeight || 360));
  return { w, h };
}

function setCanvasSize(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const { w, h } = getCanvasCssSize();
  cssW = w;
  cssH = h;
  dpr = window.devicePixelRatio || 1;
  // dpr 改变时，后续模式会重建渲染流程；这里清理旧精灵避免短暂绘制错位
  ballSpriteBitmap = null;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  // 重置 transform，避免 resize/重启时 scale 累积
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderBackgroundToCache() {
  if (!bgCtx) return;
  if (!bgCanvasRef.value) return;

  const cacheWpx = Math.floor(cssW * dpr);
  const cacheHpx = Math.floor(cssH * dpr);

  const cache: CanvasLike = supportsOffscreen
    ? new OffscreenCanvas(cacheWpx, cacheHpx)
    : (() => {
        const c = document.createElement('canvas');
        c.width = cacheWpx;
        c.height = cacheHpx;
        return c;
      })();

  // OffscreenCanvas / HTMLCanvasElement 的 getContext 在 TS 里容易被推成 union（甚至夹带 ImageBitmapRenderingContext）
  // 这里做类型断言，确保后续使用 2D API 不被误报。
  const ctx = (cache as any).getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return;
  // 让离屏 ctx 也使用 CSS 坐标
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, cssW, cssH);
  gradient.addColorStop(0, '#f5f7ff');
  gradient.addColorStop(1, '#e9f0ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cssW, cssH);

  // 网格：合并路径 + 一次 stroke（降低绘制调用成本）
  ctx.strokeStyle = '#d0d7ff';
  ctx.lineWidth = 0.5;

  const step = 20;
  ctx.beginPath();
  for (let x = 0; x <= cssW; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cssH);
  }
  for (let y = 0; y <= cssH; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(cssW, y);
  }
  ctx.stroke();

  // 标题文本
  ctx.fillStyle = '#333';
  ctx.font = '16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Canvas 性能优化示例', 20, 30);

  ctx.fillStyle = '#666';
  ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('五种模式对比：切 Tab 查看差异', 20, 52);

  bgCache = cache;

  // 将缓存绘制到背景层：指定源/目标尺寸避免双倍缩放造成模糊
  bgCtx.clearRect(0, 0, cssW, cssH);
  bgCtx.drawImage(bgCache as any, 0, 0, cacheWpx, cacheHpx, 0, 0, cssW, cssH);
}

function resetLayersForMode() {
  if (bgCtx) bgCtx.globalCompositeOperation = 'source-over';
  if (fgCtx) fgCtx.clearRect(0, 0, cssW, cssH);
  if (trailCtx) trailCtx.clearRect(0, 0, cssW, cssH);
  frameIndex = 0;
  lastTimestamp = 0;
  fps.value = 0;
}

function computeDirtyRect(x0: number, y0: number, x1: number, y1: number, padding: number) {
  const maxW = cssW;
  const maxH = cssH;
  const minX = Math.min(x0, x1) - padding;
  const minY = Math.min(y0, y1) - padding;
  const maxX = Math.max(x0, x1) + padding;
  const maxY = Math.max(y0, y1) + padding;
  const x = clamp(minX, 0, maxW);
  const y = clamp(minY, 0, maxH);
  const clampedMaxX = clamp(maxX, 0, maxW);
  const clampedMaxY = clamp(maxY, 0, maxH);
  const width = Math.max(0, clampedMaxX - x);
  const height = Math.max(0, clampedMaxY - y);
  return { x, y, width, height };
}

function ensureForegroundStyles() {
  if (!fgCtx) return;
  // 进入某个模式前，尽量重置 ctx 到“可预期”的状态。
  // 否则例如 callCost 模式修改过 globalCompositeOperation/shadow 等，会导致后续模式的可见性异常。
  fgCtx.globalCompositeOperation = 'source-over';
  fgCtx.shadowBlur = 0;
  fgCtx.shadowColor = 'transparent';
  fgCtx.fillStyle = fgBallFill;
  fgCtx.strokeStyle = fgBallStroke;
  fgCtx.lineWidth = 3;
  fgCtx.lineCap = 'round';
}

function stopMode() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  angle = 0;
  prevX = 0;
  prevY = 0;
  if (worker) {
    worker.terminate();
    worker = null;
  }
  workerSpriteReady = false;
}

function startDirtyMode() {
  stopMode();
  resetLayersForMode();
  ensureForegroundStyles();

  // 用于脏矩形：计算一次轨道几何参数
  centerX = cssW / 2;
  centerY = cssH / 2;
  orbitRadius = Math.min(cssW, cssH) * 0.28;

  // 初始化角度与上一次坐标
  angle = 0;
  prevX = centerX + orbitRadius * Math.cos(angle);
  prevY = centerY + orbitRadius * Math.sin(angle);

  const draw = (timestamp: number) => {
    if (!fgCtx) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.max(0.1, timestamp - lastTimestamp);
    lastTimestamp = timestamp;

    const nextAngle = angle + speedRadPerMs * dt;
    const x = centerX + orbitRadius * Math.cos(nextAngle);
    const y = centerY + orbitRadius * Math.sin(nextAngle);

    // 1) 只清理脏矩形（减少重绘范围）
    const dirty = computeDirtyRect(prevX, prevY, x, y, ballR + 6);
    const canClip = dirty.width > 0 && dirty.height > 0;
    if (canClip) {
      fgCtx.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);
    }

    // 2) 绘制小球（避免整屏重绘）
    //    为了演示“剪裁”，只在脏矩形内允许绘制（避免抗锯齿笔触溢出）
    if (canClip) {
      fgCtx.save();
      fgCtx.beginPath();
      fgCtx.rect(dirty.x, dirty.y, dirty.width, dirty.height);
      fgCtx.clip();

      fgCtx.beginPath();
      fgCtx.arc(x, y, ballR, 0, TAU);
      fgCtx.fill();
      fgCtx.stroke();

      fgCtx.restore();
    } else {
      fgCtx.beginPath();
      fgCtx.arc(x, y, ballR, 0, TAU);
      fgCtx.fill();
      fgCtx.stroke();
    }

    prevX = x;
    prevY = y;
    angle = nextAngle;

    frameIndex++;
    if (frameIndex % 2 === 0) {
      fps.value = Math.round(1000 / dt);
    }

    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);
}

function startLayerMode() {
  stopMode();
  resetLayersForMode();
  ensureForegroundStyles();

  centerX = cssW / 2;
  centerY = cssH / 2;
  orbitRadius = Math.min(cssW, cssH) * 0.28;
  angle = 0;
  prevX = centerX + orbitRadius;
  prevY = centerY;

  // 分层渲染：trailing layer 不清理（只增量绘制），foreground layer 做局部擦除
  if (trailCtx) {
    trailCtx.strokeStyle = 'rgba(64, 158, 255, 0.16)';
    trailCtx.lineWidth = 2;
    trailCtx.lineCap = 'round';
  }

  const draw = (timestamp: number) => {
    if (!fgCtx) return;
    if (!trailCtx) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.max(0.1, timestamp - lastTimestamp);
    lastTimestamp = timestamp;

    const nextAngle = angle + speedRadPerMs * dt;
    const x = centerX + orbitRadius * Math.cos(nextAngle);
    const y = centerY + orbitRadius * Math.sin(nextAngle);

    // foreground：只擦脏矩形
    const dirty = computeDirtyRect(prevX, prevY, x, y, ballR + 6);
    fgCtx.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);

    // foreground：绘制当前球
    fgCtx.beginPath();
    fgCtx.arc(x, y, ballR, 0, TAU);
    fgCtx.fill();
    fgCtx.stroke();

    // trail：用增量线段叠加，不进行整层重绘
    trailCtx.beginPath();
    trailCtx.moveTo(prevX, prevY);
    trailCtx.lineTo(x, y);
    trailCtx.stroke();

    // 控制轨迹长度：每隔一定帧清空一次（避免无限叠加造成内存/渲染压力）
    frameIndex++;
    if (frameIndex % 240 === 0) {
      trailCtx.clearRect(0, 0, cssW, cssH);
    }

    prevX = x;
    prevY = y;
    angle = nextAngle;

    if (frameIndex % 2 === 0) fps.value = Math.round(1000 / dt);
    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);
}

function startCallCostMode() {
  stopMode();
  resetLayersForMode();
  ensureForegroundStyles();
  if (!fgCtx) return;

  frameIndex = 0;
  lastTimestamp = 0;

  const cy = cssH / 2;
  centerX = cssW / 2; // reuse outer centerX (avoid no-shadow)

  // 为了凸显“调用成本低但负载高”，这里点数量适当上调
  const dotCount = Math.max(420, Math.floor((cssW * cssH) / 900)); // clamp-like：不同尺寸自动扩展
  const dotR = clamp(cssW / 240, 1.4, 3.4);

  // 批量绘制使用同一套样式（避免循环内修改 fill/stroke 等状态）
  const groupOrbitR = Math.min(cssW, cssH) * 0.28;
  const jitterR = Math.min(cssW, cssH) * 0.12;

  // 预计算点的相对参数，避免每帧分配/随机
  const baseAngles = new Float32Array(dotCount);
  const baseMul = new Float32Array(dotCount);
  for (let i = 0; i < dotCount; i++) {
    baseAngles[i] = (i / dotCount) * TAU;
    baseMul[i] = 0.55 + 0.45 * Math.sin(i * 0.37);
  }

  // 固定每帧的“优化后调用次数”（用于展示其特点）
  callCostStats.value = {
    dotCount,
    naiveBeginCalls: 0,
    naiveFillCalls: 0,
    naiveStrokeCalls: 0,
    optimizedBeginCalls: 1,
    optimizedFillCalls: 1,
    optimizedStrokeCalls: 1
  };

  // 一次性创建批量渲染样式：使用径向渐变 + 光晕，突出“合并绘制”的效果观感
  const grad = fgCtx.createRadialGradient(centerX, cy, 0, centerX, cy, Math.max(cssW, cssH) * 0.65);
  grad.addColorStop(0, 'rgba(123, 200, 255, 0.95)');
  grad.addColorStop(1, 'rgba(64, 158, 255, 0.15)');

  fgCtx.globalCompositeOperation = 'lighter';
  fgCtx.fillStyle = grad;
  fgCtx.strokeStyle = 'rgba(64, 158, 255, 0.28)';
  fgCtx.lineWidth = Math.max(1, dotR * 0.6);
  fgCtx.shadowBlur = 10;
  fgCtx.shadowColor = 'rgba(64, 158, 255, 0.25)';

  // 旋转角速度复用当前 demo 的视觉速度
  angle = 0;
  const draw = (timestamp: number) => {
    if (!fgCtx) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.max(0.1, timestamp - lastTimestamp);
    lastTimestamp = timestamp;

    const nextAngle = angle + speedRadPerMs * dt;
    const rot = nextAngle;

    // 清屏：callCost 专注“合并绘制”，这里仍用整屏 clear（避免脏矩形复杂化干扰对比）
    fgCtx.clearRect(0, 0, cssW, cssH);

    // 关键：只做一次 beginPath，然后把所有 arc 合并后一次 fill + 一次 stroke
    fgCtx.beginPath();
    for (let i = 0; i < dotCount; i++) {
      const a = baseAngles[i] + rot;
      const rm = baseMul[i];
      const x = centerX + groupOrbitR * Math.cos(a) + jitterR * rm * Math.cos(a * 3.1);
      const y = cy + groupOrbitR * Math.sin(a) + jitterR * rm * Math.sin(a * 2.3);
      // 关键修复：为每个圆创建独立子路径，避免上一段 arc 的末端与下一段 arc 的起点之间被自动补“直线”，
      // 从而导致 fill 把“球连成的多边形”一起填充。
      fgCtx.moveTo(x + dotR, y);
      fgCtx.arc(x, y, dotR, 0, TAU);
    }
    fgCtx.fill();
    fgCtx.stroke();

    // 少量文字用于“凸显合并绘制”的特征（降低文字频率）
    if (frameIndex % 30 === 0) {
      fgCtx.save();
      fgCtx.globalCompositeOperation = 'source-over';
      fgCtx.shadowBlur = 0;
      fgCtx.fillStyle = 'rgba(10, 18, 40, 0.6)';
      fgCtx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      fgCtx.fillText('Batch draw: 1x fill + 1x stroke', 14, 18);
      fgCtx.restore();
    }

    frameIndex++;
    if (frameIndex % 2 === 0) fps.value = Math.round(1000 / dt);
    angle = nextAngle;

    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);
}

function createWorker() {
  const workerCode = `
    let angle = 0;
    let prevX = 0;
    let prevY = 0;
    let speedRadPerMs = 0.0018;

    let r = 18;
    let spritePadding = 8;
    let spriteHalfCss = r + spritePadding;
    let spriteSizeCss = spriteHalfCss * 2;
    let dpr = 1;
    let orbitRadius = 100;
    let centerX = 0;
    let centerY = 0;

    function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

    async function buildSprite() {
      const spriteSizePx = Math.ceil(spriteSizeCss * dpr);
      const canvas = new OffscreenCanvas(spriteSizePx, spriteSizePx);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('OffscreenCanvas ctx not available');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = spriteHalfCss;
      const cy = spriteHalfCss;

      // shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + ${ballR} * 0.85, ${ballR} * 0.9, ${ballR} * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const fill = '#409EFF';
      const stroke = 'rgba(64, 158, 255, 0.45)';
      const TAU = Math.PI * 2;
      const grad = ctx.createRadialGradient(cx - ${ballR} * 0.3, cy - ${ballR} * 0.3, 0, cx, cy, ${ballR} * 1.4);
      grad.addColorStop(0, '#6bb7ff');
      grad.addColorStop(1, fill);
      ctx.fillStyle = grad;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(cx, cy, ${ballR}, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // glow ring
      ctx.strokeStyle = 'rgba(64, 158, 255, 0.18)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, ${ballR} + 3, 0, TAU);
      ctx.stroke();

      let bitmap = null;
      if (typeof canvas.transferToImageBitmap === 'function') {
        bitmap = canvas.transferToImageBitmap();
      } else {
        const blob = await canvas.convertToBlob();
        bitmap = await createImageBitmap(blob);
      }
      return bitmap;
    }

    let spriteBitmap = null;

    self.onmessage = async (e) => {
      const msg = e.data || {};
      try {
        if (msg.type === 'init') {
          speedRadPerMs = msg.speedRadPerMs || 0.0018;
          r = msg.r || 18;
          spritePadding = msg.spritePadding || 8;
          spriteHalfCss = r + spritePadding;
          spriteSizeCss = spriteHalfCss * 2;
          dpr = msg.dpr || 1;
          orbitRadius = msg.orbitRadius || 100;
          centerX = msg.centerX || 0;
          centerY = msg.centerY || 0;

          angle = 0;
          prevX = centerX + orbitRadius * Math.cos(angle);
          prevY = centerY + orbitRadius * Math.sin(angle);

          spriteBitmap = await buildSprite();
          self.postMessage({ type: 'sprite', bitmap: spriteBitmap }, [spriteBitmap]);
          return;
        }

        if (msg.type === 'tick') {
          const dt = Math.max(0.1, msg.dt || 16);
          const nextAngle = angle + speedRadPerMs * dt;
          const x = centerX + orbitRadius * Math.cos(nextAngle);
          const y = centerY + orbitRadius * Math.sin(nextAngle);

          const padding = (r + spritePadding) + 2;
          const minX = Math.min(prevX, x) - padding;
          const minY = Math.min(prevY, y) - padding;
          const maxX = Math.max(prevX, x) + padding;
          const maxY = Math.max(prevY, y) + padding;

          const xx = clamp(minX, 0, msg.maxW);
          const yy = clamp(minY, 0, msg.maxH);
          const width = clamp(maxX - minX, 0, msg.maxW);
          const height = clamp(maxY - minY, 0, msg.maxH);

          self.postMessage({
            type: 'frame',
            x,
            y,
            dirtyRect: { x: xx, y: yy, width, height },
          });

          prevX = x;
          prevY = y;
          angle = nextAngle;
        }
      } catch (err) {
        self.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  return w;
}

async function startWorkerMode() {
  stopMode();
  resetLayersForMode();
  ensureForegroundStyles();

  centerX = cssW / 2;
  centerY = cssH / 2;
  orbitRadius = Math.min(cssW, cssH) * 0.28;
  angle = 0;

  if (!supportsWorker) return;

  if (worker) worker.terminate();
  worker = createWorker();
  workerSpriteReady = false;

  let latestFrame: { x: number; y: number; dirtyRect: { x: number; y: number; width: number; height: number } } | null =
    null;
  let workerError: string | null = null;
  let waitingForFrame = false;

  // 由于 worker 每帧会回传 dirtyRect 和坐标，这里用一个“接收-渲染”节流，减少消息堆积
  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data || {};
    if (msg.type === 'sprite') {
      // worker 已经用 OffscreenCanvas 生成好精灵
      ballSpriteBitmap = msg.bitmap as ImageBitmap;
      workerSpriteReady = true;
      waitingForFrame = false;
      return;
    }
    if (msg.type === 'error') {
      workerError = msg.message || 'Worker error';
      // console.warn(workerError);
      return;
    }
    if (msg.type === 'frame') {
      latestFrame = {
        x: msg.x,
        y: msg.y,
        dirtyRect: msg.dirtyRect
      };
      waitingForFrame = false;
    }
  };

  worker.postMessage({
    type: 'init',
    r: ballR,
    spritePadding,
    dpr,
    orbitRadius,
    centerX,
    centerY,
    speedRadPerMs
  });

  const draw = (timestamp: number) => {
    if (!fgCtx) return;
    if (!worker) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.max(0.1, timestamp - lastTimestamp);
    lastTimestamp = timestamp;

    // 主线程只负责：清理脏矩形 + 把 worker 结果画出来
    // 计算逻辑（angle、x/y、dirtyRect）都在 worker 内完成
    if (workerSpriteReady && !waitingForFrame) {
      waitingForFrame = true;
      worker.postMessage({
        type: 'tick',
        dt,
        maxW: cssW,
        maxH: cssH
      });
    }

    if (latestFrame) {
      const { x, y, dirtyRect } = latestFrame;
      fgCtx.clearRect(dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);

      if (workerSpriteReady && ballSpriteBitmap) {
        fgCtx.drawImage(ballSpriteBitmap, x - spriteHalfCss, y - spriteHalfCss, spriteSizeCss, spriteSizeCss);
      } else {
        // sprite 尚未就绪：临时回退 arc（保证 demo 不会空白）
        fgCtx.beginPath();
        fgCtx.arc(x, y, ballR, 0, TAU);
        fgCtx.fill();
        fgCtx.stroke();
      }

      frameIndex++;
      if (frameIndex % 2 === 0) fps.value = Math.round(1000 / dt);
      // 防止重复渲染同一帧
      latestFrame = null;
    } else {
      // worker 还没回传：不要强行重画，以免出现“抖动/闪烁”
    }

    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);
}

function startByMode(mode: Mode) {
  runToken++;
  const token = runToken;
  if (mode === 'dirty') startDirtyMode();
  if (mode === 'layer') startLayerMode();
  if (mode === 'callCost') startCallCostMode();
  if (mode === 'worker') startWorkerMode().catch(() => {});
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!bgCanvasRef.value || !fgCanvasRef.value || !trailCanvasRef.value) return;

  const b = bgCanvasRef.value;
  const f = fgCanvasRef.value;
  const t = trailCanvasRef.value;

  // 绑定 ctx
  bgCtx = b.getContext('2d');
  fgCtx = f.getContext('2d');
  trailCtx = t.getContext('2d');

  if (!bgCtx || !fgCtx || !trailCtx) return;

  // 首次设置尺寸
  setCanvasSize(b, bgCtx);
  setCanvasSize(f, fgCtx);
  setCanvasSize(t, trailCtx);

  renderBackgroundToCache();
  startByMode(activeMode.value);

  // resize 处理：重新设置画布像素并重绘静态缓存，再按当前 Tab 重启动画
  resizeObserver = new ResizeObserver(() => {
    if (!bgCanvasRef.value || !fgCanvasRef.value || !trailCanvasRef.value) return;
    if (!bgCtx || !fgCtx || !trailCtx) return;

    setCanvasSize(bgCanvasRef.value, bgCtx);
    setCanvasSize(fgCanvasRef.value, fgCtx);
    setCanvasSize(trailCanvasRef.value, trailCtx);

    // 背景是静态层，只要尺寸变化才重新生成离屏缓存
    renderBackgroundToCache();
    startByMode(activeMode.value);
  });
  resizeObserver.observe(containerRef.value as Element);
});

onBeforeUnmount(() => {
  stopMode();
  if (resizeObserver && containerRef.value) resizeObserver.unobserve(containerRef.value);
  resizeObserver = null;
});

watch(activeMode, n => {
  startByMode(n);
});
</script>

<template>
  <div class="canvas-wrapper">
    <ElCard shadow="hover" class="canvas-card">
      <template #header>
        <div class="canvas-header">
          <span>Canvas 性能优化示例（Tab 模式演示）</span>
          <div class="canvas-header-right">
            <ElTag type="success">FPS: {{ fps }}</ElTag>
            <ElTag>{{ modeLabel }}</ElTag>
            <ElTag v-if="activeMode === 'callCost'">
              Batch fill/stroke: {{ callCostStats.optimizedFillCalls }}/{{ callCostStats.optimizedStrokeCalls }} · dots:
              {{ callCostStats.dotCount }}
            </ElTag>
          </div>
        </div>
      </template>

      <div class="canvas-layout">
        <div ref="containerRef" class="canvas-area">
          <!-- 静态背景层（离屏缓存，一次生成，按需 drawImage） -->
          <canvas ref="bgCanvasRef" class="canvas-layer canvas-layer--bg"></canvas>
          <!-- 前景动态图层（各 tab 的主要绘制在这里） -->
          <canvas ref="fgCanvasRef" class="canvas-layer canvas-layer--fg"></canvas>
          <!-- 轨迹/增量层（仅 layer 模式会展示；其他模式清空即可） -->
          <canvas
            ref="trailCanvasRef"
            class="canvas-layer canvas-layer--trail"
            :style="{ opacity: activeMode === 'layer' ? 1 : 0 }"
          ></canvas>
        </div>

        <div class="canvas-desc">
          <ElAlert title="切换 Tab：动态绘制策略会同步切换。" type="info" :closable="false" show-icon />

          <ElTabs v-model="activeMode" class="canvas-tabs" type="card">
            <ElTabPane label="减少重绘范围" name="dirty">
              <div class="tab-desc">
                <div class="tab-title">脏矩形重绘 + 避免整屏 clear</div>
                <div class="tab-text">
                  仅根据“上一帧”和“当前帧”的小球覆盖范围计算
                  <code>dirtyRect</code>
                  ，然后在前景层调用
                  <code>clearRect</code>
                  只清理局部区域；绘制阶段再用
                  <code>clip()</code>
                  限制在脏矩形内，避免笔触抗锯齿溢出。 背景仍保持静态离屏缓存。
                </div>
              </div>
            </ElTabPane>

            <ElTabPane label="分层渲染" name="layer">
              <div class="tab-desc">
                <div class="tab-title">静态背景 + 增量轨迹 + 前景局部擦除</div>
                <div class="tab-text">
                  背景在
                  <code>bg</code>
                  层一次性缓存；轨迹在
                  <code>trail</code>
                  层做“增量线段叠加”（不整层重绘）；小球高亮只在
                  <code>fg</code>
                  层做脏矩形清理与重绘。
                </div>
              </div>
            </ElTabPane>

            <ElTabPane label="降低调用成本" name="callCost">
              <div class="tab-desc">
                <div class="tab-title">合并路径批量绘制（只显示优化版）</div>
                <div class="tab-text">
                  使用“只设置一次样式 + 所有
                  <code>arc</code>
                  合并到一个路径里”，每帧只做一次
                  <code>fill</code>
                  和一次
                  <code>stroke</code>
                  。 同时用渐变 + 光晕来凸显批量绘制效果。
                </div>
              </div>
            </ElTabPane>

            <ElTabPane label="Worker + OffscreenCanvas" name="worker">
              <div class="tab-desc">
                <div class="tab-title">把计算与离屏渲染搬到 Worker</div>
                <div v-if="!supportsWorker" class="tab-text tab-warn">
                  当前环境不支持
                  <code>Worker</code>
                  ，该模式不可用。
                </div>
                <div v-else class="tab-text">
                  在 Worker 中更新角度、计算
                  <code>dirtyRect</code>
                  ，并用
                  <code>OffscreenCanvas</code>
                  预生成精灵； 主线程只负责：接收结果、局部清理、把精灵绘制到前景层。
                </div>
              </div>
            </ElTabPane>
          </ElTabs>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  padding: 16px;
}

.canvas-card {
  width: 100%;
}

.canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.canvas-header-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.canvas-layout {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.canvas-area {
  position: relative;
  flex: 1 1 600px;
  min-width: 320px;
  max-width: 720px;
  height: 360px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--el-border-color-light);
  background-color: #fff;
}

.canvas-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-layer--bg {
  z-index: 1;
}

.canvas-layer--fg {
  z-index: 2;
  pointer-events: none;
}

.canvas-layer--trail {
  z-index: 2;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.canvas-desc {
  flex: 1 1 340px;
  min-width: 260px;
}

.canvas-tabs {
  margin-top: 12px;
}

.tab-desc {
  padding: 8px 4px 12px;
}

.tab-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.tab-status {
  margin: 4px 0 10px;
}

.tab-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.tab-warn {
  color: #e6a23c;
}

.tab-text code {
  padding: 0 3px;
  border-radius: 3px;
  background-color: var(--el-fill-color-light);
  font-size: 12px;
}
</style>
