import { Workbox } from 'workbox-window';

export interface RegisterOptions {
  swUrl?: string;
  autoSkipWaiting?: boolean | ((update: () => void) => void);
  isDev?: boolean;
  onError?: (error: Error) => void;
}

export function registerServiceWorker(options: RegisterOptions = {}) {
  if ('serviceWorker' in navigator) {
    const swUrl = options.swUrl || '/sw.js';
    const isDev = options.isDev ?? process.env.NODE_ENV === 'development';
    console.log('isDev',isDev);
    const wb = new Workbox(swUrl);

    // Debug Logs
    if (process.env.NODE_ENV === 'development' || isDev) {
      wb.addEventListener('installed', (event) => {
        console.log(`[Aegis] Service Worker installed (${event.isUpdate ? 'Update' : 'First install'}).`);
      });

      wb.addEventListener('controlling', () => {
        console.log('[Aegis] Service Worker is now controlling the page. Note: If the page reloads immediately after this, it might cause an infinite loop.');
      });
      
      wb.addEventListener('activated', () => {
         console.log('[Aegis] Service Worker activated.');
      });
    }

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
      // 默认策略：生产环境(isDev=false)自动跳过，开发环境需显式开启
      const shouldSkip = options.autoSkipWaiting ?? !isDev;
      
      if (process.env.NODE_ENV === 'development' || isDev) {
        console.log(`[Aegis] New Service Worker waiting. autoSkipWaiting=${shouldSkip}`);
      }

      if (shouldSkip === true) {
        wb.messageSkipWaiting();
      }  
      else if (typeof shouldSkip === 'function') {
        shouldSkip(() => {
          wb.messageSkipWaiting();
        });
      }
    });

    // Best Practice: Register after window load to avoid blocking initial page load
    const register = async () => {
      try {
        await wb.register();
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development' || isDev) {
          console.error('[Aegis] Service Worker registration failed:', error);
        }
        options.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', () => register());
    }
    
    return wb;
  }
  return null;
}
