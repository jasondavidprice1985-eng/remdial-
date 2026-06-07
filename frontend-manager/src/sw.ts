/// <reference lib="webworker" />

// Custom service worker for FieldRem manager PWA.
// Handles: simple network-first caching + Web Push notifications.

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null } | string>;
};

const CACHE_NAME = 'fieldrem-v1';
const PRECACHE_URLS: string[] = (self.__WB_MANIFEST || []).map(e =>
  typeof e === 'string' ? e : e.url,
);

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(PRECACHE_URLS); } catch { /* offline at install, ignore */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil((async () => {
    // Drop any old caches
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Network-first for GET, with cache fallback. Don't intercept API/uploads — let the browser handle.
self.addEventListener('fetch', (event: FetchEvent) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/socket.io/')) {
    return; // pass through to network
  }
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      // SPA fallback for navigations
      if (req.mode === 'navigate') {
        const index = await caches.match('/index.html') || await caches.match('/');
        if (index) return index;
      }
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});

// Web Push: backend sends a JSON payload, we show a notification.
interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'FieldRem', body: event.data.text() || 'New activity' };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag:  payload.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url || '/';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const origin = self.location.origin;
    for (const c of allClients) {
      if (c.url.startsWith(origin)) {
        await c.focus();
        if ('navigate' in c) await (c as WindowClient).navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
