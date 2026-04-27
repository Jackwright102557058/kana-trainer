const CACHE_NAME = 'mode-atlas-qol-v2-7-0';
const CORE = [
  './','index.html','kana.html','default.html','reverse.html','test.html','wordbank.html',
  'cloud-sync.js','firebase-config.js','site.webmanifest',
  'assets/mode-atlas-qol.css','assets/mode-atlas-qol.js',
  'assets/mode-atlas-qol-batch.js',
  'assets/mode-atlas-about.js','assets/mode-atlas-save-sync-ui.js','assets/mode-atlas-visit-flows.js',
  'assets/mode-atlas-icon.svg','assets/favicon-32.png','assets/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE).catch(() => null)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const clone = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => null); return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('index.html'))));
});
