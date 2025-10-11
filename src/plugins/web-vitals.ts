import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

// 获取 Web Vitals 上报 URL（根据环境变量动态配置）
const getReportUrl = (): string => {
  return import.meta.env.VITE_WEB_VITALS_REPORT_URL || 'http://localhost:3000/monitor/webvitals';
};

export interface WebVitalsData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// 长任务数据接口
export interface LongTaskData {
  name: string;
  duration: number;
  startTime: number;
  attribution?: Array<{
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
    containerType?: string;
    containerSrc?: string;
    containerId?: string;
    containerName?: string;
  }>;
}

// 内存泄漏数据接口
export interface MemoryLeakData {
  name: string;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryUsage: number; // 内存使用率百分比
  timestamp: number;
  leakScore: number; // 泄漏评分 (0-100)
  trend: 'stable' | 'increasing' | 'decreasing'; // 内存趋势
}

// 内存监控数据接口
export interface MemoryData {
  name: string;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
  memoryUsagePercent: number;
  memoryGrowthRate?: number; // MB/s
}

export interface WebVitalsConfig {
  // 是否启用控制台日志
  enableConsoleLog?: boolean;
  // 是否启用数据上报
  enableReport?: boolean;
  // 数据上报URL
  reportUrl?: string;
  // 自定义数据上报函数
  customReport?: (data: WebVitalsData) => void;
  // 阈值配置
  thresholds?: {
    lcp?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
    inp?: number;
    fps?: number; // 添加FPS阈值配置
    longTask?: number; // 添加长任务阈值配置
  };
  // FPS监控配置
  fpsConfig?: {
    // 监控持续时间（毫秒）
    duration?: number;
    // 采样间隔（毫秒）
    sampleInterval?: number;
    // 是否启用FPS监控
    enabled?: boolean;
  };
  // 长任务监控配置
  longTaskConfig?: {
    // 是否启用长任务监控
    enabled?: boolean;
    // 长任务阈值（毫秒），默认50ms
    threshold?: number;
    // 最大记录任务数量
    maxTasks?: number;
    // 是否记录详细的任务信息
    includeAttribution?: boolean;
  };
  // 内存泄漏监控配置
  memoryLeakConfig?: {
    // 是否启用内存泄漏监控
    enabled?: boolean;
    // 监控间隔（毫秒），默认5秒
    interval?: number;
    // 内存使用率警告阈值（百分比），默认80%
    warningThreshold?: number;
    // 内存使用率危险阈值（百分比），默认90%
    dangerThreshold?: number;
    // 内存增长趋势检测窗口大小，默认10个样本
    trendWindowSize?: number;
    // 内存增长速率阈值（MB/分钟），默认10MB
    growthRateThreshold?: number;
    // 最大监控时长（毫秒），默认5分钟
    maxMonitoringDuration?: number;
  };
  // 内存监控配置（新的完整内存监控）
  memoryConfig?: {
    // 是否启用内存监控
    enabled?: boolean;
    // 监控间隔（毫秒）
    interval?: number;
    // 监控持续时间（毫秒）
    duration?: number;
    // 内存增长率阈值（MB/s）
    growthRateThreshold?: number;
    // 内存使用率阈值（百分比）
    usageThreshold?: number;
    // 最大记录样本数
    maxSamples?: number;
    // 是否检测内存泄漏
    detectLeaks?: boolean;
    // 内存泄漏检测窗口大小
    leakDetectionWindow?: number;
  };
}

// 默认阈值配置，参考Google推荐值
const DEFAULT_THRESHOLDS = {
  lcp: 2500, // 2.5秒
  cls: 0.1, // 0.1
  fcp: 1800, // 1.8秒
  ttfb: 800, // 800毫秒
  inp: 200, // 200毫秒
  fps: 30, // 30 FPS
  longTask: 50, // 50毫秒
  memory: 80, // 80% 内存使用率阈值
  memoryGrowthRate: 1 // 1MB/s 内存增长率阈值
};

// 默认FPS配置
const DEFAULT_FPS_CONFIG = {
  duration: 10000, // 10秒
  sampleInterval: 100, // 100ms采样一次
  enabled: true
};

// 默认长任务配置
const DEFAULT_LONG_TASK_CONFIG = {
  enabled: true,
  threshold: 50, // 50ms
  maxTasks: 100, // 最多记录100个长任务
  includeAttribution: true
};

// 默认内存泄漏配置
const DEFAULT_MEMORY_LEAK_CONFIG = {
  enabled: true,
  interval: 5000, // 5秒监控一次
  warningThreshold: 80, // 80%警告
  dangerThreshold: 90, // 90%危险
  trendWindowSize: 10, // 10个样本检测趋势
  growthRateThreshold: 10, // 10MB/分钟增长速率
  maxMonitoringDuration: 300000 // 5分钟最大监控时长
};

// 默认内存监控配置
const DEFAULT_MEMORY_CONFIG = {
  enabled: true,
  interval: 5000, // 5秒采样一次
  duration: 60000, // 监控1分钟
  growthRateThreshold: 1, // 1MB/s 增长率阈值
  usageThreshold: 80, // 80% 使用率阈值
  maxSamples: 100, // 最多记录100个样本
  detectLeaks: true,
  leakDetectionWindow: 10 // 使用最近10个样本检测泄漏
};

// FPS监控器变量
let fpsMonitor: {
  startTime: number; // 监控开始时间（固定不变）
  frameCount: number;
  lastTime: number;
  samples: number[];
  isRunning: boolean;
  animationId: number | null;
  sampleStartTime: number; // 每次采样的开始时间（用于FPS计算）
} | null = null;

// 长任务监控器变量
let longTaskMonitor: {
  observer: PerformanceObserver | null;
  tasks: LongTaskData[];
  totalTasks: number;
  totalDuration: number;
  maxDuration: number;
  isRunning: boolean;
  config: typeof DEFAULT_LONG_TASK_CONFIG;
} | null = null;

// 内存泄漏监控器变量
let memoryLeakMonitor: {
  intervalId: number | null;
  samples: MemoryLeakData[];
  startTime: number;
  isRunning: boolean;
  config: typeof DEFAULT_MEMORY_LEAK_CONFIG;
  baselineMemory: number | null; // 基准内存使用量
} | null = null;

// 内存监控器变量
let memoryMonitor: {
  timer: NodeJS.Timeout | null;
  samples: MemoryData[];
  startTime: number;
  lastSample: MemoryData | null;
  isRunning: boolean;
  config: typeof DEFAULT_MEMORY_CONFIG;
  leakDetected: boolean;
} | null = null;

// 获取性能评级
function getRating(value: number, threshold: number, metric: string = ''): 'good' | 'needs-improvement' | 'poor' {
  // FPS越高越好，需要特殊处理
  if (metric === 'FPS') {
    if (value >= 60) return 'good';
    if (value >= 30) return 'needs-improvement';
    return 'poor';
  }

  // 长任务数量越少越好
  if (metric === 'LongTask') {
    if (value <= 5) return 'good'; // 5个以下长任务
    if (value <= 15) return 'needs-improvement'; // 15个以下长任务
    return 'poor';
  }

  // 内存使用率越低越好
  if (metric === 'Memory') {
    if (value <= 50) return 'good'; // 50%以下内存使用率
    if (value <= 80) return 'needs-improvement'; // 80%以下内存使用率
    return 'poor';
  }

  // 内存增长率越低越好
  if (metric === 'MemoryGrowthRate') {
    if (value <= 0.5) return 'good'; // 0.5MB/s以下增长率
    if (value <= 1.5) return 'needs-improvement'; // 1.5MB/s以下增长率
    return 'poor';
  }

  // 其他指标（LCP、CLS、FCP、TTFB、INP）越小越好
  if (value <= threshold) return 'good';
  if (value <= threshold * 1.5) return 'needs-improvement';
  return 'poor';
}

// 格式化数值
function formatValue(value: number, metric: string): string {
  if (metric === 'CLS') {
    return value.toFixed(3) || '0';
  }
  if (metric === 'INP' || metric === 'LongTask') {
    return `${Math.round(value)}ms`;
  }
  if (metric === 'LCP' || metric === 'FCP' || metric === 'TTFB') {
    return `${Math.round(value)}ms`;
  }
  if (metric === 'FPS') {
    return `${Math.round(value)}fps`;
  }
  return value.toString();
}

// 启动长任务监控
function startLongTaskMonitoring(config: WebVitalsConfig) {
  const longTaskConfig = { ...DEFAULT_LONG_TASK_CONFIG, ...config.longTaskConfig };

  if (!longTaskConfig.enabled) return;

  // 检查浏览器是否支持PerformanceObserver和longtask
  if (!('PerformanceObserver' in window)) {
    console.warn('PerformanceObserver is not supported in this browser');
    return;
  }

  try {
    longTaskMonitor = {
      observer: null,
      tasks: [],
      totalTasks: 0,
      totalDuration: 0,
      maxDuration: 0,
      isRunning: true,
      config: longTaskConfig
    };

    const observer = new PerformanceObserver(list => {
      if (!longTaskMonitor || !longTaskMonitor.isRunning) return;

      const entries = list.getEntries();

      for (const entry of entries) {
        if (entry.entryType === 'longtask' && entry.duration >= longTaskConfig.threshold) {
          longTaskMonitor.totalTasks++;
          longTaskMonitor.totalDuration += entry.duration;
          longTaskMonitor.maxDuration = Math.max(longTaskMonitor.maxDuration, entry.duration);

          const longTaskData: LongTaskData = {
            name: entry.name || 'unknown',
            duration: entry.duration,
            startTime: entry.startTime
          };

          // 如果需要记录详细的任务信息
          if (longTaskConfig.includeAttribution && (entry as any).attribution) {
            longTaskData.attribution = (entry as any).attribution.map((attr: any) => ({
              name: attr.name || 'unknown',
              entryType: attr.entryType || 'unknown',
              startTime: attr.startTime || 0,
              duration: attr.duration || 0,
              containerType: attr.containerType,
              containerSrc: attr.containerSrc,
              containerId: attr.containerId,
              containerName: attr.containerName
            }));
          }

          // 只保留最新的长任务记录
          if (longTaskMonitor.tasks.length >= longTaskConfig.maxTasks) {
            longTaskMonitor.tasks.shift();
          }
          longTaskMonitor.tasks.push(longTaskData);

          // 实时上报每个长任务
          const data: WebVitalsData = {
            name: 'LongTask',
            value: entry.duration,
            rating: getRating(entry.duration, longTaskConfig.threshold, 'LongTask'),
            delta: 0,
            id: `longtask-${Date.now()}-${Math.random()}`,
            navigationType: 'navigate'
          };

          // 添加长任务详细信息
          (data as any).longTaskData = longTaskData;
          (data as any).longTaskStats = {
            totalTasks: longTaskMonitor.totalTasks,
            totalDuration: longTaskMonitor.totalDuration,
            averageDuration: longTaskMonitor.totalDuration / longTaskMonitor.totalTasks,
            maxDuration: longTaskMonitor.maxDuration
          };

          if (config.enableConsoleLog) {
            console.warn(`⚠️ 检测到长任务: ${entry.duration.toFixed(2)}ms`, longTaskData);
          }

          handleWebVitalsData(data, config);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    longTaskMonitor.observer = observer;

    console.log('✅ 长任务监控已启动，阈值:', longTaskConfig.threshold, 'ms');
  } catch (error) {
    console.warn('Failed to start long task monitoring:', error);
  }
}

// 停止长任务监控
function stopLongTaskMonitoring(config: WebVitalsConfig) {
  if (!longTaskMonitor || !longTaskMonitor.isRunning) return;

  longTaskMonitor.isRunning = false;

  if (longTaskMonitor.observer) {
    longTaskMonitor.observer.disconnect();
  }

  // 生成长任务汇总报告
  if (longTaskMonitor.totalTasks > 0) {
    const averageDuration = longTaskMonitor.totalDuration / longTaskMonitor.totalTasks;

    const summaryData: WebVitalsData = {
      name: 'LongTaskSummary',
      value: longTaskMonitor.totalTasks,
      rating: getRating(longTaskMonitor.totalTasks, 10, 'LongTask'),
      delta: 0,
      id: `longtask-summary-${Date.now()}`,
      navigationType: 'navigate'
    };

    // 添加汇总统计信息
    (summaryData as any).longTaskSummary = {
      totalTasks: longTaskMonitor.totalTasks,
      totalDuration: longTaskMonitor.totalDuration,
      averageDuration,
      maxDuration: longTaskMonitor.maxDuration,
      tasks: longTaskMonitor.tasks.slice(-10) // 只保留最近10个长任务的详细信息
    };

    console.log('📊 长任务监控汇总:', {
      totalTasks: longTaskMonitor.totalTasks,
      totalDuration: `${longTaskMonitor.totalDuration.toFixed(2)}ms`,
      averageDuration: `${averageDuration.toFixed(2)}ms`,
      maxDuration: `${longTaskMonitor.maxDuration.toFixed(2)}ms`
    });

    handleWebVitalsData(summaryData, config);
  }

  longTaskMonitor = null;
}

// 启动内存泄漏监控
function startMemoryLeakMonitoring(config: WebVitalsConfig) {
  const memoryConfig = { ...DEFAULT_MEMORY_LEAK_CONFIG, ...config.memoryLeakConfig };

  if (!memoryConfig.enabled) return;

  // 检查浏览器是否支持performance.memory
  if (!('memory' in performance)) {
    console.warn('performance.memory is not supported in this browser');
    return;
  }

  try {
    memoryLeakMonitor = {
      intervalId: null,
      samples: [],
      startTime: Date.now(),
      isRunning: true,
      config: memoryConfig,
      baselineMemory: null
    };

    const monitorMemory = () => {
      if (!memoryLeakMonitor || !memoryLeakMonitor.isRunning) return;

      const memory = (performance as any).memory;
      // console.log('memory:', memory);
      const currentTime = Date.now();
      const elapsed = currentTime - memoryLeakMonitor.startTime;

      // 检查是否超过最大监控时长
      if (elapsed >= memoryConfig.maxMonitoringDuration) {
        console.log('内存监控达到最大时长，停止监控');
        stopMemoryLeakMonitoring(config);
        return;
      }

      const memoryData: MemoryLeakData = {
        name: 'MemoryLeak',
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        timestamp: currentTime,
        leakScore: 0, // 将在下面计算
        trend: 'stable' // 将在下面计算
      };

      // 设置基准内存
      if (memoryLeakMonitor.baselineMemory === null) {
        memoryLeakMonitor.baselineMemory = memory.usedJSHeapSize;
      }

      // 计算泄漏评分 (0-100)
      const memoryGrowth = memory.usedJSHeapSize - (memoryLeakMonitor.baselineMemory || 0);

      const growthRate = memoryGrowth / ((elapsed || 1) / 60000); // MB/分钟
      // 改进的泄漏评分计算：
      // 1. 内存增长率评分 (0-70分) - 主要指标
      const growthScore = Math.min(70, Math.max(0, (growthRate / memoryConfig.growthRateThreshold) * 70));
      // 2. 内存使用率评分 (0-30分) - 辅助指标
      const usageScore = Math.min(30, Math.max(0, (memoryData.memoryUsage / 100) * 30));
      // 3. 综合评分
      memoryData.leakScore = Math.round(growthScore + usageScore);

      // 计算内存趋势
      memoryLeakMonitor.samples.push(memoryData);

      // 保持样本数量在窗口大小内
      if (memoryLeakMonitor.samples.length > memoryConfig.trendWindowSize) {
        memoryLeakMonitor.samples.shift();
      }

      // 计算趋势
      if (memoryLeakMonitor.samples.length >= 3) {
        const recent = memoryLeakMonitor.samples.slice(-3);
        const trend = recent[2].usedJSHeapSize - recent[0].usedJSHeapSize;
        const avgGrowth = trend / 2;

        if (avgGrowth > memoryConfig.growthRateThreshold * 1024 * 1024) {
          // 转换为字节
          memoryData.trend = 'increasing';
        } else if (avgGrowth < -memoryConfig.growthRateThreshold * 1024 * 1024) {
          memoryData.trend = 'decreasing';
        } else {
          memoryData.trend = 'stable';
        }
      }

      // 检查内存使用率警告
      if (memoryData.memoryUsage >= memoryConfig.dangerThreshold) {
        console.error(`🚨 内存使用率危险: ${memoryData.memoryUsage.toFixed(2)}%`);
      } else if (memoryData.memoryUsage >= memoryConfig.warningThreshold) {
        console.warn(`⚠️ 内存使用率警告: ${memoryData.memoryUsage.toFixed(2)}%`);
      }

      // 创建WebVitals格式的数据
      const webVitalsData: WebVitalsData = {
        name: 'MemoryLeak',
        value: Number(memoryData.memoryUsage.toFixed(2)),
        rating:
          memoryData.memoryUsage >= memoryConfig.dangerThreshold
            ? 'poor'
            : memoryData.memoryUsage >= memoryConfig.warningThreshold
              ? 'needs-improvement'
              : 'good',
        delta: memoryData.leakScore ?? 0,
        id: `memory-${Date.now()}`,
        navigationType: 'navigate'
      };

      // 添加内存泄漏详细信息
      (webVitalsData as any).memoryLeakData = memoryData;
      (webVitalsData as any).memoryStats = {
        usedJSHeapSize: `${(memoryData.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        totalJSHeapSize: `${(memoryData.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        jsHeapSizeLimit: `${(memoryData.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
        memoryUsage: `${memoryData.memoryUsage.toFixed(2)}%`,
        leakScore: memoryData.leakScore.toFixed(2) ?? 0,
        trend: memoryData.trend,
        samples: memoryLeakMonitor.samples.length
      };

      // if (config.enableConsoleLog) {
      //   console.log(`📊 内存监控: ${memoryData.memoryUsage.toFixed(2)}% 使用率, 泄漏评分: ${memoryData.leakScore.toFixed(2)}, 趋势: ${memoryData.trend}`);
      // }

      // 第一次监控时或检测到内存泄漏时上传数据
      const isFirstSample = memoryLeakMonitor.samples.length === 1;
      // 调整泄漏检测阈值：评分 > 50 且趋势为增长时认为有泄漏风险
      const isMemoryLeakDetected = memoryData.leakScore > 50 && memoryData.trend === 'increasing';

      if (isFirstSample || isMemoryLeakDetected) {
        if (isFirstSample) {
          console.log(
            `📊 内存监控首次采样: ${memoryData.memoryUsage.toFixed(2)}% 使用率, 泄漏评分: ${memoryData.leakScore.toFixed(2)}`
          );
        }
        if (isMemoryLeakDetected) {
          console.error(`🚨 检测到潜在内存泄漏! 泄漏评分: ${memoryData.leakScore.toFixed(2)}`);
        }
        handleWebVitalsData(webVitalsData, config);
      }
    };

    // 立即执行一次监控
    monitorMemory();

    // 设置定时器
    memoryLeakMonitor.intervalId = window.setInterval(monitorMemory, memoryConfig.interval);

    console.log('✅ 内存泄漏监控已启动，监控间隔:', memoryConfig.interval, 'ms');
  } catch (error) {
    console.warn('Failed to start memory leak monitoring:', error);
  }
}

// 停止内存泄漏监控
function stopMemoryLeakMonitoring(config: WebVitalsConfig) {
  if (!memoryLeakMonitor || !memoryLeakMonitor.isRunning) return;

  memoryLeakMonitor.isRunning = false;

  if (memoryLeakMonitor.intervalId) {
    clearInterval(memoryLeakMonitor.intervalId);
  }

  // 生成内存泄漏汇总报告
  if (memoryLeakMonitor.samples.length > 0) {
    const firstSample = memoryLeakMonitor.samples[0];
    const lastSample = memoryLeakMonitor.samples[memoryLeakMonitor.samples.length - 1];
    const totalGrowth = lastSample.usedJSHeapSize - firstSample.usedJSHeapSize;
    const avgMemoryUsage =
      memoryLeakMonitor.samples.reduce((sum, sample) => sum + sample.memoryUsage, 0) / memoryLeakMonitor.samples.length;
    const maxMemoryUsage = Math.max(...memoryLeakMonitor.samples.map(s => s.memoryUsage));
    const avgLeakScore =
      memoryLeakMonitor.samples.reduce((sum, sample) => sum + sample.leakScore, 0) / memoryLeakMonitor.samples.length;

    const summaryData: WebVitalsData = {
      name: 'MemoryLeakSummary',
      value: Number(avgMemoryUsage.toFixed(2)),
      rating:
        avgMemoryUsage >= memoryLeakMonitor.config.dangerThreshold
          ? 'poor'
          : avgMemoryUsage >= memoryLeakMonitor.config.warningThreshold
            ? 'needs-improvement'
            : 'good',
      delta: avgLeakScore ?? 0,
      id: `memory-summary-${Date.now()}`,
      navigationType: 'navigate'
    };

    // 添加汇总统计信息
    (summaryData as any).memoryLeakSummary = {
      totalSamples: memoryLeakMonitor.samples.length,
      monitoringDuration: Date.now() - memoryLeakMonitor.startTime,
      totalGrowth: `${(totalGrowth / 1024 / 1024).toFixed(2)}MB`,
      avgMemoryUsage: `${avgMemoryUsage.toFixed(2)}%`,
      maxMemoryUsage: `${maxMemoryUsage.toFixed(2)}%`,
      avgLeakScore: avgLeakScore.toFixed(2),
      baselineMemory: `${(memoryLeakMonitor.baselineMemory! / 1024 / 1024).toFixed(2)}MB`,
      finalMemory: `${(lastSample.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      samples: memoryLeakMonitor.samples.slice(-5) // 只保留最近5个样本的详细信息
    };

    console.log('📊 内存泄漏监控汇总:', {
      totalSamples: memoryLeakMonitor.samples.length,
      monitoringDuration: `${((Date.now() - memoryLeakMonitor.startTime) / 1000).toFixed(2)}s`,
      totalGrowth: `${(totalGrowth / 1024 / 1024).toFixed(2)}MB`,
      avgMemoryUsage: `${avgMemoryUsage.toFixed(2)}%`,
      maxMemoryUsage: `${maxMemoryUsage.toFixed(2)}%`,
      avgLeakScore: avgLeakScore.toFixed(2)
    });

    handleWebVitalsData(summaryData, config);
  }

  memoryLeakMonitor = null;
}

// FPS监控函数
function startFPSMonitoring(config: WebVitalsConfig) {
  const fpsConfig = { ...DEFAULT_FPS_CONFIG, ...config.fpsConfig };

  if (!fpsConfig.enabled) return;

  const now = performance.now();
  fpsMonitor = {
    startTime: now, // 监控开始时间（固定）
    frameCount: 0,
    lastTime: now,
    samples: [],
    isRunning: true,
    animationId: null,
    sampleStartTime: now // 采样开始时间（用于FPS计算）
  };

  console.log('🎯 开始FPS监控，持续时间:', fpsConfig.duration, 'ms');
  console.log('每100ms采样一次');
  const measureFrame = (currentTime: number) => {
    if (!fpsMonitor || !fpsMonitor.isRunning) return;

    fpsMonitor.frameCount++;

    // 每100ms采样一次(特点：每次重新计算,基于采样时间的fps平均值)
    if (currentTime - fpsMonitor.lastTime >= fpsConfig.sampleInterval) {
      // 使用sampleStartTime计算FPS，而不是startTime
      const fps = (fpsMonitor.frameCount * 1000) / (currentTime - fpsMonitor.sampleStartTime);
      // console.log("fps:", fps)
      fpsMonitor.samples.push(fps);

      // console.log(`当前FPS: ${fps.toFixed(2)}, 采样数: ${fpsMonitor.samples.length}`);

      // 更新采样时间，重置frameCount
      fpsMonitor.lastTime = currentTime;
      fpsMonitor.frameCount = 0;
      fpsMonitor.sampleStartTime = currentTime; // 更新采样开始时间
    }

    // 检查是否达到监控持续时间（使用固定的startTime）
    const elapsed = currentTime - fpsMonitor.startTime;
    if (elapsed >= fpsConfig.duration) {
      console.log(`监控时间达到 ${elapsed.toFixed(2)}ms，停止FPS监控，采样数: ${fpsMonitor.samples.length}`);
      stopFPSMonitoring(config);
      return;
    }

    fpsMonitor.animationId = requestAnimationFrame(measureFrame);
  };

  fpsMonitor.animationId = requestAnimationFrame(measureFrame);
}

// 停止FPS监控并计算平均FPS
function stopFPSMonitoring(config: WebVitalsConfig) {
  if (!fpsMonitor || !fpsMonitor.isRunning) return;

  fpsMonitor.isRunning = false;

  if (fpsMonitor.animationId) {
    cancelAnimationFrame(fpsMonitor.animationId);
  }
  console.log('FPS监控===fpsMonitor.samples:', fpsMonitor.samples);
  // 计算平均FPS
  if (fpsMonitor.samples.length > 0) {
    const averageFPS = fpsMonitor.samples.reduce((sum, fps) => sum + fps, 0) / fpsMonitor.samples.length;
    const minFPS = Math.min(...fpsMonitor.samples);
    const maxFPS = Math.max(...fpsMonitor.samples);
    console.log('FPS监控===averageFPS:', averageFPS);
    console.log('FPS监控===minFPS:', minFPS);
    console.log('FPS监控===maxFPS:', maxFPS);
    // 使用平均FPS作为主要指标
    const data: WebVitalsData = {
      name: 'FPS',
      value: Number(averageFPS.toFixed(2)),
      rating: getRating(averageFPS, config.thresholds?.fps || DEFAULT_THRESHOLDS.fps, 'FPS'),
      delta: 0, // FPS没有delta概念
      id: `fps-${Date.now()}`,
      navigationType: 'navigate'
    };

    // 添加详细FPS统计信息
    (data as any).fpsStats = {
      average: Number(averageFPS.toFixed(2)),
      min: Number(minFPS.toFixed(2)),
      max: Number(maxFPS.toFixed(2)),
      samples: fpsMonitor.samples.length
    };
    console.log('FPS监控===data:', data);
    handleWebVitalsData(data, config);
  }

  fpsMonitor = null;
}

// 控制台日志输出
function logToConsole(data: WebVitalsData, config: WebVitalsConfig) {
  if (!config.enableConsoleLog) return;

  const { name, value, rating, delta } = data;
  const formattedValue = formatValue(value, name);
  const formattedDelta = formatValue(delta, name);

  const ratingEmoji = {
    good: '✅',
    'needs-improvement': '⚠️',
    poor: '❌'
  };

  console.group(`${ratingEmoji[rating]} ${name}: ${formattedValue} (${rating})`);
  console.log('Value:', formattedValue);
  console.log('Delta:', formattedDelta);
  console.log('Rating:', rating);
  console.log('ID:', data.id);
  console.log('Navigation Type:', data.navigationType);

  // 如果是FPS，显示详细统计信息
  if (name === 'FPS' && (data as any).fpsStats) {
    const stats = (data as any).fpsStats;
    console.log('FPS Stats:', {
      average: `${stats.average}fps`,
      min: `${stats.min}fps`,
      max: `${stats.max}fps`,
      samples: stats.samples
    });
  }

  // 如果是长任务，显示任务详细信息
  if (name === 'LongTask' && (data as any).longTaskData) {
    const taskData = (data as any).longTaskData;
    const taskStats = (data as any).longTaskStats;
    console.log('Long Task Details:', {
      duration: `${taskData.duration.toFixed(2)}ms`,
      startTime: `${taskData.startTime.toFixed(2)}ms`,
      attribution: taskData.attribution
    });
    console.log('Long Task Stats:', {
      totalTasks: taskStats.totalTasks,
      totalDuration: `${taskStats.totalDuration.toFixed(2)}ms`,
      averageDuration: `${taskStats.averageDuration.toFixed(2)}ms`,
      maxDuration: `${taskStats.maxDuration.toFixed(2)}ms`
    });
  }

  // 如果是长任务汇总，显示汇总信息
  if (name === 'LongTaskSummary' && (data as any).longTaskSummary) {
    const summary = (data as any).longTaskSummary;
    console.log('Long Task Summary:', {
      totalTasks: summary.totalTasks,
      totalDuration: `${summary.totalDuration.toFixed(2)}ms`,
      averageDuration: `${summary.averageDuration.toFixed(2)}ms`,
      maxDuration: `${summary.maxDuration.toFixed(2)}ms`
    });
  }

  // 如果是内存泄漏，显示内存详细信息
  if (name === 'MemoryLeak' && (data as any).memoryStats) {
    const stats = (data as any).memoryStats;
    console.log('Memory Stats:', {
      usedJSHeapSize: stats.usedJSHeapSize,
      totalJSHeapSize: stats.totalJSHeapSize,
      jsHeapSizeLimit: stats.jsHeapSizeLimit,
      memoryUsage: stats.memoryUsage,
      leakScore: stats.leakScore,
      trend: stats.trend,
      samples: stats.samples
    });
  }

  // 如果是内存泄漏汇总，显示汇总信息
  if (name === 'MemoryLeakSummary' && (data as any).memoryLeakSummary) {
    const summary = (data as any).memoryLeakSummary;
    console.log('Memory Leak Summary:', {
      totalSamples: summary.totalSamples,
      monitoringDuration: `${(summary.monitoringDuration / 1000).toFixed(2)}s`,
      totalGrowth: summary.totalGrowth,
      avgMemoryUsage: summary.avgMemoryUsage,
      maxMemoryUsage: summary.maxMemoryUsage,
      avgLeakScore: summary.avgLeakScore,
      baselineMemory: summary.baselineMemory,
      finalMemory: summary.finalMemory
    });
  }

  // 如果是新的内存监控，显示内存详细信息
  if (name === 'Memory' && (data as any).memoryData) {
    const memoryData = (data as any).memoryData;
    const memoryStats = (data as any).memoryStats;
    console.log('Memory Details:', {
      usedJSHeapSize: `${(memoryData.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      totalJSHeapSize: `${(memoryData.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      jsHeapSizeLimit: `${(memoryData.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
      memoryUsagePercent: `${memoryData.memoryUsagePercent.toFixed(2)}%`,
      memoryGrowthRate: memoryData.memoryGrowthRate ? `${memoryData.memoryGrowthRate.toFixed(3)}MB/s` : 'N/A'
    });
    console.log('Memory Stats:', {
      samplesCount: memoryStats.samplesCount,
      monitoringDuration: `${(memoryStats.monitoringDuration / 1000).toFixed(2)}s`,
      averageUsage: `${memoryStats.averageUsage.toFixed(2)}%`,
      maxUsage: `${memoryStats.maxUsage.toFixed(2)}%`
    });
  }

  // 如果是内存监控汇总，显示汇总信息
  if (name === 'MemorySummary' && (data as any).memorySummary) {
    const summary = (data as any).memorySummary;
    console.log('Memory Summary:', {
      samplesCount: summary.samplesCount,
      monitoringDuration: `${(summary.monitoringDuration / 1000).toFixed(2)}s`,
      averageUsage: `${summary.averageUsage}%`,
      maxUsage: `${summary.maxUsage}%`,
      minUsage: `${summary.minUsage}%`,
      totalGrowth: `${summary.totalGrowth}%`,
      leakDetected: summary.leakDetected
    });
  }

  console.groupEnd();
}

// 数据上报
async function reportData(data: WebVitalsData, config: WebVitalsConfig) {
  if (!config.enableReport) return;

  try {
    if (config.customReport) {
      config.customReport(data);
      return;
    }

    // 使用配置中的 reportUrl，如果没有配置则使用环境变量中的 URL
    const reportUrl = config.reportUrl || getReportUrl();

    await fetch(reportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        environment: import.meta.env.MODE // 添加环境信息
      })
    });
  } catch (error) {
    console.error('Failed to report Web Vitals data:', error);
  }
}

// 处理Web Vitals数据
function handleWebVitalsData(data: WebVitalsData, config: WebVitalsConfig) {
  // 输出到控制台
  logToConsole(data, config);

  // 数据上报
  reportData(data, config);

  // 触发自定义事件，供其他模块监听
  window.dispatchEvent(new CustomEvent('web-vitals', { detail: data }));
}

// 设置Web Vitals监控
export function setupWebVitals(config: WebVitalsConfig = {}) {
  const finalConfig = {
    enableConsoleLog: true,
    enableReport: false,
    thresholds: DEFAULT_THRESHOLDS,
    fpsConfig: DEFAULT_FPS_CONFIG,
    longTaskConfig: DEFAULT_LONG_TASK_CONFIG,
    memoryLeakConfig: DEFAULT_MEMORY_LEAK_CONFIG,
    memoryConfig: DEFAULT_MEMORY_CONFIG,
    ...config
  };

  // 监控LCP (Largest Contentful Paint)
  onLCP((metric: any) => {
    const data: WebVitalsData = {
      name: 'LCP',
      value: Number(metric.value.toFixed(2)),
      rating: getRating(metric.value, finalConfig.thresholds.lcp!, 'LCP'),
      delta: Number((metric.delta || 0).toFixed(2)),
      id: metric.id,
      navigationType: metric.navigationType
    };
    handleWebVitalsData(data, finalConfig);
  });

  // 监控CLS (Cumulative Layout Shift)
  onCLS((metric: any) => {
    const data: WebVitalsData = {
      name: 'CLS',
      value: Number(metric.value.toFixed(2)) || 0,
      rating: getRating(metric.value, finalConfig.thresholds.cls!, 'CLS'),
      delta: Number((metric.delta || 0).toFixed(2)),
      id: metric.id,
      navigationType: metric.navigationType
    };
    handleWebVitalsData(data, finalConfig);
  });

  // 监控FCP (First Contentful Paint)
  onFCP((metric: any) => {
    const data: WebVitalsData = {
      name: 'FCP',
      value: Number(metric.value.toFixed(2)),
      rating: getRating(metric.value, finalConfig.thresholds.fcp!, 'FCP'),
      delta: Number((metric.delta || 0).toFixed(2)),
      id: metric.id,
      navigationType: metric.navigationType
    };
    handleWebVitalsData(data, finalConfig);
  });

  // 监控TTFB (Time to First Byte)
  onTTFB((metric: any) => {
    const data: WebVitalsData = {
      name: 'TTFB',
      value: Number(metric.value.toFixed(2)),
      rating: getRating(metric.value, finalConfig.thresholds.ttfb!, 'TTFB'),
      delta: Number((metric.delta || 0).toFixed(2)),
      id: metric.id,
      navigationType: metric.navigationType
    };
    handleWebVitalsData(data, finalConfig);
  });

  // 监控INP (Interaction to Next Paint) - 替代FID的新指标
  onINP((metric: any) => {
    const data: WebVitalsData = {
      name: 'INP',
      value: Number(metric.value.toFixed(2)),
      rating: getRating(metric.value, finalConfig.thresholds.inp!, 'INP'),
      delta: Number((metric.delta || 0).toFixed(2)),
      id: metric.id,
      navigationType: metric.navigationType
    };
    handleWebVitalsData(data, finalConfig);
  });

  // 启动长任务监控
  startLongTaskMonitoring(finalConfig);

  // 启动内存泄漏监控
  startMemoryLeakMonitoring(finalConfig);

  // 启动新的内存监控（可选）
  // startMemoryMonitoring(finalConfig);

  // 启动FPS监控（可选）
  // startFPSMonitoring(finalConfig);

  console.log('🚀 Web Vitals monitoring initialized (including Long Tasks, Memory Leak and FPS)');
}

// 获取当前页面的Web Vitals数据
export function getCurrentWebVitals(): Promise<WebVitalsData[]> {
  return new Promise(resolve => {
    const metrics: WebVitalsData[] = [];
    let count = 0;
    const totalMetrics = 6; // LCP, CLS, FCP, TTFB, INP, FPS

    const checkComplete = () => {
      count++;
      if (count === totalMetrics) {
        resolve(metrics);
      }
    };

    // 收集LCP
    onLCP((metric: any) => {
      metrics.push({
        name: 'LCP',
        value: Number(metric.value.toFixed(2)),
        rating: getRating(metric.value, DEFAULT_THRESHOLDS.lcp!, 'LCP'),
        delta: Number((metric.delta || 0).toFixed(2)),
        id: metric.id,
        navigationType: metric.navigationType
      });
      checkComplete();
    });

    // 收集CLS
    onCLS((metric: any) => {
      metrics.push({
        name: 'CLS',
        value: Number(metric.value.toFixed(2)) || 0,
        rating: getRating(metric.value, DEFAULT_THRESHOLDS.cls!, 'CLS'),
        delta: Number((metric.delta || 0).toFixed(2)),
        id: metric.id,
        navigationType: metric.navigationType
      });
      checkComplete();
    });

    // 收集FCP
    onFCP((metric: any) => {
      metrics.push({
        name: 'FCP',
        value: Number(metric.value.toFixed(2)),
        rating: getRating(metric.value, DEFAULT_THRESHOLDS.fcp!, 'FCP'),
        delta: Number((metric.delta || 0).toFixed(2)),
        id: metric.id,
        navigationType: metric.navigationType
      });
      checkComplete();
    });

    // 收集TTFB
    onTTFB((metric: any) => {
      metrics.push({
        name: 'TTFB',
        value: Number(metric.value.toFixed(2)),
        rating: getRating(metric.value, DEFAULT_THRESHOLDS.ttfb!, 'TTFB'),
        delta: Number((metric.delta || 0).toFixed(2)),
        id: metric.id,
        navigationType: metric.navigationType
      });
      checkComplete();
    });

    // 收集INP
    onINP((metric: any) => {
      metrics.push({
        name: 'INP',
        value: metric.value,
        rating: getRating(metric.value, DEFAULT_THRESHOLDS.inp!, 'INP'),
        delta: metric.delta || 0,
        id: metric.id,
        navigationType: metric.navigationType
      });
      checkComplete();
    });

    // 收集FPS - 使用简化的FPS监控
    const fpsStartTime = performance.now();
    let fpsFrameCount = 0;

    const measureFPS = (currentTime: number) => {
      fpsFrameCount++;

      if (currentTime - fpsStartTime >= 1000) {
        // 1秒内计算FPS
        const fps = (fpsFrameCount * 1000) / (currentTime - fpsStartTime);
        metrics.push({
          name: 'FPS',
          value: Number(fps.toFixed(2)),
          rating: getRating(fps, DEFAULT_THRESHOLDS.fps, 'FPS'),
          delta: 0,
          id: `fps-${Date.now()}`,
          navigationType: 'navigate'
        });
        checkComplete();
      } else {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  });
}

// 手动启动FPS监控
export function startFPSMonitor(config: WebVitalsConfig = {}) {
  const finalConfig = {
    enableConsoleLog: true,
    enableReport: true, // 修改为true，确保数据上报
    thresholds: DEFAULT_THRESHOLDS,
    fpsConfig: DEFAULT_FPS_CONFIG,
    ...config // 确保用户配置能够覆盖默认值
  };
  console.log('🎯 finalConfig:', finalConfig);
  startFPSMonitoring(finalConfig);
}

// 手动停止FPS监控
export function stopFPSMonitor() {
  if (fpsMonitor) {
    // 先计算并上报FPS数据
    if (fpsMonitor.samples.length > 0) {
      const averageFPS = fpsMonitor.samples.reduce((sum, fps) => sum + fps, 0) / fpsMonitor.samples.length;
      const minFPS = Math.min(...fpsMonitor.samples);
      const maxFPS = Math.max(...fpsMonitor.samples);

      const data: WebVitalsData = {
        name: 'FPS',
        value: Number(averageFPS.toFixed(2)),
        rating: getRating(averageFPS, DEFAULT_THRESHOLDS.fps, 'FPS'),
        delta: 0,
        id: `fps-${Date.now()}`,
        navigationType: 'navigate'
      };

      // 添加详细FPS统计信息
      (data as any).fpsStats = {
        average: Number(averageFPS.toFixed(2)),
        min: Number(minFPS.toFixed(2)),
        max: Number(maxFPS.toFixed(2)),
        samples: fpsMonitor.samples.length
      };

      // 使用默认配置进行数据上报
      const defaultConfig = {
        enableConsoleLog: true,
        enableReport: true,
        thresholds: DEFAULT_THRESHOLDS,
        reportUrl: getReportUrl()
      };

      handleWebVitalsData(data, defaultConfig);
    }

    // 停止监控
    fpsMonitor.isRunning = false;
    if (fpsMonitor.animationId) {
      cancelAnimationFrame(fpsMonitor.animationId);
    }
    fpsMonitor = null;
  }
}

// 手动启动长任务监控
export function startLongTaskMonitor(config: WebVitalsConfig = {}) {
  const finalConfig = {
    enableConsoleLog: true,
    enableReport: true,
    thresholds: DEFAULT_THRESHOLDS,
    longTaskConfig: DEFAULT_LONG_TASK_CONFIG,
    ...config
  };
  console.log('🔍 启动长任务监控，配置:', finalConfig.longTaskConfig);
  startLongTaskMonitoring(finalConfig);
}

// 手动停止长任务监控
export function stopLongTaskMonitor() {
  const defaultConfig = {
    enableConsoleLog: true,
    enableReport: true,
    thresholds: DEFAULT_THRESHOLDS,
    reportUrl: getReportUrl()
  };
  stopLongTaskMonitoring(defaultConfig);
}

// 获取长任务统计信息
export function getLongTaskStats() {
  if (!longTaskMonitor) {
    return null;
  }

  return {
    totalTasks: longTaskMonitor.totalTasks,
    totalDuration: longTaskMonitor.totalDuration,
    averageDuration: longTaskMonitor.totalTasks > 0 ? longTaskMonitor.totalDuration / longTaskMonitor.totalTasks : 0,
    maxDuration: longTaskMonitor.maxDuration,
    recentTasks: longTaskMonitor.tasks.slice(-5) // 最近5个任务
  };
}

// 手动启动内存泄漏监控
export function startMemoryLeakMonitor(config: WebVitalsConfig = {}) {
  const finalConfig = {
    enableConsoleLog: true,
    enableReport: true,
    thresholds: DEFAULT_THRESHOLDS,
    memoryLeakConfig: DEFAULT_MEMORY_LEAK_CONFIG,
    ...config
  };
  console.log('🧠 启动内存泄漏监控，配置:', finalConfig.memoryLeakConfig);
  startMemoryLeakMonitoring(finalConfig);
}

// 手动停止内存泄漏监控
export function stopMemoryLeakMonitor() {
  const defaultConfig = {
    enableConsoleLog: true,
    enableReport: true,
    thresholds: DEFAULT_THRESHOLDS,
    reportUrl: getReportUrl()
  };
  stopMemoryLeakMonitoring(defaultConfig);
}

// 获取内存泄漏统计信息
export function getMemoryLeakStats() {
  if (!memoryLeakMonitor) {
    return null;
  }

  if (memoryLeakMonitor.samples.length === 0) {
    return {
      isRunning: memoryLeakMonitor.isRunning,
      totalSamples: 0,
      monitoringDuration: Date.now() - memoryLeakMonitor.startTime,
      baselineMemory: memoryLeakMonitor.baselineMemory
        ? `${(memoryLeakMonitor.baselineMemory / 1024 / 1024).toFixed(2)}MB`
        : null
    };
  }

  const firstSample = memoryLeakMonitor.samples[0];
  const lastSample = memoryLeakMonitor.samples[memoryLeakMonitor.samples.length - 1];
  const totalGrowth = lastSample.usedJSHeapSize - firstSample.usedJSHeapSize;
  const avgMemoryUsage =
    memoryLeakMonitor.samples.reduce((sum, sample) => sum + sample.memoryUsage, 0) / memoryLeakMonitor.samples.length;
  const maxMemoryUsage = Math.max(...memoryLeakMonitor.samples.map(s => s.memoryUsage));
  const avgLeakScore =
    memoryLeakMonitor.samples.reduce((sum, sample) => sum + sample.leakScore, 0) / memoryLeakMonitor.samples.length;

  return {
    isRunning: memoryLeakMonitor.isRunning,
    totalSamples: memoryLeakMonitor.samples.length,
    monitoringDuration: Date.now() - memoryLeakMonitor.startTime,
    totalGrowth: `${(totalGrowth / 1024 / 1024).toFixed(2)}MB`,
    avgMemoryUsage: `${avgMemoryUsage.toFixed(2)}%`,
    maxMemoryUsage: `${maxMemoryUsage.toFixed(2)}%`,
    avgLeakScore: avgLeakScore.toFixed(2),
    baselineMemory: memoryLeakMonitor.baselineMemory
      ? `${(memoryLeakMonitor.baselineMemory / 1024 / 1024).toFixed(2)}MB`
      : null,
    currentMemory: `${(lastSample.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
    recentSamples: memoryLeakMonitor.samples.slice(-5) // 最近5个样本
  };
}

// ===== 新的完整内存监控功能 =====

// 获取内存信息
function getMemoryInfo(): MemoryData | null {
  if (!('performance' in window) || !('memory' in (performance as any))) {
    console.warn('Memory API is not supported in this browser');
    return null;
  }

  const memory = (performance as any).memory;
  const timestamp = Date.now();
  const usedJSHeapSize = memory.usedJSHeapSize;
  const totalJSHeapSize = memory.totalJSHeapSize;
  const jsHeapSizeLimit = memory.jsHeapSizeLimit;
  const memoryUsagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

  return {
    name: 'Memory',
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    timestamp,
    memoryUsagePercent
  };
}

// 计算内存增长率
function calculateMemoryGrowthRate(currentSample: MemoryData, previousSample: MemoryData): number {
  const timeDiff = (currentSample.timestamp - previousSample.timestamp) / 1000; // 秒
  const memoryDiff = (currentSample.usedJSHeapSize - previousSample.usedJSHeapSize) / (1024 * 1024); // MB
  return memoryDiff / timeDiff; // MB/s
}

// 检测内存泄漏
function detectMemoryLeak(samples: MemoryData[], windowSize: number): boolean {
  if (samples.length < windowSize) return false;

  const recentSamples = samples.slice(-windowSize);
  let increasingTrend = 0;
  let totalGrowthRate = 0;

  for (let i = 1; i < recentSamples.length; i++) {
    const growthRate = calculateMemoryGrowthRate(recentSamples[i], recentSamples[i - 1]);
    totalGrowthRate += growthRate;

    if (growthRate > 0) {
      increasingTrend++;
    }
  }

  const avgGrowthRate = totalGrowthRate / (recentSamples.length - 1);
  const trendPercentage = increasingTrend / (recentSamples.length - 1);

  // 如果80%以上的样本都在增长，且平均增长率超过阈值，则认为可能有内存泄漏
  return trendPercentage >= 0.8 && avgGrowthRate > 0.5;
}

// 获取内存评级
function getMemoryRating(usagePercent: number, growthRate?: number): 'good' | 'needs-improvement' | 'poor' {
  if (usagePercent > 90 || (growthRate && growthRate > 2)) return 'poor';
  if (usagePercent > 70 || (growthRate && growthRate > 1)) return 'needs-improvement';
  return 'good';
}

// 启动新的内存监控
function startMemoryMonitoring(config: WebVitalsConfig) {
  const memoryConfig = { ...DEFAULT_MEMORY_CONFIG, ...config.memoryConfig };

  if (!memoryConfig.enabled) return;

  // 检查浏览器是否支持Memory API
  if (!('performance' in window) || !('memory' in (performance as any))) {
    console.warn('Memory API is not supported in this browser');
    return;
  }

  memoryMonitor = {
    timer: null,
    samples: [],
    startTime: Date.now(),
    lastSample: null,
    isRunning: true,
    config: memoryConfig,
    leakDetected: false
  };

  const collectMemoryData = () => {
    if (!memoryMonitor || !memoryMonitor.isRunning) return;

    const memoryInfo = getMemoryInfo();
    if (!memoryInfo) return;

    // 计算增长率
    if (memoryMonitor.lastSample) {
      memoryInfo.memoryGrowthRate = calculateMemoryGrowthRate(memoryInfo, memoryMonitor.lastSample);
    }

    // 添加到样本集合
    memoryMonitor.samples.push(memoryInfo);
    memoryMonitor.lastSample = memoryInfo;

    // 限制样本数量
    if (memoryMonitor.samples.length > memoryConfig.maxSamples) {
      memoryMonitor.samples.shift();
    }

    // 检测内存泄漏
    if (memoryConfig.detectLeaks && !memoryMonitor.leakDetected) {
      const leakDetected = detectMemoryLeak(memoryMonitor.samples, memoryConfig.leakDetectionWindow);
      if (leakDetected) {
        memoryMonitor.leakDetected = true;

        const leakData: WebVitalsData = {
          name: 'MemoryLeak',
          value: Number(memoryInfo.memoryGrowthRate?.toFixed(2) || 0),
          rating: 'poor',
          delta: 0,
          id: `memory-leak-${Date.now()}`,
          navigationType: 'navigate'
        };

        // 添加内存泄漏详细信息
        (leakData as any).memoryLeakData = {
          detectedAt: Date.now(),
          currentUsage: memoryInfo.usedJSHeapSize,
          usagePercent: memoryInfo.memoryUsagePercent,
          growthRate: memoryInfo.memoryGrowthRate,
          samples: memoryMonitor.samples.slice(-5) // 最近5个样本
        };

        if (config.enableConsoleLog) {
          console.error('🚨 检测到内存泄漏!', {
            currentUsage: `${(memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2)}MB`,
            usagePercent: `${memoryInfo.memoryUsagePercent.toFixed(2)}%`,
            growthRate: `${(memoryInfo.memoryGrowthRate || 0).toFixed(2)}MB/s`
          });
        }

        handleWebVitalsData(leakData, config);
      }
    }

    // 检查是否达到监控持续时间
    const elapsed = Date.now() - memoryMonitor.startTime;
    if (elapsed >= memoryConfig.duration) {
      stopMemoryMonitoring(config);
      return;
    }

    // 检查内存使用率或增长率是否超过阈值
    if (
      memoryInfo.memoryUsagePercent > memoryConfig.usageThreshold ||
      (memoryInfo.memoryGrowthRate && memoryInfo.memoryGrowthRate > memoryConfig.growthRateThreshold)
    ) {
      const data: WebVitalsData = {
        name: 'Memory',
        value: Number(memoryInfo.memoryUsagePercent.toFixed(2)),
        rating: getMemoryRating(memoryInfo.memoryUsagePercent, memoryInfo.memoryGrowthRate),
        delta: 0,
        id: `memory-${Date.now()}`,
        navigationType: 'navigate'
      };

      // 添加详细内存信息
      (data as any).memoryData = memoryInfo;
      (data as any).memoryStats = {
        samplesCount: memoryMonitor.samples.length,
        monitoringDuration: elapsed,
        averageUsage:
          memoryMonitor.samples.reduce((sum, sample) => sum + sample.memoryUsagePercent, 0) /
          memoryMonitor.samples.length,
        maxUsage: Math.max(...memoryMonitor.samples.map(s => s.memoryUsagePercent))
      };

      handleWebVitalsData(data, config);
    }
  };

  // 立即收集一次数据
  collectMemoryData();

  // 设置定时器
  memoryMonitor.timer = setInterval(collectMemoryData, memoryConfig.interval);

  console.log('🧠 内存监控已启动，监控间隔:', memoryConfig.interval, 'ms');
}

// 停止新的内存监控
function stopMemoryMonitoring(config: WebVitalsConfig) {
  if (!memoryMonitor || !memoryMonitor.isRunning) return;

  memoryMonitor.isRunning = false;

  if (memoryMonitor.timer) {
    clearInterval(memoryMonitor.timer);
  }

  // 生成内存监控汇总报告
  if (memoryMonitor.samples.length > 0) {
    const samples = memoryMonitor.samples;
    const averageUsage = samples.reduce((sum, sample) => sum + sample.memoryUsagePercent, 0) / samples.length;
    const maxUsage = Math.max(...samples.map(s => s.memoryUsagePercent));
    const minUsage = Math.min(...samples.map(s => s.memoryUsagePercent));
    const finalUsage = samples[samples.length - 1].memoryUsagePercent;
    const initialUsage = samples[0].memoryUsagePercent;
    const totalGrowth = finalUsage - initialUsage;

    const summaryData: WebVitalsData = {
      name: 'MemorySummary',
      value: Number(averageUsage.toFixed(2)),
      rating: getMemoryRating(averageUsage),
      delta: 0,
      id: `memory-summary-${Date.now()}`,
      navigationType: 'navigate'
    };

    // 添加汇总统计信息
    (summaryData as any).memorySummary = {
      samplesCount: samples.length,
      monitoringDuration: Date.now() - memoryMonitor.startTime,
      averageUsage: Number(averageUsage.toFixed(2)),
      maxUsage: Number(maxUsage.toFixed(2)),
      minUsage: Number(minUsage.toFixed(2)),
      totalGrowth: Number(totalGrowth.toFixed(2)),
      leakDetected: memoryMonitor.leakDetected,
      finalSample: samples[samples.length - 1]
    };

    console.log('📊 内存监控汇总:', {
      averageUsage: `${averageUsage.toFixed(2)}%`,
      maxUsage: `${maxUsage.toFixed(2)}%`,
      totalGrowth: `${totalGrowth.toFixed(2)}%`,
      samplesCount: samples.length,
      leakDetected: memoryMonitor.leakDetected
    });

    handleWebVitalsData(summaryData, config);
  }

  memoryMonitor = null;
}

// 手动启动内存监控
export function startMemoryMonitor(config: WebVitalsConfig = {}) {
  const finalConfig = {
    enableConsoleLog: true,
    enableReport: true,
    thresholds: { ...DEFAULT_THRESHOLDS, memory: 80, memoryGrowthRate: 1 },
    memoryConfig: DEFAULT_MEMORY_CONFIG,
    ...config
  };
  console.log('🧠 启动内存监控，配置:', finalConfig.memoryConfig);
  startMemoryMonitoring(finalConfig);
}

// 手动停止内存监控
export function stopMemoryMonitor() {
  const defaultConfig = {
    enableConsoleLog: true,
    enableReport: true,
    thresholds: DEFAULT_THRESHOLDS,
    reportUrl: getReportUrl()
  };
  stopMemoryMonitoring(defaultConfig);
}

// 获取当前内存状态
export function getCurrentMemoryStatus() {
  const memoryInfo = getMemoryInfo();
  if (!memoryInfo) return null;

  return {
    current: memoryInfo,
    monitor: memoryMonitor
      ? {
          isRunning: memoryMonitor.isRunning,
          samplesCount: memoryMonitor.samples.length,
          leakDetected: memoryMonitor.leakDetected,
          monitoringDuration: Date.now() - memoryMonitor.startTime
        }
      : null
  };
}

// 获取内存统计信息
export function getMemoryStats() {
  if (!memoryMonitor) {
    return null;
  }

  const samples = memoryMonitor.samples;
  if (samples.length === 0) return null;

  const averageUsage = samples.reduce((sum, sample) => sum + sample.memoryUsagePercent, 0) / samples.length;
  const maxUsage = Math.max(...samples.map(s => s.memoryUsagePercent));
  const minUsage = Math.min(...samples.map(s => s.memoryUsagePercent));
  const growthRates = samples.filter(s => s.memoryGrowthRate !== undefined).map(s => s.memoryGrowthRate!);
  const averageGrowthRate =
    growthRates.length > 0 ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;

  return {
    samplesCount: samples.length,
    averageUsage: Number(averageUsage.toFixed(2)),
    maxUsage: Number(maxUsage.toFixed(2)),
    minUsage: Number(minUsage.toFixed(2)),
    averageGrowthRate: Number(averageGrowthRate.toFixed(3)),
    leakDetected: memoryMonitor.leakDetected,
    recentSamples: samples.slice(-5) // 最近5个样本
  };
}
