const CACHE_NAME = 'triviaquest-v1';
const CORE_ASSETS = ['./', './index.html', './bank.json', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const accepts = event.request.headers.get('accept') || '';
  const isNavigationRequest =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    accepts.includes('text/html');

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(async () => {
          if (isNavigationRequest) {
            return caches.match('./index.html');
          }

          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }

          throw new Error(`Network request failed for ${event.request.url}`);
        });
    })
  );
});
