
export function shouldIgnore(url: URL, patterns: string[] = []) {
  return patterns.some(pattern => 
    url.hostname.includes(pattern) || url.pathname.includes(pattern)
  );
}
