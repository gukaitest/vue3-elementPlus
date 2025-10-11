import { createApp } from 'vue';
import './plugins/assets';
import {
  setupAppVersionNotification,
  setupDayjs,
  setupErrorMonitor,
  setupIconifyOffline,
  setupLoading,
  setupNProgress,
  setupUI,
  setupUserBehaviorMonitor,
  setupVueErrorHandler,
  setupWebVitals
} from './plugins';
import { setupStore } from './store';
import { setupRouter } from './router';
import { setupI18n } from './locales';
import App from './App.vue';

async function setupApp() {
  setupLoading();

  setupNProgress();

  setupIconifyOffline();

  setupDayjs();

  // 初始化Web Vitals性能监控
  setupWebVitals({
    enableConsoleLog: true,
    enableReport: true,
    reportUrl: '/proxy-default/monitor/webvitals'
  });

  // 初始化错误监控
  setupErrorMonitor({
    enableConsoleLog: true,
    enableReport: true,
    reportUrl: import.meta.env.VITE_ERROR_MONITOR_REPORT_URL || '/proxy-default/monitor/errors',
    sampleRate: 1, // 100%采样率
    maxErrors: 100,
    ignoreErrors: [
      // 忽略一些常见的第三方库错误
      'Script error',
      'Non-Error promise rejection captured',
      /ResizeObserver loop limit exceeded/
    ],
    ignoreUrls: [
      // 忽略一些第三方资源错误
      /chrome-extension/,
      /moz-extension/,
      /safari-extension/
    ]
  });

  // 初始化用户行为监控
  setupUserBehaviorMonitor({
    enableConsoleLog: true,
    enableReport: true,
    reportUrl: import.meta.env.VITE_USER_BEHAVIOR_REPORT_URL || '/proxy-default/monitor/behaviors',
    sampleRate: 1, // 100%采样率
    maxBehaviors: 1000,
    ignoreBehaviors: [
      // 忽略一些常见的系统行为
      'mousemove',
      'mouseover',
      'mouseout'
    ],
    ignoreElements: [
      // 忽略一些系统元素
      'script',
      'style',
      'meta',
      'link'
    ],
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
  });

  const app = createApp(App);

  setupUI(app);

  // 设置Vue错误监控
  setupVueErrorHandler(app);

  setupStore(app);

  await setupRouter(app);

  setupI18n(app);

  setupAppVersionNotification();

  app.mount('#app');
}

setupApp();
