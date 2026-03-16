# WebSocket 功能说明（开发 & 生产通用）

## 整体架构

- **前端项目**：`vue3-elementPlus`
- **后端项目**：`express_mongodb`
- **WebSocket 端口**：固定使用 `8090`
- **通信地址策略**：
  - 开发环境：`ws://localhost:8090`
  - 生产环境：`ws://{当前前端域名}:8090`（例如前端为 `http://47.103.169.121:8083`，则 WebSocket 为 `ws://47.103.169.121:8090`）

---

## 后端实现（express_mongodb）

- 位置：`express_mongodb/websocket.js`
- 使用 `ws` 库创建 WebSocket 服务：
  - 端口：`8090`
  - 心跳机制：服务端定时对每个连接发送 `ping`，并根据 `pong` 响应检查连接是否存活，清理不活跃连接。
  - 消息处理：收到客户端消息后，简单地广播给所有在线客户端。
- 启动方式：
  - 在 `express_mongodb/index.js` 中通过 `require('./websocket')` 启动 WebSocket 服务。
  - 与 HTTP 服务（端口 `3000`）并行运行，互不影响。

### 关键逻辑概览

- **连接事件**：记录客户端连接 / 断开 / 错误日志。
- **心跳检测**：
  - 为每个连接维护 `socket.isAlive` 标记。
  - 周期性发送 `ping`，超时未响应则调用 `socket.terminate()`。
- **消息广播**：遍历 `wss.clients`，将消息发送给所有处于 `OPEN` 状态的连接。

> 依赖：需要在 `express_mongodb` 目录安装 `ws`：`pnpm add ws` 或 `npm install ws`。

---

## 前端实现（vue3-elementPlus）

### 1. WebSocket 业务组件

- 位置：`src/components/custom/useWebSocket.vue`
- 功能：
  - 连接后端 WebSocket 服务。
  - 自动重连。
  - 心跳机制。
  - 发送消息、展示最新收到的消息。
  - 使用 Element Plus 美化交互界面。

#### 1.1 连接地址适配

- 在组件中根据环境动态计算 WebSocket 地址：

  - 开发环境（`import.meta.env.PROD === false`）：
    - 连接 `ws://localhost:8090`
  - 生产环境（`import.meta.env.PROD === true`）：
    - 连接 `ws://{window.location.hostname}:8090`
    - 例如前端访问地址为 `http://47.103.169.121:8083`，则 WebSocket 地址为 `ws://47.103.169.121:8090`

#### 1.2 使用 @vueuse/core 的 useWebSocket

- 使用 `useWebSocket` 完成连接和状态管理，启用以下能力：

1. **自动重连**：
   - `autoReconnect.retries = 10`：最多重连 10 次。
   - `autoReconnect.delay = 3000`：每次重连间隔 3 秒。
2. **心跳机制**：
   - `heartbeat.message = 'ping'`：心跳 payload。
   - `heartbeat.interval = 10000`：每 10 秒发送一次心跳。
   - `heartbeat.pongTimeout = 5000`：5 秒内未收到响应视为连接异常。
3. **状态管理**：
   - 通过 `status` 计算出中文连接状态文案（连接中 / 已连接 / 已关闭）。
   - 使用 `latestMessage` 展示后台最新返回消息。

#### 1.3 Element Plus UI 集成

- 使用的 Element Plus 组件：
  - `el-card`：整体容器，展示「WebSocket 调试面板」标题。
  - `el-tag`：展示当前连接状态。
  - `el-button`：连接 / 断开 / 发送消息按钮。
  - `el-form`、`el-form-item`：组织输入区域。
  - `el-input`：输入待发送消息，支持 `clearable`、回车发送。
  - `el-scrollbar`：滚动展示最新消息面板。
  - `ElMessage`：发送成功后给予消息提示。

---

### 2. 页面路由与集成

- 页面文件：`src/views/personal-content/websocket/index.vue`
- 内容：
  - 通过 `<UseWebSocket />` 使用上面的业务组件。
  - 在 `<script setup>` 中显式导入：
    - `import UseWebSocket from '@/components/custom/useWebSocket.vue';`
- 路由 & 多语言：
  - 路由 key：`personal-content_websocket`
  - 中英文路由文案分别在：
    - `src/locales/langs/zh-cn.ts` 中 `route['personal-content_websocket']`
    - `src/locales/langs/en-us.ts` 中 `route['personal-content_websocket']`

---

## 本地开发使用说明

1. **启动后端 WebSocket 服务**
   - 在 `express_mongodb` 目录：
     - 安装依赖（若未安装）：`pnpm add ws` 或 `npm install ws`
     - 启动服务（确保 `index.js` 引入了 `./websocket`）。
   - 确保控制台输出：`WebSocket 服务运行在 ws://localhost:8090`

2. **启动前端项目**
   - 在 `vue3-elementPlus` 目录执行：
     - `pnpm i`
     - `pnpm dev`
   - 浏览器打开本地前端地址，访问「个人内容 -> WebSocket」菜单。

3. **交互验证**
   - 查看连接状态标签是否显示为「已连接」。
   - 在输入框中输入文本，点击「发送」或回车：
     - 下方「最新消息」区域应显示刚刚发送的内容（后端广播回显）。

---

## 线上部署注意事项

1. **端口开放**
   - 确保服务器开放 `8090` 端口（安全组 / 防火墙规则中放行）。

2. **前端地址示例**
   - 前端访问地址：`http://47.103.169.121:8083`
   - WebSocket 访问地址：`ws://47.103.169.121:8090`
   - 由前端组件根据 `window.location.hostname` 自动推导，无需额外改代码。

3. **nginx 反向代理（可选）**
   - 如需通过路径代理（例如 `/ws`）统一域名，可在后端将 WebSocket 挂载到 HTTP Server 上，并在 nginx 中配置 `proxy_set_header Upgrade` / `Connection` 等头部。
   - 当前实现使用独立 8090 端口，如果符合你的运维环境，可保持不变。

