const CACHE_NAME = 'color-sort-v2.0.0';
const APP_VERSION = '2.0.0';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './version.json'
];

// Install — cache all assets immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — cache-first, network fallback; cache new responses
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  // Skip version.json — always network so update check works
  if (event.request.url.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request.clone()).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Messages from app
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Notify all clients of the current SW version
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'SW_VERSION', version: APP_VERSION });
  }
});

// Periodic background sync fallback (poll for updates every 5 min via setInterval in client)
