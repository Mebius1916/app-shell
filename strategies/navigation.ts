
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NavigationConfig } from '../types';
import { shouldIgnore } from '../utils/ignore';

export function registerNavigationStrategy(config: NavigationConfig = {}, ignorePatterns: string[] = []) {
  const navigationHandler = new NetworkFirst({
    cacheName: config.cacheName || 'pages',
    networkTimeoutSeconds: config.networkTimeoutSeconds || 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: config.maxEntries || 20,
        maxAgeSeconds: config.maxAgeSeconds || 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
      {
        fetchDidSucceed: async ({ response }) => {
          // Allow 2xx, 3xx and opaque redirects to pass through
          if (response.ok || (response.status >= 300 && response.status < 400) || response.type === 'opaqueredirect') {
            return response;
          }
          // Treat 4xx/5xx as errors to trigger cache fallback
          throw new Error('Response not ok');
        },
      },
    ],
  });

  registerRoute(
    ({ request, url }) => {
      // 1. Must be a navigation request
      if (request.mode !== 'navigate') return false;

      // 2. Check user ignore patterns
      if (shouldIgnore(url, ignorePatterns)) return false;

      // 3. Default Workbox exclusions:
      // - Starts with /_
      if (url.pathname.startsWith('/_')) return false;
      // - Looks like a file extension (e.g. /styles.css)
      if (url.pathname.match(/[^/?]+\.[^/]+$/)) return false;

      return true;
    },
    navigationHandler
  );
}
