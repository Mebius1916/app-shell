
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { swState } from '../state';

/**
 * Standard Navigation Strategy (App Shell)
 * Hardcoded configuration for now as it's standard for App Shell, 
 * but can be exposed in config if needed.
 */
export function registerNavigationStrategy() {
  const navigationHandler = new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60,
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

  const fallbackHandler = new NetworkOnly();

  registerRoute(new NavigationRoute((args) => {
    if (!swState.enabled) {
      return fallbackHandler.handle(args);
    }
    return navigationHandler.handle(args);
  }));
}
