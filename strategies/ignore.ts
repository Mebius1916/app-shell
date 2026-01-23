
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { IgnoreConfig } from '../types';

export function registerIgnoreStrategy(config?: IgnoreConfig) {
  const defaultPatterns = ['hot-update'];
  const patterns = [...new Set([...defaultPatterns, ...(config?.patterns || [])])];

  const ignoreMatcher = ({ url }: { url: URL }) => {
    return patterns.some(pattern => 
      url.hostname.includes(pattern) || url.pathname.includes(pattern)
    );
  };

  const handler = new NetworkOnly();
  
  ['GET', 'POST', 'PUT', 'HEAD', 'DELETE'].forEach(method => {
    registerRoute(ignoreMatcher, handler, method as any);
  });
}
