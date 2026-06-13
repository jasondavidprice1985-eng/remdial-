/// <reference lib="webworker" />

// Custom service worker for System22 Field PWA.
// Handles: network-first caching + API data cache + Web Push notifications.

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null } | string>;
};

const STATIC_CACHE = 'fieldrem-v2';
const API_CACHE = 'fieldrem-api-v1';

const PRECACHE_URLS: string[] = (self.__WB_MANIFEST || []).map(e =>
  typeof e === 'string' ? e : e.url,
);

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    try { await cache.addAll(PRECACHE_URLS); } catch { /* offline at install, ignore */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== STATIC_CACHE && n !== API_CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const req = event.request;
  const url = new URL(req.url);

  // Socket.io and uploads always pass through
  if (url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/uploads/')) {
    return;
  }

  // API GET: network-first with cache fallback (offline data)
  if (url.pathname.startsWith('/api/') && req.method === 'GET') {
    event.respondWith(apiNetworkFirst(req));
    return;
  }

  // API POST/PATCH/DELETE: pass through to network (messages, form submissions)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Static assets: network-first with cache fallback
  event.respondWith(staticNetworkFirst(req));
});

// --- API data: network-first, cache fallback for offline ---
async function apiNetworkFirst(req: Request): Promise<Response> {
  try {
    const fresh = await fetchWithTimeout(req, 5000);
    if (fresh.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// --- Static assets: network-first, cache fallback, SPA fallback ---
async function staticNetworkFirst(req: Request): Promise<Response> {
  if (req.method !== 'GET') return fetch(req);

  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const index = await caches.match('/index.html') || await caches.match('/');
      if (index) return index;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

function fetchWithTimeout(req: Request, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(r => { clearTimeout(timeout); resolve(r); }, e => { clearTimeout(timeout); reject(e); });
  });
}

// --- Web Push ---
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
    payload = { title: 'System22 Field', body: event.data.text() || 'New activity' };
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
