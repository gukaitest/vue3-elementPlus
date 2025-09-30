# 前端错误监控系统

类似web-vitals性能监控，提供全面的前端错误监控功能，包含以下监控内容：

## 功能特性

### 1. 全局JS错误监控 (window.onerror)
- 捕获同步JavaScript错误
- 捕获异步JavaScript错误
- 提供详细的错误堆栈信息

### 2. Vue组件错误监控 (app.config.errorHandler)
- 捕获Vue组件渲染错误
- 捕获Vue组件生命周期错误
- 提供组件名称、props、路由等上下文信息

### 3. Promise未处理错误监控 (window.onunhandledrejection)
- 捕获未处理的Promise rejection
- 支持Error对象和字符串类型的rejection

### 4. 资源加载错误监控 (捕获阶段error事件)
- 监控图片、脚本、样式表等资源加载失败
- 提供资源类型和URL信息

### 5. 接口请求错误监控 (Axios拦截器)
- 监控HTTP请求错误
- 提供请求URL、方法、状态码等信息
- 支持超时和网络错误检测

## 使用方法

### 基础配置

```typescript
import { setupErrorMonitor, setupVueErrorHandler } from '@/plugins/error-monitor';

// 初始化错误监控
setupErrorMonitor({
  enableConsoleLog: true,        // 是否输出到控制台
  enableReport: true,           // 是否上报错误
  reportUrl: '/api/errors',     // 错误上报URL
  sampleRate: 1,               // 采样率 (0-1)
  maxErrors: 100,              // 最大错误数量
  ignoreErrors: [              // 忽略的错误
    'Script error',
    /ResizeObserver loop limit exceeded/
  ],
  ignoreUrls: [                // 忽略的URL
    /chrome-extension/,
    /moz-extension/
  ]
});

// 设置Vue错误监控
const app = createApp(App);
setupVueErrorHandler(app);
```

### 手动上报自定义错误

```typescript
import { reportCustomError, ErrorLevel } from '@/plugins/error-monitor';

// 上报自定义错误
reportCustomError('业务逻辑错误', {
  userId: '12345',
  action: 'delete_user'
}, ErrorLevel.HIGH);
```

### 获取错误统计

```typescript
import { getErrorStats } from '@/plugins/error-monitor';

const stats = getErrorStats();
console.log('总错误数:', stats.total);
console.log('按类型统计:', stats.byType);
console.log('按级别统计:', stats.byLevel);
console.log('最近错误:', stats.recent);
```

## 错误类型

- `javascript`: JavaScript运行时错误
- `vue`: Vue组件错误
- `promise`: Promise未处理错误
- `resource`: 资源加载错误
- `ajax`: HTTP请求错误
- `custom`: 自定义错误

## 错误级别

- `low`: 低级别错误
- `medium`: 中级别错误
- `high`: 高级别错误
- `critical`: 严重错误

## 错误信息结构

```typescript
interface ErrorInfo {
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

  // Vue组件信息
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
  errorId?: string;
}
```

## 配置选项

```typescript
interface ErrorMonitorConfig {
  // 基础配置
  enableConsoleLog?: boolean;           // 是否输出到控制台
  enableReport?: boolean;               // 是否上报错误
  reportUrl?: string;                   // 错误上报URL
  customReport?: (errorInfo: ErrorInfo) => void; // 自定义上报函数

  // 错误过滤
  ignoreErrors?: (string | RegExp)[];   // 忽略的错误消息
  ignoreUrls?: (string | RegExp)[];     // 忽略的URL
  maxErrors?: number;                   // 最大错误数量

  // 采样率
  sampleRate?: number;                  // 错误上报采样率 (0-1)

  // 用户信息
  userId?: string;                      // 用户ID
  sessionId?: string;                   // 会话ID

  // 自定义配置
  customData?: any;                     // 自定义数据

  // 错误级别配置
  levelConfig?: {
    [key in ErrorType]?: ErrorLevel;
  };
}
```

## 演示页面

访问 `/plugin/error-monitor` 页面可以查看错误监控的演示和测试功能。

## 注意事项

1. 错误监控会在应用启动时自动初始化
2. 建议在生产环境中设置合适的采样率以控制上报量
3. 可以通过配置忽略一些常见的第三方库错误
4. 错误上报失败不会影响应用的正常运行
5. 错误信息会包含敏感信息，请注意数据安全
