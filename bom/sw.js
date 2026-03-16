// ============================================
// SUN TOWER RWA — BOM Dashboard Service Worker
// ============================================
const CACHE_NAME = 'suntower-bom-v7';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/css/bom.css',
  '/js/supabase-config.js',
  '/js/auth.js',
  '/js/audit.js',
  '/js/data.js',
  '/js/bom-sidebar.js',
  '/js/bom-app.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          fetch(event.request).then(response => {
            if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#f5f5f5" width="200" height="150"/><text fill="#999" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      })
  );
});
