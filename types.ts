
export interface RouteConfig {
  routes: string[];
}

export interface ApiStrategyConfig extends RouteConfig {
  cacheName?: string;
  networkTimeoutSeconds?: number;
  maxEntries?: number;
  maxAgeSeconds?: number;
  validateResponse?: (data: any, response: Response) => boolean | Promise<boolean>;
}

export interface StaticAssetsConfig {
  enabled?: boolean;
  cacheName?: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

export interface SSEConfig {
  routes: string[];
}

export interface IgnoreConfig {
  patterns: string[];
}

export interface ServiceWorkerConfig {
  api?: ApiStrategyConfig;
  staticAssets?: StaticAssetsConfig;
  sse?: SSEConfig;
  ignore?: IgnoreConfig;
  fallback?: {
    enabled?: boolean;
  };
}
