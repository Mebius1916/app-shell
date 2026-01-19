
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { swState } from '../state';
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
        fetchDidSucceed: async ({ response }) => {
          if (response.ok) {
            const clone = response.clone();
            try {
              const data = await clone.json();
              if (data && data.code === 0) {
                return response;
              }
            } catch (e) {
              // ignore
            }
          }
          // Workbox expects a Response object. If we don't want to cache it,
          // strictly speaking fetchDidSucceed should return the response.
          // However, to prevent caching invalid responses (not code===0), 
          // we should likely return response but use cacheWillUpdate to filter.
          // But based on the error "Type 'null' is not assignable to type 'Response'", 
          // fetchDidSucceed MUST return a Response.
          return response;
        },
        // Using cacheWillUpdate to actually control whether to cache
        cacheWillUpdate: async ({ response }) => {
          if (!response) return null;
          if (response.ok) {
            const clone = response.clone();
            try {
              const data = await clone.json();
              if (data && data.code === 0) {
                return response;
              }
            } catch (e) {
              // ignore
            }
          }
          return null;
        }
      },
    ],
    fetchOptions: {
      mode: 'cors',
      credentials: 'include',
    },
  });

  const fallbackStrategy = new NetworkOnly();

  registerRoute(
    ({ url }) => {
      // Avoid matching SSE routes if they overlap, though user should configure carefully.
      // We iterate through provided routes.
      return config.routes.some(route => {
        if (typeof route === 'string') {
          return url.pathname.startsWith(route);
        }
        return route.test(url.pathname);
      });
    },
    (args) => {
      if (!swState.enabled) {
        return fallbackStrategy.handle(args);
      }
      return apiStrategy.handle(args);
    }
  );
}
