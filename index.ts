
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import * as navigationPreload from 'workbox-navigation-preload';
import { NetworkOnly } from 'workbox-strategies';

import { ServiceWorkerConfig } from './types';
import { swState, setSwEnabled } from './state';
import { registerApiStrategy } from './strategies/api';
import { registerStaticAssetsStrategy } from './strategies/static';
import { registerSSEStrategy } from './strategies/sse';
import { registerNavigationStrategy } from './strategies/navigation';
import { registerIgnoreStrategy } from './strategies/ignore';
import { setupOfflineFallback } from './strategies/fallback';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

export * from './types';
export * from './client';

export function createServiceWorker(config: ServiceWorkerConfig) {
  // 1. Init
  clientsClaim();
  cleanupOutdatedCaches();
  navigationPreload.enable();

  // 0. Global Emergency Stop (Must be first)
  registerRoute(
    () => !swState.enabled,
    new NetworkOnly()
  );

  // 2. Precache
  // @ts-ignore
  precacheAndRoute(self.__WB_MANIFEST || []);

  // 3. HMR
  registerRoute(
    ({ url }) => url.pathname.includes('hot-update'),
    new NetworkOnly()
  );

  // 4. Register Strategies
  if (config.ignore) {
    registerIgnoreStrategy(config.ignore);
  }

  if (config.sse) {
    registerSSEStrategy(config.sse);
  }

  if (config.api) {
    registerApiStrategy(config.api);
  }

  if (config.staticAssets !== undefined) {
    registerStaticAssetsStrategy(config.staticAssets);
  } else {
    registerStaticAssetsStrategy({ enabled: true });
  }

  registerNavigationStrategy();

  // 5. Fallback
  if (config.fallback?.enabled !== false) {
    setupOfflineFallback();
  }

  // 6. Lifecycle & Messages
  self.addEventListener('message', async (event: any) => {
    if (!event.data) return;

    if (event.data.type === 'SKIP_WAITING') {
      // @ts-ignore
      self.skipWaiting();
    }

    if (event.data.type === 'UPDATE_SW_ENABLED') {
      setSwEnabled(Boolean(event.data.enabled));
      console.log('[SW-SDK] State updated:', swState.enabled);
    }

    if (event.data.type === 'CLEAR_SW_CACHE') {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        console.log('[SW-SDK] All caches cleared');
      } catch (error) {
        console.error('[SW-SDK] Cache clear failed:', error);
      }
    }
  });
}
