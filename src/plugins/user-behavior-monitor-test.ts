/** 用户行为监控测试文件 - 用于验证监控功能是否正常工作 */

import {
  UserBehaviorLevel,
  UserBehaviorType,
  getUserBehaviorStats,
  reportCustomBehavior,
  setupUserBehaviorMonitor
} from './user-behavior-monitor';

// 测试用户行为监控功能
export function testUserBehaviorMonitor() {
  console.log('🧪 开始测试用户行为监控功能...');

  // 初始化监控器（测试配置）
  setupUserBehaviorMonitor({
    enableConsoleLog: true,
    enableReport: false, // 测试时不启用上报
    sampleRate: 1,
    maxBehaviors: 100,
    monitorConfig: {
      click: { enabled: true, debounceTime: 100 },
      scroll: { enabled: true, throttleTime: 50 },
      input: { enabled: true, debounceTime: 200 },
      focus: { enabled: true, trackBlur: true },
      page: { enabled: true, trackPageView: true, trackResize: true },
      session: { enabled: true, sessionTimeout: 60000 }
    }
  });

  // 测试自定义行为上报
  setTimeout(() => {
    console.log('📝 测试自定义行为上报...');
    reportCustomBehavior(
      'test_action',
      {
        testData: 'This is a test behavior',
        timestamp: Date.now()
      },
      UserBehaviorLevel.MEDIUM
    );
  }, 1000);

  // 测试统计信息获取
  setTimeout(() => {
    console.log('📊 获取行为统计信息...');
    const stats = getUserBehaviorStats();
    console.log('行为统计:', stats);
  }, 2000);

  // 模拟一些用户行为
  setTimeout(() => {
    console.log('🎯 模拟用户行为...');

    // 模拟点击事件
    const clickEvent = new MouseEvent('click', {
      clientX: 100,
      clientY: 200,
      bubbles: true
    });
    document.body.dispatchEvent(clickEvent);

    // 模拟输入事件
    const input = document.createElement('input');
    input.name = 'test-input';
    input.value = 'test value';
    document.body.appendChild(input);

    const inputEvent = new Event('input', { bubbles: true });
    input.dispatchEvent(inputEvent);

    // 模拟焦点事件
    const focusEvent = new FocusEvent('focus', { bubbles: true });
    input.dispatchEvent(focusEvent);

    // 模拟滚动事件
    const scrollEvent = new Event('scroll', { bubbles: true });
    window.dispatchEvent(scrollEvent);

    // 模拟窗口大小变化
    const resizeEvent = new Event('resize', { bubbles: true });
    window.dispatchEvent(resizeEvent);

    // 清理测试元素
    document.body.removeChild(input);
  }, 3000);

  // 最终统计
  setTimeout(() => {
    console.log('📈 最终行为统计:');
    const finalStats = getUserBehaviorStats();
    console.log('总行为数:', finalStats.total);
    console.log('按类型统计:', finalStats.byType);
    console.log('按级别统计:', finalStats.byLevel);
    console.log('会话时长:', Math.round(finalStats.sessionDuration / 1000), '秒');
    console.log('最近行为:', finalStats.recent.slice(-5));

    console.log('✅ 用户行为监控测试完成！');
  }, 5000);
}

// 导出测试函数
export default testUserBehaviorMonitor;
