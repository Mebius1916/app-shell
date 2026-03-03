
/**
 * Check if a URL matches any of the ignore patterns.
 * 
 * Why is this needed?
 * 1. Broad strategies (like navigation or static assets) capture ALL requests by default. 
 *    We need this to exclude specific resources (e.g., tracking scripts, specific pages).
 * 2. Prefix-based strategies (like API) might need to exclude specific sub-paths.
 */
export function shouldIgnore(url: URL, patterns: string[] = []) {
  return patterns.some(pattern => 
    url.hostname.includes(pattern) || url.pathname.includes(pattern)
  );
}
