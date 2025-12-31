/** 前端错误监控系统 类似web-vitals性能监控，提供全面的错误监控功能 */

// 获取错误监控上报 URL（根据环境变量动态配置）
const getReportUrl = (): string => {
  return import.meta.env.VITE_ERROR_MONITOR_REPORT_URL || 'http://localhost:3000/monitor/errors-batch';
};

// 错误类型枚举
export enum ErrorType {
  JAVASCRIPT = 'javascript',
  VUE = 'vue',
  PROMISE = 'promise',
  RESOURCE = 'resource',
  AJAX = 'ajax',
  CUSTOM = 'custom'
}

// 错误级别
export enum ErrorLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 错误信息接口
export interface ErrorInfo {
  // 基础信息
  type: ErrorType;
  level?: ErrorLevel;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;

  // 上下文信息
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;

  // 额外信息
  componentName?: string;
  componentStack?: string;
  propsData?: any;
  route?: string;
  routeParams?: any;
  routeQuery?: any;

  // 资源错误信息
  resourceType?: string;
  resourceUrl?: string;

  // 请求错误信息
  requestUrl?: string;
  requestMethod?: string;
  requestData?: any;
  responseStatus?: number;
  responseData?: any;

  // 自定义信息
  customData?: any;

  // 错误ID（用于去重）
  errorId?: string;
}

// 错误监控配置
export interface ErrorMonitorConfig {
  // 基础配置
  enableConsoleLog?: boolean;
  enableReport?: boolean;
  reportUrl?: string;
  customReport?: (errorInfo: ErrorInfo) => void;

  // 批量上报配置
  batchConfig?: {
    // 是否启用批量上报
    enabled?: boolean;
    // 批量大小，达到该数量后立即上报
    batchSize?: number;
    // 批量上报间隔（毫秒），超时后自动上报
    batchInterval?: number;
    // 批量上报URL，默认使用 reportUrl（环境变量中应配置完整的批量上报路径）
    batchReportUrl?: string;
  };

  // 错误过滤
  ignoreErrors?: (string | RegExp)[];
  ignoreUrls?: (string | RegExp)[];
  maxErrors?: number; // 最大错误数量，防止内存溢出

  // 采样率
  sampleRate?: number; // 0-1，错误上报采样率

  // 用户信息
  userId?: string;
  sessionId?: string;

  // 自定义配置
  customData?: any;

  // 错误级别配置
  levelConfig?: {
    [key in ErrorType]?: ErrorLevel;
  };
}

// 默认批量上报配置
const DEFAULT_BATCH_CONFIG = {
  enabled: true, // 默认启用批量上报
  batchSize: 10, // 达到10条数据后上报
  batchInterval: 1000 * 120 // 120秒超时上报
};

// 默认配置
const DEFAULT_CONFIG: ErrorMonitorConfig = {
  enableConsoleLog: true,
  enableReport: false,
  reportUrl: '',
  batchConfig: DEFAULT_BATCH_CONFIG,
  ignoreErrors: [],
  ignoreUrls: [],
  maxErrors: 100,
  sampleRate: 1,
  userId: '',
  sessionId: '',
  customData: {},
  levelConfig: {
    [ErrorType.JAVASCRIPT]: ErrorLevel.HIGH,
    [ErrorType.VUE]: ErrorLevel.HIGH,
    [ErrorType.PROMISE]: ErrorLevel.MEDIUM,
    [ErrorType.RESOURCE]: ErrorLevel.MEDIUM,
    [ErrorType.AJAX]: ErrorLevel.MEDIUM,
    [ErrorType.CUSTOM]: ErrorLevel.LOW
  }
};

// 批量上报队列接口
interface BatchReportQueue {
  queue: ErrorInfo[];
  timer: number | null;
  config: typeof DEFAULT_BATCH_CONFIG & { batchReportUrl?: string };
  isEnabled: boolean;
}

// 错误收集器
class ErrorCollector {
  private errors: ErrorInfo[] = [];
  private config: ErrorMonitorConfig;
  private sessionId: string;
  private batchReportQueue: BatchReportQueue | null = null;

  constructor(config: ErrorMonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.initBatchReportQueue();
    this.setupPageUnloadHandler();
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 初始化批量上报队列
  private initBatchReportQueue(): void {
    const batchConfig = { ...DEFAULT_BATCH_CONFIG, ...this.config.batchConfig };

    if (!batchConfig.enabled) return;

    // 如果已经初始化过，先清理
    if (this.batchReportQueue) {
      this.clearBatchReportQueue();
    }

    const reportUrl = this.config.reportUrl || getReportUrl();
    const batchReportUrl = batchConfig.batchReportUrl || reportUrl;

    this.batchReportQueue = {
      queue: [],
      timer: null,
      config: {
        ...batchConfig,
        batchReportUrl
      },
      isEnabled: true
    };

    if (this.config.enableConsoleLog) {
      console.log('📦 错误监控批量上报队列已初始化，配置:', {
        batchSize: batchConfig.batchSize,
        batchInterval: batchConfig.batchInterval,
        batchReportUrl
      });
    }
  }

  // 执行批量上报
  private async flushBatchReport(): Promise<void> {
    if (!this.batchReportQueue || this.batchReportQueue.queue.length === 0) return;

    const { queue, config } = this.batchReportQueue;
    const dataToReport = [...queue];

    // 清空队列
    this.batchReportQueue.queue = [];

    // 清除定时器
    if (this.batchReportQueue.timer !== null) {
      clearTimeout(this.batchReportQueue.timer);
      this.batchReportQueue.timer = null;
    }

    try {
      if (this.config.enableConsoleLog) {
        console.log(`📤 批量上报 ${dataToReport.length} 条错误数据到:`, config.batchReportUrl);
      }

      await fetch(config.batchReportUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batch: dataToReport,
          batchSize: dataToReport.length,
          batchTimestamp: Date.now()
        })
      });

      if (this.config.enableConsoleLog) {
        console.log(`✅ 批量上报成功: ${dataToReport.length} 条数据`);
      }
    } catch (error) {
      console.error('❌ 批量上报失败:', error);
    }
  }

  // 添加数据到批量队列
  private addToBatchQueue(errorInfo: ErrorInfo): void {
    if (!this.batchReportQueue || !this.batchReportQueue.isEnabled) return;

    this.batchReportQueue.queue.push(errorInfo);

    if (this.config.enableConsoleLog) {
      console.log(
        `📝 添加错误到批量队列，当前队列长度: ${this.batchReportQueue.queue.length}/${this.batchReportQueue.config.batchSize}`
      );
    }

    // 检查是否达到批量大小
    if (this.batchReportQueue.queue.length >= this.batchReportQueue.config.batchSize) {
      if (this.config.enableConsoleLog) {
        console.log('📦 批量队列已满，立即上报');
      }
      this.flushBatchReport();
      return;
    }

    // 设置定时器，超时后自动上报
    if (this.batchReportQueue.timer === null) {
      this.batchReportQueue.timer = window.setTimeout(() => {
        if (this.batchReportQueue && this.batchReportQueue.queue.length > 0) {
          if (this.config.enableConsoleLog) {
            console.log('⏰ 批量上报超时，执行上报');
          }
          this.flushBatchReport();
        }
      }, this.batchReportQueue.config.batchInterval);
    }
  }

  // 清理批量上报队列
  private clearBatchReportQueue(): void {
    if (!this.batchReportQueue) return;

    // 如果还有数据，先上报
    if (this.batchReportQueue.queue.length > 0) {
      if (this.config.enableConsoleLog) {
        console.log('🧹 清理批量队列前先上报剩余数据');
      }
      this.flushBatchReport();
    }

    // 清除定时器
    if (this.batchReportQueue.timer !== null) {
      clearTimeout(this.batchReportQueue.timer);
    }

    this.batchReportQueue = null;
  }

  // 设置页面卸载处理
  private setupPageUnloadHandler(): void {
    // 监听页面卸载事件，确保批量数据被上报
    window.addEventListener('beforeunload', () => {
      if (this.batchReportQueue && this.batchReportQueue.queue.length > 0) {
        // 使用 sendBeacon 在页面卸载时可靠地发送数据
        const batchReportUrl = this.batchReportQueue.config.batchReportUrl;
        if (batchReportUrl) {
          const data = JSON.stringify({
            batch: this.batchReportQueue.queue,
            batchSize: this.batchReportQueue.queue.length,
            batchTimestamp: Date.now()
          });
          navigator.sendBeacon(batchReportUrl, data);
          if (this.config.enableConsoleLog) {
            console.log('📤 页面卸载时使用 sendBeacon 上报剩余错误数据');
          }
        }
      }
    });

    // 监听页面可见性变化，在页面隐藏时上报批量数据
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.batchReportQueue && this.batchReportQueue.queue.length > 0) {
        this.flushBatchReport();
      }
    });
  }

  // 生成错误ID
  private generateErrorId(errorInfo: ErrorInfo): string {
    const key = `${errorInfo.type}_${errorInfo.message}_${errorInfo.filename}_${errorInfo.lineno}`;

    // 处理包含非Latin1字符的字符串
    try {
      // 先尝试直接使用btoa
      return btoa(key)
        .replace(/[^a-zA-Z0-9]/g, '')
        .substr(0, 16);
    } catch (error) {
      // 如果btoa失败，使用encodeURIComponent + btoa的方式
      const encodedKey = encodeURIComponent(key);
      return btoa(encodedKey)
        .replace(/[^a-zA-Z0-9]/g, '')
        .substr(0, 16);
    }
  }

  // 检查是否应该忽略错误
  private shouldIgnoreError(errorInfo: ErrorInfo): boolean {
    const { ignoreErrors = [], ignoreUrls = [] } = this.config;

    // 检查错误消息
    if (ignoreErrors.length > 0) {
      const shouldIgnore = ignoreErrors.some(pattern => {
        if (typeof pattern === 'string') {
          return errorInfo.message.includes(pattern);
        }
        return pattern.test(errorInfo.message);
      });
      if (shouldIgnore) return true;
    }

    // 检查URL
    if (ignoreUrls.length > 0) {
      const shouldIgnore = ignoreUrls.some(pattern => {
        if (typeof pattern === 'string') {
          return errorInfo.url.includes(pattern);
        }
        return pattern.test(errorInfo.url);
      });
      if (shouldIgnore) return true;
    }

    return false;
  }

  // 收集错误
  collect(errorInfo: ErrorInfo): void {
    // 检查是否应该忽略
    if (this.shouldIgnoreError(errorInfo)) {
      return;
    }
    // 添加基础信息
    errorInfo.timestamp = Date.now();
    errorInfo.url = window.location.href;
    errorInfo.userAgent = navigator.userAgent;
    errorInfo.sessionId = this.sessionId;
    errorInfo.userId = this.config.userId || '';
    errorInfo.errorId = this.generateErrorId(errorInfo);

    // 设置错误级别
    if (!errorInfo.level) {
      errorInfo.level = this.config.levelConfig?.[errorInfo.type] || ErrorLevel.MEDIUM;
    }

    // 检查最大错误数量
    if (this.errors.length >= (this.config.maxErrors || 100)) {
      this.errors.shift(); // 移除最旧的错误
    }

    this.errors.push(errorInfo);

    // 输出到控制台
    // if (this.config.enableConsoleLog !== false) {
    //   this.logToConsole(errorInfo);
    // }

    // 上报错误
    this.reportError(errorInfo);
  }

  // 输出到控制台
  private logToConsole(errorInfo: ErrorInfo): void {
    const { type, level, message, stack, filename, lineno, colno } = errorInfo;

    console.group(`🚨 Error Monitor [${type.toUpperCase()}] - ${level?.toUpperCase() || 'UNKNOWN'}`);
    console.error('Message:', message);
    console.error('Type:', type);
    console.error('Level:', level);
    console.error('Timestamp:', new Date(errorInfo.timestamp).toISOString());
    console.error('URL:', errorInfo.url);

    if (filename) {
      console.error('File:', filename);
    }
    if (lineno) {
      console.error('Line:', lineno);
    }
    if (colno) {
      console.error('Column:', colno);
    }
    if (stack) {
      console.error('Stack:', stack);
    }

    if (errorInfo.componentName) {
      console.error('Component:', errorInfo.componentName);
    }
    if (errorInfo.route) {
      console.error('Route:', errorInfo.route);
    }
    if (errorInfo.requestUrl) {
      console.error('Request URL:', errorInfo.requestUrl);
    }
    if (errorInfo.resourceUrl) {
      console.error('Resource URL:', errorInfo.resourceUrl);
    }

    console.groupEnd();
  }

  // 上报错误
  private async reportError(errorInfo: ErrorInfo): Promise<void> {
    if (!this.config.enableReport) return;

    // 采样率检查
    if (Math.random() > (this.config.sampleRate || 1)) {
      return;
    }

    try {
      // 优先使用自定义上报函数
      if (this.config.customReport) {
        this.config.customReport(errorInfo);
        return;
      }

      // 检查是否启用批量上报
      const batchConfig = { ...DEFAULT_BATCH_CONFIG, ...this.config.batchConfig };
      if (batchConfig.enabled && this.batchReportQueue) {
        // 使用批量上报
        const reportData = {
          ...errorInfo,
          customData: errorInfo.customData || this.config.customData || {}
        };
        this.addToBatchQueue(reportData);
        return;
      }

      // 使用单个上报
      const reportUrl = this.config.reportUrl || getReportUrl();
      if (reportUrl) {
        const reportData = {
          ...errorInfo,
          customData: errorInfo.customData || this.config.customData || {}
        };

        await fetch(reportUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reportData)
        });
      }
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  // 获取所有错误
  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  // 清空错误
  clearErrors(): void {
    this.errors = [];
  }

  // 更新配置
  updateConfig(config: Partial<ErrorMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 获取批量队列状态
  getBatchQueueStatus(): {
    isEnabled: boolean;
    queueLength: number;
    batchSize: number;
    batchInterval: number;
    batchReportUrl: string | null;
  } {
    if (!this.batchReportQueue) {
      return {
        isEnabled: false,
        queueLength: 0,
        batchSize: 0,
        batchInterval: 0,
        batchReportUrl: null
      };
    }

    return {
      isEnabled: this.batchReportQueue.isEnabled,
      queueLength: this.batchReportQueue.queue.length,
      batchSize: this.batchReportQueue.config.batchSize,
      batchInterval: this.batchReportQueue.config.batchInterval,
      batchReportUrl: this.batchReportQueue.config.batchReportUrl || null
    };
  }

  // 手动触发批量上报
  flushBatchReportManually(): void {
    if (!this.batchReportQueue) {
      console.warn('批量上报队列未初始化');
      return;
    }

    if (this.batchReportQueue.queue.length === 0) {
      console.log('批量队列为空，无需上报');
      return;
    }

    console.log('🚀 手动触发批量上报');
    this.flushBatchReport();
  }
}

// 全局错误收集器实例
let errorCollector: ErrorCollector;

// 初始化错误监控
export function setupErrorMonitor(config: ErrorMonitorConfig = {}): void {
  errorCollector = new ErrorCollector(config);

  // 设置全局JS错误监控
  setupGlobalErrorHandler();

  // 设置Promise错误监控
  setupPromiseErrorHandler();

  // 设置资源错误监控
  setupResourceErrorHandler();

  console.log('🚀 Error Monitor initialized');
}

// 设置全局JS错误监控
function setupGlobalErrorHandler(): void {
  // 捕获同步错误
  window.onerror = (message, filename, lineno, colno, error) => {
    const errorInfo: ErrorInfo = {
      type: ErrorType.JAVASCRIPT,
      message: String(message),
      filename: String(filename),
      lineno: Number(lineno),
      colno: Number(colno),
      stack: error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    errorCollector.collect(errorInfo);

    // 返回false让错误继续传播
    return false;
  };

  // 捕获异步错误
  window.addEventListener('error', event => {
    const errorInfo: ErrorInfo = {
      type: ErrorType.JAVASCRIPT,
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    errorCollector.collect(errorInfo);
  });
}

// 设置Promise错误监控
function setupPromiseErrorHandler(): void {
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    let message = 'Unhandled Promise Rejection';
    let stack = '';

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || '';
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = JSON.stringify(error);
    }

    const errorInfo: ErrorInfo = {
      type: ErrorType.PROMISE,
      message,
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    errorCollector.collect(errorInfo);
  });
}

// 设置资源错误监控
function setupResourceErrorHandler(): void {
  window.addEventListener(
    'error',
    event => {
      const target = event.target as HTMLElement;

      // 检查是否是资源加载错误
      if (target && target.nodeName && target.nodeName !== 'HTML' && target.nodeName !== 'BODY') {
        const resourceType = target.nodeName.toLowerCase();
        const resourceUrl = (target as any).src || (target as any).href || '';

        const errorInfo: ErrorInfo = {
          type: ErrorType.RESOURCE,
          message: `Failed to load ${resourceType}: ${resourceUrl}`,
          resourceType,
          resourceUrl,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        };
        errorCollector.collect(errorInfo);
      }
    },
    true
  ); // 使用捕获阶段
}

// 设置Vue错误监控
export function setupVueErrorHandler(app: any): void {
  app.config.errorHandler = (error: Error, instance: any, info: string) => {
    const errorInfo: ErrorInfo = {
      type: ErrorType.VUE,
      message: error.message,
      stack: error.stack,
      componentName: instance?.$options?.name || instance?.$options?._componentTag || 'Unknown',
      componentStack: info,
      propsData: instance?.$props,
      route: instance?.$route?.path,
      routeParams: instance?.$route?.params,
      routeQuery: instance?.$route?.query,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    errorCollector.collect(errorInfo);
  };
}

// 设置Axios错误监控
export function setupAxiosErrorHandler(axiosInstance: any): void {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config: any) => {
      // 在请求配置中添加时间戳
      config._requestStartTime = Date.now();
      return config;
    },
    (error: any) => {
      const errorInfo: ErrorInfo = {
        type: ErrorType.AJAX,
        message: `Request Error: ${error.message}`,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        requestData: error.config?.data,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      errorCollector.collect(errorInfo);
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response: any) => {
      return response;
    },
    (error: any) => {
      const requestDuration = error.config?._requestStartTime ? Date.now() - error.config._requestStartTime : 0;

      const errorInfo: ErrorInfo = {
        type: ErrorType.AJAX,
        message: `Response Error: ${error.message}`,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        requestData: error.config?.data,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        customData: {
          requestDuration,
          timeout: error.code === 'ECONNABORTED'
        },
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      errorCollector.collect(errorInfo);
      return Promise.reject(error);
    }
  );
}

// 手动上报自定义错误
export function reportCustomError(message: string, customData?: any, level: ErrorLevel = ErrorLevel.LOW): void {
  // 从 customData 中提取错误类型，如果没有则默认为 CUSTOM
  const errorType = customData?.errorType || ErrorType.CUSTOM;

  const errorInfo: ErrorInfo = {
    type: errorType,
    message,
    customData,
    level,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  };

  errorCollector.collect(errorInfo);
}

// 获取错误统计信息
export function getErrorStats(): {
  total: number;
  byType: Record<ErrorType, number>;
  byLevel: Record<ErrorLevel, number>;
  recent: ErrorInfo[];
} {
  const errors = errorCollector.getErrors();
  const byType = {} as Record<ErrorType, number>;
  const byLevel = {} as Record<ErrorLevel, number>;

  // 初始化计数器
  Object.values(ErrorType).forEach(type => {
    byType[type] = 0;
  });
  Object.values(ErrorLevel).forEach(level => {
    byLevel[level] = 0;
  });

  // 统计错误
  errors.forEach(error => {
    byType[error.type]++;
    if (error.level) {
      byLevel[error.level]++;
    }
  });

  return {
    total: errors.length,
    byType,
    byLevel,
    recent: errors.slice(-10) // 最近10个错误
  };
}

// 清空错误记录
export function clearErrors(): void {
  errorCollector.clearErrors();
}

// 更新配置
export function updateErrorMonitorConfig(config: Partial<ErrorMonitorConfig>): void {
  errorCollector.updateConfig(config);
}

// 获取批量队列状态
export function getErrorBatchQueueStatus(): {
  isEnabled: boolean;
  queueLength: number;
  batchSize: number;
  batchInterval: number;
  batchReportUrl: string | null;
} {
  if (!errorCollector) {
    return {
      isEnabled: false,
      queueLength: 0,
      batchSize: 0,
      batchInterval: 0,
      batchReportUrl: null
    };
  }
  return errorCollector.getBatchQueueStatus();
}

// 手动触发批量上报
export function flushErrorBatchReport(): void {
  if (!errorCollector) {
    console.warn('错误监控器未初始化');
    return;
  }
  errorCollector.flushBatchReportManually();
}

// Default export for module resolution
export default {
  setupErrorMonitor,
  setupVueErrorHandler,
  setupAxiosErrorHandler,
  reportCustomError,
  getErrorStats,
  clearErrors,
  updateErrorMonitorConfig,
  getErrorBatchQueueStatus,
  flushErrorBatchReport,
  ErrorType,
  ErrorLevel
};
