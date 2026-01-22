
import { registerRoute } from 'workbox-routing';
import { createParser, EventSourceMessage } from 'eventsource-parser';
import { CacheExpiration } from 'workbox-expiration';
import { SSEConfig } from '../types';

interface SSEEvent {
  type: string;
  data: string;
  id?: string;
  retry?: string;
}

export function registerSSEStrategy(config: SSEConfig) {
  const cacheName = config.cacheName || 'sse-cache'; 
  
  const sseExpiration = new CacheExpiration(cacheName, {
    maxEntries: config.maxEntries || 50,
    maxAgeSeconds: config.maxAgeSeconds || 24 * 60 * 60,
  });

  const sseHandler = async ({ event, request }: { event: any, request: Request }) => {
    try {
      // 先发起网络请求
      const response = await fetch(request);
      
      // 如果响应成功且是 SSE 流，则返回响应并缓存
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        const cache = await caches.open(cacheName);
        
        await sseExpiration.updateTimestamp(request.url);

        if (!response.body) return response;
        
        const [stream1, stream2] = response.body.tee();
        
        // 延长 sw 生命周期
        event.waitUntil((async () => {
          try {
            const reader = stream2.getReader();
            const decoder = new TextDecoder();
            const events: SSEEvent[] = [];
            // const events = [
            //   { id: "1", type: "message", data: "Welcome" },
            //   { id: "2", type: "update",  data: "{\"price\": 100}" },
            //   { id: "3", type: "message", data: "Bye" }
            // ];
            const parser = createParser({
              onEvent: (event: EventSourceMessage) => {
                events.push({
                  type: event.event || 'message',
                  data: event.data,
                  id: event.id,
                  retry: undefined 
                });
              }
            });
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              parser.feed(decoder.decode(value, { stream: true }));
            }
            
            if (events.length > 0) {
              const jsonResponse = new Response(JSON.stringify(events), {
                headers: { 
                  'Content-Type': 'application/json',
                  'Date': new Date().toUTCString()
                }
              });
              await cache.put(request, jsonResponse);
              
              await sseExpiration.updateTimestamp(request.url);
              await sseExpiration.expireEntries();
            }
          } catch (err) {
            console.error('[SW-SDK] SSE Cache Failed:', err);
          }
        })());
        
        return new Response(stream1, response);
      }
      return response;
    } catch (error) {
      // 如果响应失败且有缓存，则返回缓存
      const cache = await caches.open(cacheName);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        const events = await cachedResponse.json() as SSEEvent[];
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            events.forEach((evt) => {
               let chunk = '';
               if (evt.id) chunk += `id: ${evt.id}\n`;
               if (evt.type && evt.type !== 'message') chunk += `event: ${evt.type}\n`;
               if (evt.retry) chunk += `retry: ${evt.retry}\n`;
               
               // Handle multi-line data
               const dataLines = evt.data.split('\n');
               dataLines.forEach(line => {
                 chunk += `data: ${line}\n`;
               });
               
               chunk += '\n';
               controller.enqueue(encoder.encode(chunk));
            });
            controller.close();
          }
        });
        
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }
        });
      }
      throw error;
    }
  };

  config.routes.forEach(route => {
    registerRoute(
      ({ url }) => url.pathname === route,
      // @ts-ignore
      sseHandler
    );
  });
}
