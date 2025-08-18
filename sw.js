const CACHE_NAME = 'asisten-guru-ai-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/bundle.js',
  '/index.css',
  '/icon.svg',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  // For API calls, it's network-only. Don't cache.
  if (event.request.url.includes('/api/')) {
    // Intentionally not calling event.respondWith() to use the default network behavior.
    return;
  }

  // For all other requests, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we have a cached response, return it.
        if (response) {
          return response;
        }
        // Otherwise, fetch from the network.
        // We don't cache on the fly here to keep it simple,
        // all assets are pre-cached on install.
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});