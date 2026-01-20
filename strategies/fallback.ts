
import { setCatchHandler } from 'workbox-routing';
import { matchPrecache } from 'workbox-precaching';

export function setupOfflineFallback() {
  setCatchHandler(async (options) => {
    const event = options.event;
    const request = options.request || (event as any).request;
    if (request && request.mode === 'navigate') {
      const fallbackResponse = await matchPrecache('/index.html');
      if (fallbackResponse) return fallbackResponse;
    }
    return Response.error();
  });
}
