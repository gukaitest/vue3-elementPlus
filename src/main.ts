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
    reportUrl: '/proxy-default/monitor/errors',
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
