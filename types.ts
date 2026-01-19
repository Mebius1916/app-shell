
export interface RouteConfig {
  /**
   * List of URL patterns to match.
   * Can be strings (prefix matching for pathname) or RegExps.
   */
  routes: (string | RegExp)[];
}

export interface ApiStrategyConfig extends RouteConfig {
  cacheName?: string;
  networkTimeoutSeconds?: number;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

export interface StaticAssetsConfig {
  enabled?: boolean;
  cacheName?: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

export interface SSEConfig {
  /**
   * Specific paths for SSE endpoints (exact match)
   */
  routes: string[];
}

export interface IgnoreConfig {
  /**
   * Hostnames or path fragments to ignore (use NetworkOnly)
   */
  patterns: string[];
}

export interface ServiceWorkerConfig {
  /**
   * Configuration for API routes (NetworkFirst)
   */
  api?: ApiStrategyConfig;

  /**
   * Configuration for Static Assets (StaleWhileRevalidate)
   */
  staticAssets?: StaticAssetsConfig;

  /**
   * Configuration for SSE endpoints (Custom Stream Caching)
   */
  sse?: SSEConfig;

  /**
   * Patterns to ignore (NetworkOnly)
   */
  ignore?: IgnoreConfig;

  /**
   * Fallback configuration
   */
  fallback?: {
    enabled?: boolean;
  };
}
