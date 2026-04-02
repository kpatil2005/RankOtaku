const CACHE_NAME = 'rankotaku-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/index.css',
  '/src/main.jsx',
  '/favicon.svg'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache images and static assets
          if (event.request.destination === 'image' || 
              event.request.url.includes('.css') || 
              event.request.url.includes('.js')) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        }).catch(() => {
          // Return offline page if available
          return caches.match('/offline.html');
        });
      })
  );
});

// Background sync for quiz submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-quiz') {
    event.waitUntil(syncQuizData());
  }
});

async function syncQuizData() {
  // Get pending quiz data from IndexedDB
  // Submit to server when online
  console.log('Syncing quiz data...');
}

// Push notifications (optional for future)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
