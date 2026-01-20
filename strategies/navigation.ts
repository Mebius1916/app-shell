
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { NavigationConfig } from '../types';

export function registerNavigationStrategy(config: NavigationConfig = {}) {
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

  registerRoute(new NavigationRoute(navigationHandler));
}
