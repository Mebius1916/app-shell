
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
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
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
    fetchOptions: {
      mode: 'cors',
      credentials: 'omit',
    },
  });

  registerRoute(
    ({ request }) => 
      request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font',
    staticStrategy
  );
}
