// Network first, so a published update shows up the next time the app is
// opened online; the cache is only the offline fallback. Entries are stored
// in localStorage, not here, so clearing this cache never touches them.

const CACHE = 'kbt-dagbok-v1';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // A navigate-mode Request can't be re-created with options, so fetch by URL.
  const network = (req.mode === 'navigate'
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(req, { cache: 'no-cache' })
  ).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy));
    }
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  event.respondWith((async () => {
    try {
      return await Promise.race([
        network,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS))
      ]);
    } catch {
      const cached = await caches.match(req, { ignoreSearch: true })
        || (req.mode === 'navigate' ? await caches.match('./index.html') : undefined);
      return cached || network;
    }
  })());
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    caches.open(CACHE).then((cache) => cache.put(req, copy));
  }
  return res;
}
