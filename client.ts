import { Workbox } from 'workbox-window';

export interface RegisterOptions {
  swUrl?: string;
  autoSkipWaiting?: boolean | ((update: () => void) => void);
  onError?: (error: Error) => void;
}

export function registerServiceWorker(options: RegisterOptions = {}) {
  const { autoSkipWaiting = true } = options;

  if ('serviceWorker' in navigator) {
    const swUrl = options.swUrl || '/sw.js';
    
    const wb = new Workbox(swUrl);

    // 订阅错误
    wb.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_ERROR_REPORT') {
        const { message, stack } = event.data.payload;
        const error = new Error(message);
        error.stack = stack;
        options.onError?.(error);
      }
    });

    wb.addEventListener('waiting', () => {
      if (autoSkipWaiting === true) {
        wb.messageSkipWaiting();
      } else if (typeof autoSkipWaiting === 'function') {
        autoSkipWaiting(() => {
          wb.messageSkipWaiting();
        });
      }
    });

    const register = () => {
      wb.register();
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
    
    return wb;
  }
  return null;
}
