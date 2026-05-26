
// A name for our cache, including a version number for easy updates.
const IMAGE_CACHE_NAME = 'astrocapture-image-cache-v2';
const ALADIN_CACHE_NAME = 'aladin-tile-cache-v1';

// A list of all caches that are currently in use.
// When updating a cache version, change the name above and the old one will be
// automatically cleaned up during the 'activate' event.
const ACTIVE_CACHES = [IMAGE_CACHE_NAME, ALADIN_CACHE_NAME];

// The origin of the images we want to cache (Firebase Storage).
const IMAGE_ORIGIN = 'https://storage.googleapis.com';

/**
 * Implements the "Stale-While-Revalidate" caching strategy.
 * This strategy serves content from the cache immediately if available,
 * providing a fast user experience, while simultaneously fetching an updated
 * version from the network to keep the cache fresh for the next visit.
 *
 * @param {Request} request The request to handle.
 * @returns {Promise<Response>} A promise that resolves to a response.
 */
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponsePromise = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    // If we get a valid response, update the cache with the new version.
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(err => {
    // The network failed, but we can still rely on the cache if it exists.
    console.warn('Service Worker: Network request failed for', request.url, err);
    // If the network fails and we have a cached response, this error is gracefully handled.
    // If not, the promise will reject, and the browser will show its default network error page.
  });

  // Return the cached response immediately if it exists, otherwise wait for the network.
  return cachedResponsePromise || fetchPromise;
};


/**
 * Implements a "Cache-First" then "Network" strategy for Aladin Lite tiles.
 * This is necessary because Aladin requests resources from servers that may not
 * provide CORS headers. Fetching with 'no-cors' mode is required, which results
 * in an "opaque" response. We can cache these, but we can't inspect their status.
 *
 * @param {Request} request The request to handle.
 * @returns {Promise<Response>} A promise that resolves to a response.
 */
const aladinCacheFirst = async (request) => {
  const cache = await caches.open(ALADIN_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // FIX: Reconstruct the request to ensure it's a simple request compatible
    // with 'no-cors' mode. This prevents TypeErrors when fetching resources
    // from servers that don't provide CORS headers, like some map tile servers.
    const newRequest = new Request(request.url, {
      mode: 'no-cors',
      credentials: 'omit', // Explicitly omit credentials to improve CORS compatibility
    });

    const networkResponse = await fetch(newRequest);
    
    // We put a clone of the response into the cache.
    // This will be an 'opaque' response, which is acceptable for caching these assets.
    await cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Fetch failed for Aladin resource:', request.url, error);
    // Rethrow the error to let the browser handle the network failure.
    throw error;
  }
};


// Intercept fetch events.
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy for AstroCapture images from Firebase Storage
  if (requestUrl.origin === IMAGE_ORIGIN) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Strategy for Aladin Lite map tiles and properties. These requests often
  // lack CORS headers, and the service worker context requires us to handle this.
  // We identify them by the '/hips/' path segment, a common convention.
  if (requestUrl.pathname.includes('/hips/')) {
    event.respondWith(aladinCacheFirst(event.request));
    return;
  }
});

// Clean up old caches when a new service worker activates.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !ACTIVE_CACHES.includes(name)) // Find all caches not in our active list
          .map(name => caches.delete(name)) // and delete them
      );
    })
  );
});