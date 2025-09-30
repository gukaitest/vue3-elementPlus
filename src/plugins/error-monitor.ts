/** 前端错误监控系统 类似web-vitals性能监控，提供全面的错误监控功能 */

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

// 默认配置
const DEFAULT_CONFIG: ErrorMonitorConfig = {
  enableConsoleLog: true,
  enableReport: false,
  reportUrl: '',
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

// 错误收集器
class ErrorCollector {
  private errors: ErrorInfo[] = [];
  private config: ErrorMonitorConfig;
  private sessionId: string;

  constructor(config: ErrorMonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    console.log('收集错误===================');
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
    if (this.config.enableConsoleLog !== false) {
      this.logToConsole(errorInfo);
    }

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
    console.log('上报错误111111111111===================');
    if (!this.config.enableReport) return;
    // 采样率检查，该代码有误
    // if (Math.random() < (this.config.sampleRate || 1)) {
    //   return;
    // }
    try {
      console.log('上报错误222222222222===================');
      // 该代码有误
      if (this.config.customReport) {
        this.config.customReport(errorInfo);
        return;
      }
      if (this.config.reportUrl) {
        // 直接使用 ErrorInfo 接口的字段名
        const reportData = {
          ...errorInfo,
          customData: errorInfo.customData || this.config.customData || {}
        };

        await fetch(this.config.reportUrl, {
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
      console.log('设置资源错误监控111===================');
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
        console.log('设置资源错误监控222===================');
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

// Default export for module resolution
export default {
  setupErrorMonitor,
  setupVueErrorHandler,
  setupAxiosErrorHandler,
  reportCustomError,
  getErrorStats,
  clearErrors,
  updateErrorMonitorConfig,
  ErrorType,
  ErrorLevel
};
