
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { StaticAssetsConfig } from '../types';
import { shouldIgnore } from '../utils/ignore';

export function registerStaticAssetsStrategy(config: StaticAssetsConfig, ignorePatterns: string[] = []) {
  if (config.enabled === false) return;

  const staticStrategy = new StaleWhileRevalidate({
    cacheName: config.cacheName || 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: config.maxEntries || 500,
        maxAgeSeconds: config.maxAgeSeconds || 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
    fetchOptions: config.fetchOptions || {
      mode: 'cors',
      credentials: 'omit',
    },
  });

  registerRoute(
    ({ request, url }) => {
      if (shouldIgnore(url, ignorePatterns)) return false;
      return request.destination === 'script' || 
        request.destination === 'style' || 
        request.destination === 'image' ||
        request.destination === 'font';
    },
    staticStrategy
  );
}
