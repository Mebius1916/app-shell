import { Workbox } from 'workbox-window';

export interface RegisterOptions {
  swUrl?: string;
  autoSkipWaiting?: boolean;
  isDev?: boolean;
}

export function registerServiceWorker(options: RegisterOptions = {}) {
  if ('serviceWorker' in navigator) {
    const swUrl = options.swUrl || '/sw.js';
    const isDev = options.isDev ?? process.env.NODE_ENV === 'development';
    
    const wb = new Workbox(swUrl);

    // Auto Skip Waiting in production
    if (!isDev && options.autoSkipWaiting !== false) {
      wb.addEventListener('waiting', () => {
        wb.messageSkipWaiting();
      });
    }

    wb.register();
    return wb;
  }
  return null;
}
