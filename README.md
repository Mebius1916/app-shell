# Aegis (@byted/aegis)

一个专注于**容灾 (Resilience)**、**高性能**与**离线优先 (Offline-First)** 体验的 Service Worker SDK。

> Aegis (神盾) 为你的 Web 应用提供了一层坚固的防护，确保应用即使在网络崩溃或代码出现 Bug 时也能保持稳定运行。

## 安装 (Installation)

```bash
npm install @byted/aegis
```

## 使用指南 (Usage)

### 1. 创建 Service Worker (sw.ts)

在项目根目录下创建 `sw.ts` 文件：

```typescript
import { createServiceWorker } from '@byted/aegis';

createServiceWorker({
  // API 缓存策略 (网络优先)
  api: {
    routes: ['/api/v1/'],
    // 自定义校验：只有当后端返回逻辑成功时才缓存
    validateResponse: async (data, response) => {
      return data?.code === 0;
    }
  },
  // 静态资源策略 (Stale While Revalidate)
  staticAssets: {
    enabled: true,
    maxAgeSeconds: 30 * 24 * 60 * 60 // 30天
  },
  // SSE 流式数据缓存
  sse: {
    routes: ['/api/v1/stream']
  },
  // App Shell 离线兜底
  fallback: {
    enabled: true
  }
});
```

### 2. 在客户端注册 (main.ts)

在你的应用入口文件中：

```typescript
import { registerServiceWorker } from '@byted/aegis/client';

registerServiceWorker({
  // 发现新版本时自动更新
  autoSkipWaiting: true, 
  // 或者自定义 UI 提示：
  // autoSkipWaiting: (update) => showUpdateModal(update)
});
```

---


## 配置详情 (Configuration Detail)

以下是 `createServiceWorker` 的完整参数说明。

### 1. 忽略名单配置 (`ignore`)

位于生命周期的 **Level 0** 之后。用于指定某些 URL 完全绕过 Service Worker，直接透传网络。

| 参数名       | 类型         | 必传         | 说明                                                          |
| :----------- | :----------- | :----------- | :------------------------------------------------------------ |
| `patterns` | `string[]` | **是** | 需要忽略的 URL 片段或域名（如 `['/slardar', 'sentry.io']`） |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
  ignore: {
    // 监控上报请求不走 SW
    patterns: ['mon.byte.com', '/report/error']
  }
});
```

### 2. API 策略配置 (`api`)

位于生命周期的 **Level 2**。用于配置后端接口的缓存行为。

| 参数名                    | 类型         | 必传         | 默认值          | 说明                                                               |
| :------------------------ | :----------- | :----------- | :-------------- | :----------------------------------------------------------------- |
| `routes`                | `string[]` | **是** | -               | 需要拦截的接口路径前缀列表（如 `['/api/v1']`）                   |
| `cacheName`             | `string`   | 否           | `'api-cache'` | Cache Storage 的名称                                               |
| `validateResponse`      | `Function` | 否           | `response.ok` | 自定义校验函数 `(data, response) => boolean`。返回 true 才缓存。 |
| `networkTimeoutSeconds` | `number`   | 否           | `3`           | 网络请求超时时间（秒）。超时后自动降级到缓存。                     |
| `maxEntries`            | `number`   | 否           | `100`         | 最大缓存条目数（LRU 策略）                                         |
| `maxAgeSeconds`         | `number`   | 否           | `86400`       | 缓存最大有效期（秒），默认 24 小时                                 |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
  api: {
    routes: ['/api/user'],
    cacheName: 'user-api-cache',
    // 仅缓存 10 分钟，最多 50 条
    maxAgeSeconds: 600,
    maxEntries: 50,
    // 业务校验
    validateResponse: async (data) => data.code === 200
  }
});
```

### 3. SSE 流式配置 (`sse`)

位于生命周期的 **Level 1**。用于处理 Server-Sent Events 流式接口。

| 参数名            | 类型         | 必传         | 默认值          | 说明                                                   |
| :---------------- | :----------- | :----------- | :-------------- | :----------------------------------------------------- |
| `routes`        | `string[]` | **是** | -               | 需要拦截的 SSE 接口路径列表（如 `['/chat/stream']`） |
| `cacheName`     | `string`   | 否           | `'sse-cache'` | Cache Storage 的名称                                   |
| `maxEntries`    | `number`   | 否           | `50`          | 最大缓存条目数                                         |
| `maxAgeSeconds` | `number`   | 否           | `86400`       | 缓存有效期（秒），默认 24 小时                         |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
  sse: {
    routes: ['/api/chat/stream', '/api/stock/feed'],
    // 增加缓存条数以支持更长的对话历史
    maxEntries: 200
  }
});
```

### 4. 静态资源配置 (`staticAssets`)

位于生命周期的 **Level 3**。用于配置 JS/CSS/Image 等资源的缓存。

| 参数名            | 类型        | 必传 | 默认值                 | 说明                         |
| :---------------- | :---------- | :--- | :--------------------- | :--------------------------- |
| `enabled`       | `boolean` | 否   | `true`               | 是否开启静态资源缓存         |
| `cacheName`     | `string`  | 否   | `'static-resources'` | Cache Storage 的名称         |
| `maxEntries`    | `number`  | 否   | `500`                | 最大缓存文件数               |
| `maxAgeSeconds` | `number`  | 否   | `2592000`            | 缓存有效期（秒），默认 30 天 |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
  staticAssets: {
    // 禁用静态资源缓存
    // enabled: false,
  
    // 自定义过期策略
    maxEntries: 1000,
    maxAgeSeconds: 7 * 24 * 60 * 60 // 7天
  }
});
```

### 5. 导航与兜底配置 (`navigation` & `fallback`)

位于生命周期的 **Fallback** 阶段。

#### 导航配置 (`navigation`)

| 参数名                    | 类型       | 必传 | 默认值      | 说明                           |
| :------------------------ | :--------- | :--- | :---------- | :----------------------------- |
| `cacheName`             | `string` | 否   | `'pages'` | Cache Storage 的名称           |
| `networkTimeoutSeconds` | `number` | 否   | `3`       | 网络超时时间（秒）             |
| `maxEntries`            | `number` | 否   | `20`      | 最大缓存页面数                 |
| `maxAgeSeconds`         | `number` | 否   | `86400`   | 缓存有效期（秒），默认 24 小时 |

#### 兜底配置 (`fallback`)

| 参数名      | 类型        | 必传 | 默认值   | 说明                                                                   |
| :---------- | :---------- | :--- | :------- | :--------------------------------------------------------------------- |
| `enabled` | `boolean` | 否   | `true` | 是否开启离线兜底。当导航请求彻底失败时，返回预缓存的 `/index.html`。 |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
  // 导航策略
  navigation: {
    cacheName: 'my-app-shell-v2',
    networkTimeoutSeconds: 5
  },
  // 开启离线兜底
  fallback: {
    enabled: true
  }
});
```

---

## 客户端注册参数 (RegisterOptions)

`registerServiceWorker` 的参数说明：

| 参数名              | 类型                        | 必传 | 默认值             | 说明                                                                                                                                        |
| :------------------ | :-------------------------- | :--- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `swUrl`           | `string`                  | 否   | `'/sw.js'`       | Service Worker 文件的部署路径                                                                                                               |
| `autoSkipWaiting` | `boolean` \| `Function` | 否   | `true`           | 更新策略。<br>- `true`: 自动更新<br>- `false`: 手动更新<br>- `Function`: `(update) => void`，自定义回调，调用 `update()` 触发更新 |
| `isDev`           | `boolean`                 | 否   | `process.env...` | 强制指定开发模式。开发模式下不会自动 `skipWaiting`，防止无限刷新循环。                                                                    |
| `onError`         | `(error: Error) => void`  | 否   | `undefined`      | Service Worker 错误回调。SW 内部的异常会通过 postMessage 透传到这里，便于对接监控平台。                                                   |

#### 示例

```typescript
registerServiceWorker({
  swUrl: '/service-worker.js',
  // 监控 SW 报错
  onError: (error) => {
    console.error('[SW Error]', error);
    // Slardar.report(error);
  }
});
```

## 许可证

ISC
