import { Workbox } from 'workbox-window';

export interface RegisterOptions {
  swUrl?: string;
  autoSkipWaiting?: boolean | ((update: () => void) => void);
  isDev?: boolean;
}

export function registerServiceWorker(options: RegisterOptions = {}) {
  if ('serviceWorker' in navigator) {
    const swUrl = options.swUrl || '/sw.js';
    const isDev = options.isDev ?? process.env.NODE_ENV === 'development';
    
    const wb = new Workbox(swUrl);

    if (!isDev) {
      wb.addEventListener('waiting', () => {
        if (options.autoSkipWaiting === undefined || options.autoSkipWaiting === true) {
          wb.messageSkipWaiting();
        } 
        else if (typeof options.autoSkipWaiting === 'function') {
          options.autoSkipWaiting(() => {
            wb.messageSkipWaiting();
          });
        }
      });
    }

    // Best Practice: Register after window load to avoid blocking initial page load
    if (document.readyState === 'complete') {
      wb.register();
    } else {
      window.addEventListener('load', () => wb.register());
    }
    
    return wb;
  }
  return null;
}
