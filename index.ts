
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

import { ServiceWorkerConfig } from './types';
import { swState, setSwEnabled } from './state';
import { registerApiStrategy } from './strategies/api';
import { registerStaticAssetsStrategy } from './strategies/static';
import { registerSSEStrategy } from './strategies/sse';
import { registerNavigationStrategy } from './strategies/navigation';
import { setupOfflineFallback } from './strategies/fallback';
import { reportError } from './utils/logger';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

export * from './types';
export * from './client';

export function createServiceWorker(config: ServiceWorkerConfig) {
  // 1. Init
  if (config.enabled === false) {
    setSwEnabled(false);
  }
  clientsClaim(); // 立即接管页面 
  cleanupOutdatedCaches(); // 清除旧的缓存

  // 0. Global Emergency Stop (Must be first)
  registerRoute(
    () => !swState.enabled,
    new NetworkOnly()
  );

  // 2. Precache
  // @ts-ignore
  precacheAndRoute(self.__WB_MANIFEST || []);

  // 3. Register Strategies
  // 将 ignore patterns 传递给各策略
  const ignorePatterns = config.ignore?.patterns || [];

  if (config.sse) {
    registerSSEStrategy(config.sse, ignorePatterns);
  }

  if (config.api) {
    registerApiStrategy(config.api, ignorePatterns);
  }

  if (config.staticAssets !== undefined) {
    registerStaticAssetsStrategy(config.staticAssets, ignorePatterns);
  } else {
    registerStaticAssetsStrategy({ enabled: true }, ignorePatterns);
  }

  registerNavigationStrategy(config.navigation, ignorePatterns);

  // 5. Fallback
  if (config.fallback?.enabled !== false) {
    setupOfflineFallback(config.navigation);
  }

  // 6. Error Reporting
  self.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error || new Error(event.message);
    reportError(error, 'ERROR'); // 发布错误
  });

  self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason || new Error('Unhandled Promise Rejection');
    reportError(error, 'UNHANDLED_REJECTION'); // 发布错误
  });

  // 7. Lifecycle & Messages
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
