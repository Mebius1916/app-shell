# @djparty/sw-sdk

Service Worker 灾备与离线能力 SDK。提供了一套配置驱动的 Service Worker 解决方案，用于提升 Web 应用的可用性与加载性能。

## 核心特性

- **配置驱动**：通过简单的 JSON 配置即可启用复杂的缓存策略。
- **白屏预防**：
  - **App Shell 缓存**：优先网络获取最新 HTML，离线时降级使用缓存。
  - **API 数据缓存**：关键接口（如用户信息、导航栏）支持离线访问。
  - **静态资源优化**：JS/CSS/图片采用 `StaleWhileRevalidate` 策略，兼顾速度与更新。
- **高级 SSE 支持**：独创的 Server-Sent Events 流式数据离线缓存方案（转 JSON 存储，离线时模拟流式回放）。
- **紧急止损 (Emergency Stop)**：支持通过 Client 端消息 (`UPDATE_SW_ENABLED`) 动态禁用 SW 所有拦截逻辑，降级为透明代理。
- **监控友好**：支持配置忽略名单（如 Slardar/Sentry），防止 SW 干扰监控数据上报。
- **配额保护**：内置自动缓存清理与配额管理 (`purgeOnQuotaError`)，防止占满用户磁盘。

## 目录结构

```text
src/sw-sdk/
├── index.ts          # 入口文件，导出 createServiceWorker
├── types.ts          # 类型定义
├── state.ts          # 全局状态管理 (Enabled/Disabled)
├── strategies/       # 缓存策略实现
│   ├── api.ts        # NetworkFirst 策略 (API)
│   ├── static.ts     # StaleWhileRevalidate 策略 (静态资源)
│   ├── sse.ts        # 自定义流式缓存策略 (SSE)
│   ├── navigation.ts # App Shell 策略 (HTML)
│   ├── ignore.ts     # NetworkOnly 策略 (黑名单)
│   └── fallback.ts   # 离线兜底逻辑
└── README.md         # 本文档
```

## 快速开始

### 1. 引入 SDK

在你的 Service Worker 入口文件（例如 `src/sw.ts`）中引入并初始化：

```typescript
import { createServiceWorker } from './sw-sdk'; // 或从 npm 包导入

declare const self: ServiceWorkerGlobalScope;

createServiceWorker({
  // 1. 监控请求忽略 (强烈建议配置)
  ignore: {
    patterns: [
      'mon.zijieapi.com',
      'ibytedapm.com',
      'slardar'
    ]
  },
  
  // 2. 关键业务 API 缓存 (NetworkFirst)
  api: {
    routes: [
      '/api/user/',
      '/api/config/',
      // 支持正则
      /^\/api\/category\/.*/
    ],
    // 可选配置
    cacheName: 'api-cache',
    maxEntries: 100,
    maxAgeSeconds: 86400 // 24小时
  },

  // 3. SSE 流式接口缓存 (实验性特性)
  sse: {
    routes: ['/api/home/dashboard']
  },

  // 4. 静态资源缓存 (StaleWhileRevalidate)
  staticAssets: {
    enabled: true,
    // 可覆盖默认配置
    maxEntries: 500
  },

  // 5. 离线兜底 (App Shell)
  fallback: {
    enabled: true
  }
});
```

### 2. 构建配置

确保你的构建工具（如 Rspack/Webpack）使用了 `InjectManifest` 模式，并排除了 HTML 文件的预缓存（HTML 应由 SDK 的 Navigation 策略动态管理）。

**edenx.config.ts 示例:**

```typescript
chain.plugin('workbox').use(InjectManifest, [{
  swSrc: './src/sw.ts',
  swDest: 'sw.js',
  exclude: [
    /\.map$/,
    /hot-update/,
    /\.html$/, // 关键：排除 HTML，交由 SDK 处理
  ],
  include: [/\.js$/, /\.css$/, /\.png$/, /\.svg$/],
}]);
```

## 紧急止损与运维

SDK 监听以下 `postMessage` 指令，可由主线程 (`window`) 发送以控制 SW 行为：

### 禁用 SW (Emergency Stop)

当线上出现严重 Bug 时，发送此消息可立即“关闭”SW 的拦截功能（所有请求直连网络，不查缓存）。

```typescript
// Client 端代码
if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: 'UPDATE_SW_ENABLED',
    enabled: false
  });
}
```

### 清空缓存

```typescript
// Client 端代码
if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_SW_CACHE'
  });
}
```

### 跳过等待 (Skip Waiting)

通常在检测到新版本时调用。

```typescript
// Client 端代码
if (registration.waiting) {
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}
```

## 许可证

ISC
