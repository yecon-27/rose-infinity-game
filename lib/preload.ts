const imageCache = new Map<string, HTMLImageElement>();

/**
 * 在当前画面稳定后悄悄把后续静态原画放进浏览器缓存。
 * 保留 Image 引用，避免慢网络下请求被过早回收。
 */
export function preloadImageSources(sources: string[]) {
  if (typeof window === "undefined") return;
  for (const src of new Set(sources.filter(Boolean))) {
    if (imageCache.has(src)) continue;
    const image = new window.Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = src;
    imageCache.set(src, image);
  }
}
