// ============================================
// SUN TOWER RWA — Service Worker
// ============================================
// Provides offline shell caching and background sync
// Version: 1.0.0

const CACHE_NAME = 'suntower-resident-v2';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/supabase-config.js',
  '/js/auth.js',
  '/js/audit.js',
  '/js/data.js',
  '/js/resident-app.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
];

// Install: cache shell files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching shell files');
        return cache.addAll(SHELL_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for API, Cache-first for shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase API calls (always network)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    return;
  }

  // For navigation requests (HTML pages), try network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline: return cached version
          return caches.match(event.request)
            .then(cached => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // For static assets: Cache-first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Return cached, but also update in background
          fetch(event.request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
            }
          }).catch(() => {});
          return cached;
        }
        // Not in cache: fetch from network and cache
        return fetch(event.request).then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        // Offline fallback for images
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#f5f5f5" width="200" height="150"/><text fill="#999" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      })
  );
});

// Background Sync: retry failed form submissions when online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-complaints') {
    event.waitUntil(syncComplaints());
  }
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncComplaints() {
  // Read pending complaints from IndexedDB and retry submission
  console.log('[SW] Background sync: complaints');
}

async function syncMessages() {
  console.log('[SW] Background sync: messages');
}

// Push notifications (future)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Sun Tower RWA', {
        body: data.body || '',
        icon: '/images/logo-192.png',
        badge: '/images/badge-72.png',
        data: data.url || '/'
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
