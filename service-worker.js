// AstroCapture Service Worker v4
// Caching strategies based on Modern Web Guidance best practices

const IMAGE_CACHE_NAME = 'astrocapture-image-cache-v6';
const ALADIN_CACHE_NAME = 'aladin-tile-cache-v3';
const STATIC_CACHE_NAME = 'astrocapture-static-cache-v4';
const HTML_CACHE_NAME = 'astrocapture-html-cache-v4';

const ACTIVE_CACHES = [IMAGE_CACHE_NAME, ALADIN_CACHE_NAME, STATIC_CACHE_NAME, HTML_CACHE_NAME];

const IMAGE_ORIGIN = self.location.origin;

// Static assets with content-hash filenames — Cache-First (immutable)
const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.ico'];

/**
 * Stale-While-Revalidate for self-hosted images.
 * Serves cached immediately, updates in background.
 */
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, cache will be used if available
  });

  return cachedResponse || fetchPromise;
};

/**
 * Cache-First for static assets with hashed filenames (JS, CSS, fonts).
 * These are immutable — once cached, never need revalidation until the hash changes.
 */
const cacheFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
};

/**
 * Network-First for HTML documents — always serve latest, fall back to cache.
 */
const networkFirst = async (request) => {
  const cache = await caches.open(HTML_CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
};

/**
 * Cache-First for Aladin Lite tiles (opaque responses, no CORS).
 */
const aladinCacheFirst = async (request) => {
  const cache = await caches.open(ALADIN_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const newRequest = new Request(request.url, {
      mode: 'no-cors',
      credentials: 'omit',
    });

    const networkResponse = await fetch(newRequest);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('SW: Aladin fetch failed:', request.url, error);
    throw error;
  }
};

// Intercept fetch events
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // HTML documents: Network-First (always fresh, offline fallback)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Same-origin routing
  if (requestUrl.origin === IMAGE_ORIGIN) {
    // Static assets with hash: Cache-First
    if (STATIC_EXTENSIONS.some(ext => requestUrl.pathname.endsWith(ext))) {
      event.respondWith(cacheFirst(event.request));
      return;
    }
    // Uploads: Stale-While-Revalidate
    if (requestUrl.pathname.startsWith('/uploads/')) {
      event.respondWith(staleWhileRevalidate(event.request));
      return;
    }
    // API calls: Network only (no cache)
    return;
  }

  // Aladin tiles: Cache-First (handles CORS issues)
  if (requestUrl.pathname.includes('/hips/') || 
      requestUrl.hostname.includes('aladin') || 
      requestUrl.hostname.includes('esa.int')) {
    event.respondWith(aladinCacheFirst(event.request));
    return;
  }
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !ACTIVE_CACHES.includes(name))
          .map(name => caches.delete(name))
      );
    })
  );
});