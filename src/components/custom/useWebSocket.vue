<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWebSocket } from '@vueuse/core';
import { ElMessage } from 'element-plus';
defineOptions({ name: 'UseWebSocket' });
const inputMessage = ref('');

// 根据环境适配 WebSocket 地址：开发用 localhost，生产用当前域名 + 8090 端口
const wsBaseUrl = import.meta.env.PROD ? `ws://${window.location.hostname}:8090` : 'ws://localhost:8090';

// 使用 @vueuse/core 的 useWebSocket 来完成连接、心跳和断线重连
const {
  status,
  data: latestMessage,
  send,
  open,
  close,
  ws
} = useWebSocket(wsBaseUrl, {
  // 自动重连配置
  autoReconnect: {
    retries: 10, // 最大重连次数
    delay: 3000, // 每次重连间隔（毫秒）
    onFailed() {
      console.warn('WebSocket 重连失败，已停止重连');
    }
  },
  // 心跳机制配置
  heartbeat: {
    message: 'ping', // 发送给后端的心跳内容
    interval: 10000, // 心跳发送间隔（毫秒）
    pongTimeout: 5000 // 多少时间内没响应视为掉线
  },
  immediate: true // 组件挂载后立刻连接
});

const connectionStatus = computed(() => {
  switch (status.value) {
    case 'CONNECTING':
      return '连接中...';
    case 'OPEN':
      return '已连接';
    case 'CLOSED':
      return '已关闭';
    default:
      return '未知';
  }
});

const sendMessage = () => {
  if (!inputMessage.value.trim()) return;
  send(inputMessage.value);
  ElMessage.success('消息已发送');
  inputMessage.value = '';
};
</script>

<template>
  <div class="ws-card">
    <ElCard shadow="hover">
      <template #header>
        <div class="ws-header">
          <span>WebSocket 调试面板</span>
          <ElTag
            :type="connectionStatus === '已连接' ? 'success' : connectionStatus === '连接中...' ? 'warning' : 'info'"
          >
            {{ connectionStatus }}
          </ElTag>
        </div>
      </template>

      <div class="ws-actions">
        <ElButton type="primary" @click="open">手动连接</ElButton>
        <ElButton type="danger" @click="() => close()">断开连接</ElButton>
      </div>

      <ElForm class="ws-form" @submit.prevent>
        <ElFormItem label="发送内容">
          <ElInput v-model="inputMessage" placeholder="请输入要发送的消息" clearable @keyup.enter="sendMessage" />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="success" :disabled="!inputMessage" @click="sendMessage">发送</ElButton>
        </ElFormItem>
      </ElForm>

      <div class="ws-message-panel">
        <div class="ws-message-header">
          <span>服务端返回最新消息</span>
        </div>
        <ElScrollbar height="160px" class="ws-message-body">
          <pre v-if="latestMessage">{{ latestMessage }}</pre>
          <span v-else class="ws-message-empty">暂未收到消息</span>
        </ElScrollbar>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.ws-card {
  padding: 16px;
}

.ws-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.ws-actions {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.ws-form {
  margin-bottom: 16px;
}

.ws-message-panel {
  border-top: 1px solid var(--el-border-color-light);
  padding-top: 12px;
}

.ws-message-header {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.ws-message-body {
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 8px 12px;
}

.ws-message-empty {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
