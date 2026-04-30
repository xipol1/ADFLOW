// Service worker — bump CACHE_NAME on each release so clients drop stale assets.
const CACHE_NAME = 'channelad-v2';

// Install: take over immediately so users on a new bundle don't need to refresh twice.
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

// Activate: drop old caches, claim open clients.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   /api/*               → network-only (no cache; let the app handle errors)
//   /assets/*  (hashed)  → cache-first (filenames change per build, safe to cache long-term)
//   HTML / everything else → network-first (so a new deploy is picked up immediately;
//                            falls back to cache when offline)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.pathname.startsWith('/api/')) {
    return; // let the network handle it directly
  }

  // Vite emits hashed filenames under /assets/
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }))
    );
    return;
  }

  // Network-first for documents and other static files (logo.svg, manifest.json, etc.)
  e.respondWith(
    fetch(e.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.destination === 'document') return caches.match('/');
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    )
  );
});

// Push notification received
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'Channelad';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: data.tag || 'notification',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
