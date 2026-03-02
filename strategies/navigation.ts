
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { NavigationConfig } from '../types';
import { shouldIgnore } from '../utils/ignore';

export function registerNavigationStrategy(config: NavigationConfig = {}, ignorePatterns: string[] = []) {
  const navigationHandler = new NetworkFirst({
    cacheName: config.cacheName || 'pages',
    networkTimeoutSeconds: config.networkTimeoutSeconds || 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: config.maxEntries || 20,
        maxAgeSeconds: config.maxAgeSeconds || 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
      {
        fetchDidSucceed: async ({ response }) => {
          if (response.ok) return response;
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
