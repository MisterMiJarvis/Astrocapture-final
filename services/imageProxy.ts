/**
 * Returns a resized image URL via the server-side proxy.
 * Uses the /api/images/resize endpoint to serve optimized images.
 * Falls back to the original URL if no resize is needed.
 * 
 * @param url Original image URL (e.g., /uploads/xxx.webp)
 * @param options Resize options
 * @returns Resized image URL or original if no resize needed
 */
export function getImageUrl(
  url: string,
  options?: { width?: number; height?: number; quality?: number; format?: 'webp' | 'jpeg' }
): string {
  if (!url) return '';
  
  // Only resize /uploads/ images
  if (!url.startsWith('/uploads/')) return url;
  
  // If no options, return original
  if (!options) return url;
  
  const params = new URLSearchParams();
  params.set('url', url);
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.quality) params.set('quality', String(options.quality));
  params.set('format', options.format || 'webp');
  
  return `/api/images/resize?${params.toString()}`;
}

/**
 * Generates srcSet string for responsive images.
 * @param url Original image URL
 * @param sizes Array of widths to generate
 * @returns srcSet string
 */
export function getSrcSet(
  url: string,
  sizes: number[] = [400, 800, 1200]
): string {
  if (!url.startsWith('/uploads/')) return url;
  return sizes
    .map(w => `${getImageUrl(url, { width: w, format: 'webp' })} ${w}w`)
    .join(', ');
}