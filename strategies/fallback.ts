
import { setCatchHandler } from 'workbox-routing';
import { NavigationConfig } from '../types';

declare const self: ServiceWorkerGlobalScope;

export function setupOfflineFallback(config: NavigationConfig = {}) {
  const cacheName = config.cacheName || 'pages';

  setCatchHandler(async (options) => {
    const event = options.event;
    const request = options.request || (event as any).request;
    
    if (request && request.mode === 'navigate') {
      // 1. 优先尝试从 Runtime Cache (pages) 中获取 index.html
      const runtimeCache = await self.caches.open(cacheName);
      const runtimeResponse = await runtimeCache.match('/index.html');
      if (runtimeResponse) return runtimeResponse;
    }
    return Response.error();
  });
}
