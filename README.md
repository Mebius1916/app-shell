# Aegis (@byted/aegis)

一个专注于 `白屏容灾`、`高可用兜底`与 `极致弱网`体验的 Service Worker SDK。

> Aegis (神盾) 为你的 Web 应用提供了一层坚固的防护，确保应用即使在网络崩溃或代码出现 Bug 时也能保持稳定运行。

- ⚡️ **极速首屏**：基于 Workbox 预缓存核心资源，实现二次访问秒开，消除白屏等待。
- 🛡️ **离线兜底**：网络故障时自动降级渲染预缓存的完整页面，确保应用离线可用。
- 📦 **智能缓存**：内置 API、静态资源、SSE 等多场景最佳缓存策略，开箱即用。
- 🚨 **监控透传**：自动捕获 SW 运行时异常并透传至主线程，消除监控盲区。
- 🔌 **一键熔断**：支持紧急注销机制，遭遇严重故障时可快速自毁，保障业务止损。

## 安装 (Installation)

```bash
npm install @byted/aegis
```

## 使用指南 (Usage)

### 1. 在客户端注册 (main.ts)

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

### 2. 创建 Service Worker (sw.ts)

在项目根目录下创建 `sw.ts` 文件：

```typescript
import { createServiceWorker } from '@byted/aegis';

createServiceWorker({
  // 忽略 Slardar 监控请求
  ignore: {
    patterns: ['slardar']
  },
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

### 3. 配置构建工具 (Build Config)

为了让 Service Worker 生效，你需要使用 Workbox 插件将 `sw.ts` 编译并注入预缓存清单。

#### Webpack

```javascript
// webpack.config.js
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  // ...
  plugins: [
    new InjectManifest({
      swSrc: './src/sw.ts',
      swDest: 'sw.js',
      // 增加文件大小限制，防止大文件被漏掉
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      // 排除非必要的构建产物
      exclude: [/\.map$/, /hot-update/, /asset-manifest\.json$/, /LICENSE/, /\.html$/],
      // 确保包含 JS/CSS/图片
      include: [/\.js$/, /\.css$/, /\.png$/, /\.jpg$/, /\.svg$/],
    }),
  ],
};
```

#### Rspack（edenx）

```javascript
// rspack.config.ts (使用 @edenx/app-tools 或 @rsbuild/core)
import { InjectManifest } from '@aaroon/workbox-rspack-plugin';

export default defineConfig({
  tools: {
    bundlerChain(chain) {
      chain.plugin('workbox').use(InjectManifest, [{
        swSrc: './src/sw.ts',
        swDest: 'sw.js',
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        exclude: [/\.map$/, /hot-update/, /asset-manifest\.json$/, /LICENSE/],
        // 根据需要包含或排除 index.html
        include: [/\.js$/, /\.css$/, /\.png$/, /\.jpg$/, /\.svg$/],
      }]);
    }
  }
});
```

#### Vite

```javascript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        exclude: [/\.map$/, /hot-update/, /asset-manifest\.json$/, /LICENSE/, /\.html$/],
        include: [/\.js$/, /\.css$/, /\.png$/, /\.jpg$/, /\.svg$/],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
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

| 参数名                    | 类型            | 必传         | 默认值                         | 说明                                                               |
| :------------------------ | :-------------- | :----------- | :----------------------------- | :----------------------------------------------------------------- |
| `routes`                | `string[]`    | **是** | -                              | 需要拦截的接口路径前缀列表（如 `['/api/v1']`）                   |
| `cacheName`             | `string`      | 否           | `'api-cache'`                | Cache Storage 的名称                                               |
| `validateResponse`      | `Function`    | 否           | `response.ok`                | 自定义校验函数 `(data, response) => boolean`。返回 true 才缓存。 |
| `networkTimeoutSeconds` | `number`      | 否           | `3`                          | 网络请求超时时间（秒）。超时后自动降级到缓存。                     |
| `maxEntries`            | `number`      | 否           | `100`                        | 最大缓存条目数（LRU 策略）                                         |
| `maxAgeSeconds`         | `number`      | 否           | `86400`                      | 缓存最大有效期（秒），默认 24 小时                                 |
| `fetchOptions`          | `RequestInit` | 否           | `{ credentials: 'include' }` | 配置跨域模式、凭证策略等（如 `{ mode: 'cors' }`）                |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
  api: {
    routes: ['/api/user'],
    cacheName: 'user-api-cache',
    // 配置 fetch 参数 (如不需要 Cookie)
    fetchOptions: {
      credentials: 'omit',
      mode: 'cors'
    },
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

| 参数名            | 类型            | 必传 | 默认值                                    | 说明                                         |
| :---------------- | :-------------- | :--- | :---------------------------------------- | :------------------------------------------- |
| `enabled`       | `boolean`     | 否   | `true`                                  | 是否开启静态资源缓存                         |
| `cacheName`     | `string`      | 否   | `'static-resources'`                    | Cache Storage 的名称                         |
| `maxEntries`    | `number`      | 否   | `500`                                   | 最大缓存文件数                               |
| `maxAgeSeconds` | `number`      | 否   | `2592000`                               | 缓存有效期（秒），默认 30 天                 |
| `fetchOptions`  | `RequestInit` | 否   | `{ mode: 'cors', credentials: 'omit' }` | 配置跨域模式（如私有图片需设为 `include`） |

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

### 5. 导航配置 (`navigation`)

位于生命周期的 **Level 4**。用于处理页面导航请求（即浏览器地址栏跳转）。

| 参数名                    | 类型       | 必传 | 默认值      | 说明                           |
| :------------------------ | :--------- | :--- | :---------- | :----------------------------- |
| `cacheName`             | `string` | 否   | `'pages'` | Cache Storage 的名称           |
| `networkTimeoutSeconds` | `number` | 否   | `3`       | 网络超时时间（秒）             |
| `maxEntries`            | `number` | 否   | `20`      | 最大缓存页面数                 |
| `maxAgeSeconds`         | `number` | 否   | `86400`   | 缓存有效期（秒），默认 24 小时 |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
  navigation: {
    // 页面缓存 7 天
    maxAgeSeconds: 7 * 24 * 60 * 60,
    // 网络太慢（超过2秒）就直接展示缓存页面
    networkTimeoutSeconds: 2
  }
});
```

### 6. 兜底配置 (`fallback`)

位于生命周期的 **Fallback** 阶段。当所有策略失效时的最后一道防线。

| 参数名      | 类型        | 必传 | 默认值   | 说明                                                                                                         |
| :---------- | :---------- | :--- | :------- | :----------------------------------------------------------------------------------------------------------- |
| `enabled` | `boolean` | 否   | `true` | 是否开启离线兜底。当导航请求彻底失败时，优先从 Runtime Cache 查找 `index.html`，如果未找到则从预缓存查找。 |

#### 示例

```typescript
createServiceWorker({
  // ...其他配置
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
| `autoSkipWaiting` | `boolean` \| `Function` | 否   | `!isDev`         | 更新策略。<br>- `true`: 自动更新<br>- `false`: 手动更新<br>- `Function`: `(update) => void`，自定义回调，调用 `update()` 触发更新。<br>**注意**：开发环境下默认为 `false`，生产环境下默认为 `true`。 |
| `isDev`           | `boolean`                 | 否   | `process.env...` | 开发环境标识。<br>- 影响 `autoSkipWaiting` 的默认值（开发环境默认不自动更新，防止调试时页面刷新）。<br>- 依然可以通过显式设置 `autoSkipWaiting: true` 在开发环境下测试更新流程。 |
| `onError`         | `(error: Error) => void`  | 否   | `undefined`      | Service Worker 错误回调。SW 内部的异常会通过 postMessage 透传到这里，便于对接监控平台。                                                     |

#### 示例

```typescript
registerServiceWorker({
  // SW 文件路径，默认为 '/sw.js'
  swUrl: '/service-worker.js',

  // 自动更新策略
  // true: 发现新版本立即更新（可能导致懒加载资源 404）
  // false: 等待用户关闭所有页面后再更新
  // function: 自定义更新逻辑（推荐），例如弹窗提示用户
  autoSkipWaiting: (reload) => {
    if (confirm('发现新版本，是否刷新？')) {
      reload();
    }
  },

  // 是否开启开发模式日志 (默认为 process.env.NODE_ENV === 'development')
  isDev: false,

  // 监控 SW 运行时报错
  onError: (error) => {
    console.error('[SW Error]', error);
    // Slardar.report(error);
  }
});
```

## 许可证

ISC
