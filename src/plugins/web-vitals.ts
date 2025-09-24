import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

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
}

// 默认阈值配置，参考Google推荐值
const DEFAULT_THRESHOLDS = {
  lcp: 2500, // 2.5秒
  cls: 0.1, // 0.1
  fcp: 1800, // 1.8秒
  ttfb: 800, // 800毫秒
  inp: 200, // 200毫秒
  fps: 30, // 30 FPS
  longTask: 50 // 50毫秒
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

  // 其他指标（LCP、CLS、FCP、TTFB、INP）越小越好
  if (value <= threshold) return 'good';
  if (value <= threshold * 1.5) return 'needs-improvement';
  return 'poor';
}

// 格式化数值
function formatValue(value: number, metric: string): string {
  if (metric === 'CLS') {
    return value.toFixed(3);
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
    // console.log("上报数据:",JSON.stringify({
    //   ...data,
    //   timestamp: Date.now(),
    //   url: window.location.href,
    //   userAgent: navigator.userAgent,
    // }))
    if (config.reportUrl) {
      await fetch('http://localhost:3000/monitor/webvitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    }
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
    ...config
  };

  // 监控LCP (Largest Contentful Paint)
  onLCP((metric: any) => {
    const data: WebVitalsData = {
      name: 'LCP',
      value: Number(metric.value.toFixed(2)),
      rating: getRating(metric.value, finalConfig.thresholds.lcp!, 'LCP'),
      delta: Number(metric.delta.toFixed(2)),
      id: metric.id,
      navigationType: metric.navigationType
    };
    handleWebVitalsData(data, finalConfig);
  });

  // 监控CLS (Cumulative Layout Shift)
  onCLS((metric: any) => {
    const data: WebVitalsData = {
      name: 'CLS',
      value: Number(metric.value.toFixed(2)),
      rating: getRating(metric.value, finalConfig.thresholds.cls!, 'CLS'),
      delta: Number(metric.delta.toFixed(2)),
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
      delta: Number(metric.delta.toFixed(2)),
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
      delta: Number(metric.delta.toFixed(2)),
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
      delta: Number(metric.delta.toFixed(2)),
      id: metric.id,
      navigationType: metric.navigationType
    };
    handleWebVitalsData(data, finalConfig);
  });

  // 启动长任务监控
  startLongTaskMonitoring(finalConfig);

  // 启动FPS监控（可选）
  // startFPSMonitoring(finalConfig);

  console.log('🚀 Web Vitals monitoring initialized (including Long Tasks and FPS)');
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
        delta: Number(metric.delta.toFixed(2)),
        id: metric.id,
        navigationType: metric.navigationType
      });
      checkComplete();
    });

    // 收集CLS
    onCLS((metric: any) => {
      metrics.push({
        name: 'CLS',
        value: Number(metric.value.toFixed(2)),
        rating: getRating(metric.value, DEFAULT_THRESHOLDS.cls!, 'CLS'),
        delta: Number(metric.delta.toFixed(2)),
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
        delta: Number(metric.delta.toFixed(2)),
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
        delta: Number(metric.delta.toFixed(2)),
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
        delta: metric.delta,
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
        reportUrl: 'http://localhost:3000/monitor/webvitals'
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
    reportUrl: 'http://localhost:3000/monitor/webvitals'
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
