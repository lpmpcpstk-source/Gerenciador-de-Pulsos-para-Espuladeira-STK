/**
 * service-worker.js — Gerenciador de Pulso Espuladeira v3.0
 *
 * Estratégia:
 *   - App Shell (HTML, CSS, JS, fontes)  → CacheFirst
 *   - API Supabase (/rest/v1/)           → NetworkFirst com fallback
 *   - Imagens locais                     → CacheFirst
 *
 * Versionamento obrigatório: incrementar CACHE_VERSION a cada deploy.
 */

const CACHE_VERSION   = 'gpe-v3.0.0';
const CACHE_STATIC    = `${CACHE_VERSION}-static`;
const CACHE_API       = `${CACHE_VERSION}-api`;
const CACHE_IMAGES    = `${CACHE_VERSION}-images`;

/* Recursos do app shell — cacheados no install */
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;600;700&display=swap'
];

/* ── INSTALL ─────────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE — limpa caches antigos ─────────────────────── */
self.addEventListener('activate', event => {
  const CURRENT = [CACHE_STATIC, CACHE_API, CACHE_IMAGES];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !CURRENT.includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH — roteador de estratégias ─────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Ignora requests não-GET e extensões de devtools */
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* Supabase API → NetworkFirst */
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(networkFirst(request, CACHE_API, 6000));
    return;
  }

  /* Fontes Google → CacheFirst */
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  /* Imagens locais → CacheFirst */
  if (/\.(png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  /* App shell (HTML/JS/CSS embutidos no index.html) → CacheFirst */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }
});

/* ── Estratégia: CacheFirst ──────────────────────────────── */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso indisponível offline', { status: 503 });
  }
}

/* ── Estratégia: NetworkFirst com timeout ────────────────── */
async function networkFirst(request, cacheName, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timeout);
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Dados em cache indisponíveis. Conecte-se à rede.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/* ── Background Sync (reenviar operações offline) ─────────── */
self.addEventListener('sync', event => {
  if (event.tag === 'gpe-sync-fichas') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'SW_SYNC_REQUEST' }));
}
