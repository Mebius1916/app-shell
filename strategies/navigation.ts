
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

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

  registerRoute(new NavigationRoute(navigationHandler));
}
