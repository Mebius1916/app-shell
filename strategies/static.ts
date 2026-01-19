
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { swState } from '../state';
import { StaticAssetsConfig } from '../types';

export function registerStaticAssetsStrategy(config: StaticAssetsConfig) {
  if (config.enabled === false) return;

  const staticStrategy = new StaleWhileRevalidate({
    cacheName: config.cacheName || 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: config.maxEntries || 500,
        maxAgeSeconds: config.maxAgeSeconds || 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
      // 关键修复：只缓存状态码为 200 的响应
      // 拒绝缓存 status: 0 (Opaque Responses)，防止磁盘空间占用暴涨 (每个文件 ~7MB)
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
    fetchOptions: {
      mode: 'cors',
      credentials: 'omit',
    },
  });

  const fallbackStrategy = new NetworkOnly();

  registerRoute(
    ({ request }) => 
      request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font',
    (args) => {
      if (!swState.enabled) {
        return fallbackStrategy.handle(args);
      }
      return staticStrategy.handle(args);
    }
  );
}
