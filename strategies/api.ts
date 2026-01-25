
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { ApiStrategyConfig } from '../types';

export function registerApiStrategy(config: ApiStrategyConfig) {
  const apiStrategy = new NetworkFirst({
    cacheName: config.cacheName || 'api-cache',
    networkTimeoutSeconds: config.networkTimeoutSeconds || 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: config.maxEntries || 100,
        maxAgeSeconds: config.maxAgeSeconds || 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
      {
        cacheWillUpdate: async ({ response }) => {
          if (!response) return null;
          if (config.validateResponse) {
            const clone = response.clone();
            try {
              let data: any;
              const contentType = clone.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                data = await clone.json();
              } else {
                data = null; 
              }

              const isValid = await config.validateResponse(data, clone);
              return isValid ? response : null;
            } catch (e) {
              return null;
            }
          }
          if (!response.ok) return null;
          return response;
        }
      },
    ],
    fetchOptions: config.fetchOptions || {
      mode: 'cors',
      credentials: 'include',
    },
  });

  registerRoute(
    ({ url }) => {
      return config.routes.some(route => {
         return url.pathname.startsWith(route);
      });
    },
    apiStrategy
  );
}
