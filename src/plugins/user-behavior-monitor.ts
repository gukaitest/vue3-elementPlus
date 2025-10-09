/** 用户行为监控系统 类似web-vitals性能监控和错误监控，提供全面的用户行为监控功能 */

// 用户行为类型枚举
export enum UserBehaviorType {
  CLICK = 'click',
  SCROLL = 'scroll',
  INPUT = 'input',
  FOCUS = 'focus',
  BLUR = 'blur',
  RESIZE = 'resize',
  NAVIGATION = 'navigation',
  PAGE_VIEW = 'page_view',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  CUSTOM = 'custom'
}

// 用户行为级别
export enum UserBehaviorLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 用户行为数据接口
export interface UserBehaviorData {
  // 基础信息
  type: UserBehaviorType;
  level?: UserBehaviorLevel;
  action: string;
  target?: string;
  value?: any;

  // 位置信息
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scrollX?: number;
  scrollY?: number;

  // 元素信息
  elementTag?: string;
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  elementHref?: string;
  elementSrc?: string;

  // 上下文信息
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  pageLoadTime?: number;

  // 路由信息
  route?: string;
  routeParams?: any;
  routeQuery?: any;
  previousRoute?: string;

  // 页面信息
  pageTitle?: string;
  referrer?: string;
  viewportWidth?: number;
  viewportHeight?: number;

  // 设备信息
  deviceType?: string;
  browserType?: string;
  osType?: string;

  // 自定义信息
  customData?: any;

  // 行为ID（用于去重和关联）
  behaviorId?: string;
  parentBehaviorId?: string;
}

// 用户行为监控配置
export interface UserBehaviorMonitorConfig {
  // 基础配置
  enableConsoleLog?: boolean;
  enableReport?: boolean;
  reportUrl?: string;
  customReport?: (behaviorData: UserBehaviorData) => void;

  // 行为过滤
  ignoreBehaviors?: (string | RegExp)[];
  ignoreElements?: (string | RegExp)[];
  maxBehaviors?: number; // 最大行为数量，防止内存溢出

  // 采样率
  sampleRate?: number; // 0-1，行为上报采样率

  // 用户信息
  userId?: string;
  sessionId?: string;

  // 自定义配置
  customData?: any;

  // 行为级别配置
  levelConfig?: {
    [key in UserBehaviorType]?: UserBehaviorLevel;
  };

  // 监控配置
  monitorConfig?: {
    // 点击监控
    click?: {
      enabled?: boolean;
      debounceTime?: number; // 防抖时间
      trackText?: boolean; // 是否记录元素文本
      trackPosition?: boolean; // 是否记录位置信息
    };
    // 滚动监控
    scroll?: {
      enabled?: boolean;
      throttleTime?: number; // 节流时间
      trackDirection?: boolean; // 是否记录滚动方向
      trackSpeed?: boolean; // 是否记录滚动速度
    };
    // 输入监控
    input?: {
      enabled?: boolean;
      debounceTime?: number;
      trackValue?: boolean; // 是否记录输入值
      sensitiveFields?: string[]; // 敏感字段，不记录值
    };
    // 焦点监控
    focus?: {
      enabled?: boolean;
      trackBlur?: boolean; // 是否监控失焦事件
    };
    // 页面监控
    page?: {
      enabled?: boolean;
      trackPageView?: boolean; // 是否监控页面浏览
      trackNavigation?: boolean; // 是否监控路由导航
      trackResize?: boolean; // 是否监控窗口大小变化
    };
    // 会话监控
    session?: {
      enabled?: boolean;
      sessionTimeout?: number; // 会话超时时间（毫秒）
      trackSessionStart?: boolean;
      trackSessionEnd?: boolean;
    };
  };
}

// 默认配置
const DEFAULT_CONFIG: UserBehaviorMonitorConfig = {
  enableConsoleLog: true,
  enableReport: false,
  reportUrl: '',
  ignoreBehaviors: [],
  ignoreElements: [],
  maxBehaviors: 1000,
  sampleRate: 1,
  userId: '',
  sessionId: '',
  customData: {},
  levelConfig: {
    [UserBehaviorType.CLICK]: UserBehaviorLevel.MEDIUM,
    [UserBehaviorType.SCROLL]: UserBehaviorLevel.LOW,
    [UserBehaviorType.INPUT]: UserBehaviorLevel.MEDIUM,
    [UserBehaviorType.FOCUS]: UserBehaviorLevel.LOW,
    [UserBehaviorType.BLUR]: UserBehaviorLevel.LOW,
    [UserBehaviorType.RESIZE]: UserBehaviorLevel.LOW,
    [UserBehaviorType.NAVIGATION]: UserBehaviorLevel.HIGH,
    [UserBehaviorType.PAGE_VIEW]: UserBehaviorLevel.HIGH,
    [UserBehaviorType.SESSION_START]: UserBehaviorLevel.HIGH,
    [UserBehaviorType.SESSION_END]: UserBehaviorLevel.HIGH,
    [UserBehaviorType.CUSTOM]: UserBehaviorLevel.LOW
  },
  monitorConfig: {
    click: {
      enabled: true,
      debounceTime: 300,
      trackText: true,
      trackPosition: true
    },
    scroll: {
      enabled: true,
      throttleTime: 100,
      trackDirection: true,
      trackSpeed: false
    },
    input: {
      enabled: true,
      debounceTime: 500,
      trackValue: false,
      sensitiveFields: ['password', 'pwd', 'secret', 'token', 'key']
    },
    focus: {
      enabled: true,
      trackBlur: true
    },
    page: {
      enabled: true,
      trackPageView: true,
      trackNavigation: true,
      trackResize: true
    },
    session: {
      enabled: true,
      sessionTimeout: 30 * 60 * 1000, // 30分钟
      trackSessionStart: true,
      trackSessionEnd: true
    }
  }
};

// 用户行为收集器
class UserBehaviorCollector {
  private behaviors: UserBehaviorData[] = [];
  private config: UserBehaviorMonitorConfig;
  private sessionId: string;
  public sessionStartTime: number;
  private lastActivityTime: number;
  private sessionTimer: number | null = null;
  private scrollTimer: number | null = null;
  public inputTimers: Map<string, number> = new Map();

  constructor(config: UserBehaviorMonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.setupSessionMonitoring();
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成行为ID（纯数字格式）
  private generateBehaviorId(behaviorData: UserBehaviorData): string {
    // 使用时间戳（13位）+ 随机数（6位）生成纯数字ID
    const timestamp = behaviorData.timestamp || Date.now();
    const randomNum = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `${timestamp}${randomNum}`;
  }

  // 检查是否应该忽略行为
  private shouldIgnoreBehavior(behaviorData: UserBehaviorData): boolean {
    const { ignoreBehaviors = [], ignoreElements = [] } = this.config;

    // 检查行为类型
    if (ignoreBehaviors.length > 0) {
      const shouldIgnore = ignoreBehaviors.some(pattern => {
        if (typeof pattern === 'string') {
          return behaviorData.action.includes(pattern) || behaviorData.target?.includes(pattern);
        }
        return pattern.test(behaviorData.action) || pattern.test(behaviorData.target || '');
      });
      if (shouldIgnore) return true;
    }

    // 检查元素
    if (ignoreElements.length > 0 && behaviorData.target) {
      const shouldIgnore = ignoreElements.some(pattern => {
        if (typeof pattern === 'string') {
          return behaviorData.target!.includes(pattern);
        }
        return pattern.test(behaviorData.target!);
      });
      if (shouldIgnore) return true;
    }

    return false;
  }

  // 收集用户行为
  collect(behaviorData: UserBehaviorData): void {
    // 检查是否应该忽略
    if (this.shouldIgnoreBehavior(behaviorData)) {
      return;
    }

    // 添加基础信息
    behaviorData.timestamp = Date.now();
    behaviorData.url = window.location.href;
    behaviorData.userAgent = navigator.userAgent;
    behaviorData.sessionId = this.sessionId;
    behaviorData.userId = this.config.userId || '';
    behaviorData.behaviorId = this.generateBehaviorId(behaviorData);
    behaviorData.pageLoadTime = Number(performance.now().toFixed(2));

    // 设置行为级别
    if (!behaviorData.level) {
      behaviorData.level = this.config.levelConfig?.[behaviorData.type] || UserBehaviorLevel.MEDIUM;
    }

    // 检查最大行为数量
    if (this.behaviors.length >= (this.config.maxBehaviors || 1000)) {
      this.behaviors.shift(); // 移除最旧的行为
    }

    this.behaviors.push(behaviorData);
    this.lastActivityTime = Date.now();

    // 输出到控制台
    if (this.config.enableConsoleLog !== false) {
      this.logToConsole(behaviorData);
    }

    // 上报行为
    this.reportBehavior(behaviorData);
  }

  // 输出到控制台
  private logToConsole(behaviorData: UserBehaviorData): void {
    const { type, level, action, target, value, x, y } = behaviorData;

    console.group(`👤 User Behavior [${type.toUpperCase()}] - ${level?.toUpperCase() || 'UNKNOWN'}`);
    console.log('Action:', action);
    console.log('Type:', type);
    console.log('Level:', level);
    console.log('Timestamp:', new Date(behaviorData.timestamp).toISOString());
    console.log('URL:', behaviorData.url);

    if (target) {
      console.log('Target:', target);
    }
    if (value !== undefined) {
      console.log('Value:', value);
    }
    if (x !== undefined && y !== undefined) {
      console.log('Position:', `(${x}, ${y})`);
    }
    if (behaviorData.elementTag) {
      console.log('Element Tag:', behaviorData.elementTag);
    }
    if (behaviorData.elementId) {
      console.log('Element ID:', behaviorData.elementId);
    }
    if (behaviorData.elementClass) {
      console.log('Element Class:', behaviorData.elementClass);
    }
    if (behaviorData.route) {
      console.log('Route:', behaviorData.route);
    }

    console.groupEnd();
  }

  // 上报行为
  private async reportBehavior(behaviorData: UserBehaviorData): Promise<void> {
    if (!this.config.enableReport) return;

    // 采样率检查
    if (Math.random() > (this.config.sampleRate || 1)) {
      return;
    }

    try {
      if (this.config.customReport) {
        this.config.customReport(behaviorData);
        return;
      }

      if (this.config.reportUrl) {
        const reportData = {
          ...behaviorData,
          customData: behaviorData.customData || this.config.customData || {}
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
      console.error('Failed to report user behavior:', error);
    }
  }

  // 获取所有行为
  getBehaviors(): UserBehaviorData[] {
    return [...this.behaviors];
  }

  // 清空行为记录
  clearBehaviors(): void {
    this.behaviors = [];
  }

  // 更新配置
  updateConfig(config: Partial<UserBehaviorMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 获取配置
  getConfig(): UserBehaviorMonitorConfig {
    return this.config;
  }

  // 设置会话监控
  private setupSessionMonitoring(): void {
    if (!this.config.monitorConfig?.session?.enabled) return;

    const sessionTimeout = this.config.monitorConfig.session.sessionTimeout || 30 * 60 * 1000;

    // 记录会话开始
    if (this.config.monitorConfig.session.trackSessionStart) {
      this.collect({
        type: UserBehaviorType.SESSION_START,
        action: 'session_start',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });
    }

    // 监控会话超时
    const checkSessionTimeout = () => {
      const now = Date.now();
      if (now - this.lastActivityTime > sessionTimeout) {
        // 会话超时，记录会话结束
        if (this.config.monitorConfig?.session?.trackSessionEnd) {
          this.collect({
            type: UserBehaviorType.SESSION_END,
            action: 'session_end',
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: now,
            customData: {
              sessionDuration: now - this.sessionStartTime,
              reason: 'timeout'
            }
          });
        }
        // 重新开始会话
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = now;
        this.lastActivityTime = now;
      }
    };

    this.sessionTimer = window.setInterval(checkSessionTimeout, 60000); // 每分钟检查一次

    // 页面卸载时记录会话结束
    window.addEventListener('beforeunload', () => {
      if (this.config.monitorConfig?.session?.trackSessionEnd) {
        this.collect({
          type: UserBehaviorType.SESSION_END,
          action: 'session_end',
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          customData: {
            sessionDuration: Date.now() - this.sessionStartTime,
            reason: 'page_unload'
          }
        });
      }
    });
  }

  // 清理资源
  destroy(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    this.inputTimers.forEach(timer => clearTimeout(timer));
    this.inputTimers.clear();
  }
}

// 全局用户行为收集器实例
let userBehaviorCollector: UserBehaviorCollector;

// 初始化用户行为监控
export function setupUserBehaviorMonitor(config: UserBehaviorMonitorConfig = {}): void {
  userBehaviorCollector = new UserBehaviorCollector(config);

  // 设置各种行为监控
  setupClickMonitoring();
  setupScrollMonitoring();
  setupInputMonitoring();
  setupFocusMonitoring();
  setupPageMonitoring();

  console.log('🚀 User Behavior Monitor initialized');
}

// 设置点击监控
function setupClickMonitoring(): void {
  if (!userBehaviorCollector.getConfig().monitorConfig?.click?.enabled) return;

  const debounceTime = userBehaviorCollector.getConfig().monitorConfig?.click?.debounceTime || 300;
  let clickTimer: number | null = null;

  document.addEventListener('click', (event: MouseEvent) => {
    if (clickTimer) {
      clearTimeout(clickTimer);
    }

    clickTimer = window.setTimeout(() => {
      const target = event.target as HTMLElement;
      const behaviorData: UserBehaviorData = {
        type: UserBehaviorType.CLICK,
        action: 'click',
        target: target.tagName.toLowerCase(),
        x: event.clientX,
        y: event.clientY,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      // 记录元素信息
      if (userBehaviorCollector.getConfig().monitorConfig?.click?.trackText) {
        behaviorData.elementText = target.textContent?.trim().substring(0, 100);
      }

      if (userBehaviorCollector.getConfig().monitorConfig?.click?.trackPosition) {
        const rect = target.getBoundingClientRect();
        behaviorData.width = rect.width;
        behaviorData.height = rect.height;
        behaviorData.scrollX = window.scrollX;
        behaviorData.scrollY = window.scrollY;
      }

      // 记录元素属性
      if (target.id) behaviorData.elementId = target.id;
      if (target.className) behaviorData.elementClass = target.className;
      if (target.tagName) behaviorData.elementTag = target.tagName.toLowerCase();
      if ((target as any).href) behaviorData.elementHref = (target as any).href;
      if ((target as any).src) behaviorData.elementSrc = (target as any).src;

      userBehaviorCollector.collect(behaviorData);
    }, debounceTime);
  });
}

// 设置滚动监控
function setupScrollMonitoring(): void {
  if (!userBehaviorCollector.getConfig().monitorConfig?.scroll?.enabled) return;

  const throttleTime = userBehaviorCollector.getConfig().monitorConfig?.scroll?.throttleTime || 100;
  let scrollTimer: number | null = null;
  let lastScrollY = window.scrollY;
  let lastScrollTime = Date.now();

  window.addEventListener('scroll', () => {
    if (scrollTimer) return;

    scrollTimer = window.setTimeout(() => {
      const currentScrollY = window.scrollY;
      const currentTime = Date.now();
      const behaviorData: UserBehaviorData = {
        type: UserBehaviorType.SCROLL,
        action: 'scroll',
        target: 'window',
        scrollY: currentScrollY,
        scrollX: window.scrollX,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: currentTime
      };

      // 记录滚动方向
      if (userBehaviorCollector.getConfig().monitorConfig?.scroll?.trackDirection) {
        behaviorData.customData = {
          direction: currentScrollY > lastScrollY ? 'down' : 'up',
          deltaY: currentScrollY - lastScrollY
        };
      }

      // 记录滚动速度
      if (userBehaviorCollector.getConfig().monitorConfig?.scroll?.trackSpeed) {
        const timeDelta = currentTime - lastScrollTime;
        const speed = Math.abs(currentScrollY - lastScrollY) / timeDelta;
        behaviorData.customData = {
          ...behaviorData.customData,
          speed
        };
      }

      userBehaviorCollector.collect(behaviorData);

      lastScrollY = currentScrollY;
      lastScrollTime = currentTime;
      scrollTimer = null;
    }, throttleTime);
  });
}

// 设置输入监控
function setupInputMonitoring(): void {
  if (!userBehaviorCollector.getConfig().monitorConfig?.input?.enabled) return;

  const debounceTime = userBehaviorCollector.getConfig().monitorConfig?.input?.debounceTime || 500;
  const sensitiveFields = userBehaviorCollector.getConfig().monitorConfig?.input?.sensitiveFields || [];

  document.addEventListener('input', (event: Event) => {
    const target = event.target as HTMLInputElement;
    const fieldName = target.name || target.id || target.className;

    // 检查是否是敏感字段
    const isSensitive = sensitiveFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()));

    // 清除之前的定时器
    if (userBehaviorCollector.inputTimers.has(fieldName)) {
      clearTimeout(userBehaviorCollector.inputTimers.get(fieldName)!);
    }

    // 设置新的定时器
    const timer = window.setTimeout(() => {
      const behaviorData: UserBehaviorData = {
        type: UserBehaviorType.INPUT,
        action: 'input',
        target: fieldName,
        elementTag: target.tagName.toLowerCase(),
        elementId: target.id,
        elementClass: target.className,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      // 记录输入值（如果不是敏感字段）
      if (userBehaviorCollector.getConfig().monitorConfig?.input?.trackValue && !isSensitive) {
        behaviorData.value = target.value;
      }

      userBehaviorCollector.collect(behaviorData);
      userBehaviorCollector.inputTimers.delete(fieldName);
    }, debounceTime);

    userBehaviorCollector.inputTimers.set(fieldName, timer);
  });
}

// 设置焦点监控
function setupFocusMonitoring(): void {
  if (!userBehaviorCollector.getConfig().monitorConfig?.focus?.enabled) return;

  // 监控焦点事件
  document.addEventListener(
    'focus',
    (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const behaviorData: UserBehaviorData = {
        type: UserBehaviorType.FOCUS,
        action: 'focus',
        target: target.tagName.toLowerCase(),
        elementTag: target.tagName.toLowerCase(),
        elementId: target.id,
        elementClass: target.className,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      userBehaviorCollector.collect(behaviorData);
    },
    true
  );

  // 监控失焦事件
  if (userBehaviorCollector.getConfig().monitorConfig?.focus?.trackBlur) {
    document.addEventListener(
      'blur',
      (event: FocusEvent) => {
        const target = event.target as HTMLElement;
        const behaviorData: UserBehaviorData = {
          type: UserBehaviorType.BLUR,
          action: 'blur',
          target: target.tagName.toLowerCase(),
          elementTag: target.tagName.toLowerCase(),
          elementId: target.id,
          elementClass: target.className,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        };

        userBehaviorCollector.collect(behaviorData);
      },
      true
    );
  }
}

// 设置页面监控
function setupPageMonitoring(): void {
  if (!userBehaviorCollector.getConfig().monitorConfig?.page?.enabled) return;

  // 监控页面浏览
  if (userBehaviorCollector.getConfig().monitorConfig?.page?.trackPageView) {
    const behaviorData: UserBehaviorData = {
      type: UserBehaviorType.PAGE_VIEW,
      action: 'page_view',
      target: 'document',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      pageTitle: document.title,
      referrer: document.referrer,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };

    userBehaviorCollector.collect(behaviorData);
  }

  // 监控窗口大小变化
  if (userBehaviorCollector.getConfig().monitorConfig?.page?.trackResize) {
    let resizeTimer: number | null = null;

    window.addEventListener('resize', () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }

      resizeTimer = window.setTimeout(() => {
        const behaviorData: UserBehaviorData = {
          type: UserBehaviorType.RESIZE,
          action: 'resize',
          target: 'window',
          width: window.innerWidth,
          height: window.innerHeight,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        };

        userBehaviorCollector.collect(behaviorData);
        resizeTimer = null;
      }, 300);
    });
  }
}

// 手动上报自定义行为
export function reportCustomBehavior(
  action: string,
  customData?: any,
  level: UserBehaviorLevel = UserBehaviorLevel.LOW
): void {
  const behaviorData: UserBehaviorData = {
    type: UserBehaviorType.CUSTOM,
    action,
    customData,
    level,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  };

  userBehaviorCollector.collect(behaviorData);
}

// 获取行为统计信息
export function getUserBehaviorStats(): {
  total: number;
  byType: Record<UserBehaviorType, number>;
  byLevel: Record<UserBehaviorLevel, number>;
  recent: UserBehaviorData[];
  sessionDuration: number;
} {
  const behaviors = userBehaviorCollector.getBehaviors();
  const byType = {} as Record<UserBehaviorType, number>;
  const byLevel = {} as Record<UserBehaviorLevel, number>;

  // 初始化计数器
  Object.values(UserBehaviorType).forEach(type => {
    byType[type] = 0;
  });
  Object.values(UserBehaviorLevel).forEach(level => {
    byLevel[level] = 0;
  });

  // 统计行为
  behaviors.forEach(behavior => {
    byType[behavior.type]++;
    if (behavior.level) {
      byLevel[behavior.level]++;
    }
  });

  return {
    total: behaviors.length,
    byType,
    byLevel,
    recent: behaviors.slice(-20), // 最近20个行为
    sessionDuration: Date.now() - userBehaviorCollector.sessionStartTime
  };
}

// 清空行为记录
export function clearUserBehaviors(): void {
  userBehaviorCollector.clearBehaviors();
}

// 更新配置
export function updateUserBehaviorMonitorConfig(config: Partial<UserBehaviorMonitorConfig>): void {
  userBehaviorCollector.updateConfig(config);
}

// 销毁监控器
export function destroyUserBehaviorMonitor(): void {
  if (userBehaviorCollector) {
    userBehaviorCollector.destroy();
  }
}

// Default export for module resolution
export default {
  setupUserBehaviorMonitor,
  reportCustomBehavior,
  getUserBehaviorStats,
  clearUserBehaviors,
  updateUserBehaviorMonitorConfig,
  destroyUserBehaviorMonitor,
  UserBehaviorType,
  UserBehaviorLevel
};
