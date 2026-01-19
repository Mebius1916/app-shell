
import { setCatchHandler } from 'workbox-routing';
import { cacheNames } from 'workbox-core';

export function setupOfflineFallback() {
  setCatchHandler(async (options) => {
    const event = options.event;
    
    const request = options.request || (event as any).request;

    if (request && request.mode === 'navigate') {
      const cache = await caches.open(cacheNames.precache);
      const fallbackUrls = ['/index.html', '/', 'index.html'];
      
      for (const url of fallbackUrls) {
        const match = await caches.match(url);
        if (match) return match;
      }

      const keys = await cache.keys();
      for (const request of keys) {
        if (request.url.endsWith('index.html') || request.url.endsWith('/')) {
          const match = await cache.match(request);
          if (match) return match;
        }
      }
    }
    return Response.error();
  });
}
