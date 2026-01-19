
declare const process: any;
export interface RegisterOptions {
  /**
   * Path to the service worker file
   */
  swUrl?: string;
  /**
   * Whether to automatically skip waiting in production
   * @default true
   */
  autoSkipWaiting?: boolean;
  /**
   * Force development mode (disables auto skip waiting by default)
   */
  isDev?: boolean;
}

export function registerServiceWorker(options: RegisterOptions = {}) {
  if ('serviceWorker' in navigator) {
    const swUrl = options.swUrl || '/sw.js';
    const isDev = options.isDev ?? (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

    // Handle controller change (SW claimed clients)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW-SDK] Page controlled by new Service Worker');
    });

    return navigator.serviceWorker.register(swUrl).then((registration) => {
      console.log('[SW-SDK] Registered successfully', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Update available (Waiting)
              console.log('[SW-SDK] New version waiting...');
              
              if (!isDev && options.autoSkipWaiting !== false) {
                console.log('[SW-SDK] Skipping waiting...');
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              } else {
                console.log('[SW-SDK] Auto skip waiting disabled (Dev mode or config)');
              }
            } else {
              // First install
              console.log('[SW-SDK] Service Worker installed for the first time');
            }
          }
        });
      });

      return registration;
    }).catch((err) => {
      console.error('[SW-SDK] Registration failed', err);
      throw err;
    });
  }
  return Promise.resolve(null);
}
