/// <reference lib="WebWorker" />

const CACHE_NAME = 'solo-leveller-cache-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx', // React entry point
  '/App.tsx', // Main App component
  '/types.ts',
  '/constants.ts',
  // UI Components
  '/js/components/UI/Panel.tsx',
  '/js/components/UI/Button.tsx',
  '/js/components/UI/EnergyBar.tsx',
  '/js/components/UI/Dial.tsx',
  '/js/components/UI/HUDOverlay.tsx',
  '/js/components/UI/Modal.tsx',
  '/js/components/UI/WelcomeModal.tsx', // Added WelcomeModal
  '/js/components/UI/Loader.tsx',
  // Module Components
  '/js/components/modules/RadionicsSimulator.tsx',
  '/js/components/modules/SubliminalAmplifier.tsx',
  '/js/components/modules/SubliminalMaker.tsx',
  '/js/components/modules/QuantumHealing.tsx',
  '/js/components/modules/FrequencyGenerator.tsx',
  '/js/components/modules/MantraSiddhi.tsx',
  // Services
  '/js/services/storageService.ts',
  '/js/services/permissionsService.ts',
  // Assets (placeholders for now)
  '/assets/icons/default-icon.svg',
  '/assets/images/placeholder.png',
  // External dependencies if any (Tailwind CDN)
  'https://cdn.tailwindcss.com',
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching all app content');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      // Fix: Cast self to unknown first, then to ServiceWorkerGlobalScope to satisfy TypeScript
      .then(() => (self as unknown as ServiceWorkerGlobalScope).skipWaiting())
      .catch(error => {
        console.error('[Service Worker] Caching failed:', error);
      })
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
    // Fix: Cast self to unknown first, then to ServiceWorkerGlobalScope to satisfy TypeScript
    .then(() => (self as unknown as ServiceWorkerGlobalScope).clients.claim())
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // No cache hit - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Only cache successful responses and specific types of requests
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('[Service Worker] Fetch failed:', event.request.url, error);
          // Fallback for offline if no network and no cache
          // You might want to serve an offline page here
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html'); // Serve the main app for navigation
          }
          return new Response('Network error or resource not found in cache.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});