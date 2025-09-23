import { createApp } from 'vue';
import './plugins/assets';
import {
  setupAppVersionNotification,
  setupDayjs,
  setupIconifyOffline,
  setupLoading,
  setupNProgress,
  setupUI,
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
    reportUrl: '/proxy-default/monitor/webvitals',
  });

  const app = createApp(App);

  setupUI(app);

  setupStore(app);

  await setupRouter(app);

  setupI18n(app);

  setupAppVersionNotification();

  app.mount('#app');
}

setupApp();
