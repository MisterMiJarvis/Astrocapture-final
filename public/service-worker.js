// AstroCapture Service Worker v4 — PWA with app shell caching + offline fallback

const IMAGE_CACHE_NAME = 'astrocapture-image-cache-v5';
const ALADIN_CACHE_NAME = 'aladin-tile-cache-v1';
const APP_SHELL_CACHE_NAME = 'astrocapture-app-shell-v2';

const ACTIVE_CACHES = [IMAGE_CACHE_NAME, ALADIN_CACHE_NAME, APP_SHELL_CACHE_NAME];

const IMAGE_ORIGIN = self.location.origin;

// App shell — the core assets needed for offline use
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.svg',
];

// ─── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn('SW: Some app shell assets failed to cache:', err);
      });
    })
  );
  // Take control immediately
  self.skipWaiting();
});

// ─── Stale-While-Revalidate for images ────────────────────────────────────────
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((err) => {
    console.warn('SW: Network failed for', request.url, err);
  });

  return cachedResponse || fetchPromise;
};

// ─── Cache-First for Aladin tiles (no-cors) ───────────────────────────────────
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

// ─── Network-First for navigation (HTML pages) with offline fallback ──────────
const networkFirstWithFallback = async (request) => {
  try {
    const networkResponse = await fetch(request);
    // Cache successful HTML responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(APP_SHELL_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Network failed — try cache
    const cache = await caches.open(APP_SHELL_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Final fallback to cached index.html (app shell)
    const fallback = await cache.match('/index.html');
    if (fallback) {
      return fallback;
    }
    // Last resort: a simple offline page
    return new Response(
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AstroCapture — Offline</title><style>body{background:#0a0f1a;color:#e8eaf6;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}.container{max-width:400px;padding:2rem}h1{color:#3b82f6;font-size:1.5rem}p{opacity:0.7;margin-top:0.5rem}</style></head><body><div class="container"><h1>🔭 AstroCapture</h1><p>You are offline. Your cached content will appear when you reconnect.</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
};

// ─── Fetch handler ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Navigation requests (HTML pages) → Network-First with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(event.request));
    return;
  }

  // Self-hosted images → Stale-While-Revalidate
  if (requestUrl.origin === IMAGE_ORIGIN && requestUrl.pathname.startsWith('/uploads/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Aladin/HIPS tiles → Cache-First (no-cors)
  if (requestUrl.pathname.includes('/hips/')) {
    event.respondWith(aladinCacheFirst(event.request));
    return;
  }

  // Static assets from same origin (JS, CSS, icons) → Stale-While-Revalidate
  // Exclude API calls — they should always go to network
  if (requestUrl.origin === IMAGE_ORIGIN && !requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
});

// ─── Activate: clean up old caches + force unregister old SW ──────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(keys => Promise.all(
        keys.filter(k => !ACTIVE_CACHES.includes(k)).map(k => caches.delete(k))
      )),
      // Claim all clients immediately so new SW takes control
      self.clients.claim(),
    ])
  );
});