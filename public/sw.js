/* Bardejov — keep the dusk walk on the square when the signal drops. */
const CACHE = 'bv-dusk-2';
const LANGS = ['en', 'cs', 'pl', 'hu', 'uk'];
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  ...LANGS.map((id) => `./${id}/`),
  './assets/square-wide-800.avif',
  './assets/square-800.avif',
  './assets/then-800.avif',
  './assets/basilica-800.avif',
  './assets/radnica-800.avif',
  './assets/walls-800.avif',
  './assets/houses-800.avif',
  './assets/synagogue-800.avif',
  './assets/spa-800.avif',
  './assets/square-wide-800.webp',
  './assets/square-800.webp',
  './assets/then-800.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isPage(request, url) {
  return request.mode === 'navigate' || (request.destination === 'document' && sameOrigin(url));
}

function isKeep(url) {
  if (!sameOrigin(url)) return false;
  const path = url.pathname;
  return (
    path.includes('/assets/') ||
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('.woff2') ||
    path.endsWith('.json') ||
    path.endsWith('.webmanifest') ||
    path.endsWith('.svg')
  );
}

function langShell(url) {
  const path = url.pathname.replace(/\/+$/, '');
  const m = path.match(/\/(en|cs|pl|hu|uk)(?:\/index\.html)?$/);
  return m ? `./${m[1]}/` : './index.html';
}

async function matchPage(cache, request, url) {
  const tries = [
    request,
    url.pathname,
    url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : `${url.pathname}/`,
    langShell(url),
    `${String(langShell(url)).replace(/\/$/, '')}/index.html`,
  ];
  for (const key of tries) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  return (await cache.match('./index.html')) || (await cache.match('./'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!sameOrigin(url)) return;

  if (isPage(req, url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const byReq = res.clone();
          const byLang = res.clone();
          caches.open(CACHE).then((c) => {
            c.put(req, byReq);
            c.put(langShell(url), byLang).catch(() => {});
          });
          return res;
        })
        .catch(() => caches.open(CACHE).then((c) => matchPage(c, req, url)))
    );
    return;
  }

  if (!isKeep(url)) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
