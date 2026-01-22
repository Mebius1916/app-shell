declare const self: ServiceWorkerGlobalScope;

export function reportError(error: Error | string, type: 'ERROR' | 'UNHANDLED_REJECTION' = 'ERROR') {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'SW_ERROR_REPORT',
        payload: { type, message, stack }
      });
    });
  });
}
