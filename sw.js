/* ============================================================
   PKN CMS — Service Worker (PWA Offline Support)
   ============================================================ */

const CACHE_NAME    = 'pkn-cms-v2';
const CACHE_STATIC  = 'pkn-static-v2';
const CACHE_DYNAMIC = 'pkn-dynamic-v2';

/* File yang di-cache saat install */
const STATIC_FILES = [
  './',
  './index.html',
  './dashboard.html',
  './daily-report.html',
  './reports.html',
  './detail-report.html',
  './progress.html',
  './material.html',
  './workers.html',
  './equipment.html',
  './documentation.html',
  './message.html',
  './analytics.html',
  './users.html',
  './setting.html',
  './assets/css/variables.css',
  './assets/css/layout.css',
  './assets/css/components.css',
  './assets/css/login.css',
  './assets/css/pages/dashboard.css',
  './assets/css/pages/daily-report.css',
  './assets/css/pages/reports.css',
  './assets/css/pages/detail-report.css',
  './assets/css/pages/progress.css',
  './assets/css/pages/material.css',
  './assets/css/pages/workers.css',
  './assets/css/pages/equipment.css',
  './assets/css/pages/documentation.css',
  './assets/css/pages/message.css',
  './assets/css/pages/analytics.css',
  './assets/css/pages/setting.css',
  './assets/js/nav.js',
  './assets/js/app.js',
  './assets/js/sidebar-template.js',
  './assets/js/header-template.js',
  './assets/js/login.js',
  './assets/js/dashboard.js',
  './assets/js/daily-report.js',
  './assets/js/reports.js',
  './assets/js/detail-report.js',
  './assets/js/progress.js',
  './assets/js/material.js',
  './assets/js/workers.js',
  './assets/js/equipment.js',
  './assets/js/documentation.js',
  './assets/js/message.js',
  './assets/js/analytics.js',
  './assets/js/users.js',
  './assets/js/setting.js',
  './assets/img/logo.svg',
  './assets/img/favicon.svg',
  './manifest.json'
];

/* CDN libraries yang di-cache */
const CDN_FILES = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

/* ── Install: cache semua file statis ────────────────────── */
self.addEventListener('install', event => {
  console.log('[SW] Installing PKN CMS Service Worker...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(cache => {
        console.log('[SW] Caching static files...');
        return cache.addAll(STATIC_FILES).catch(err => {
          console.warn('[SW] Some static files failed to cache:', err);
        });
      }),
      caches.open(CACHE_DYNAMIC).then(cache => {
        console.log('[SW] Caching CDN files...');
        return Promise.allSettled(
          CDN_FILES.map(url => cache.add(url).catch(e => console.warn('[SW] CDN cache fail:', url)))
        );
      })
    ]).then(() => {
      console.log('[SW] Install complete!');
      return self.skipWaiting();
    })
  );
});

/* ── Activate: hapus cache lama ──────────────────────────── */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      );
    }).then(() => {
      console.log('[SW] Activated!');
      return self.clients.claim();
    })
  );
});

/* ── Fetch: Cache First, fallback Network ────────────────── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Skip non-GET dan chrome-extension */
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* Strategi: Cache First → Network → Offline fallback */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request.clone())
        .then(response => {
          if (!response || response.status !== 200) return response;

          /* Cache response baru secara dinamis */
          const responseClone = response.clone();
          caches.open(CACHE_DYNAMIC).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          /* Offline fallback */
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

/* ── Push notification (future) ──────────────────────────── */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title   = data.title   || 'PKN CMS';
  const options = {
    body:    data.body    || 'Ada notifikasi baru',
    icon:    './assets/img/icon-192.png',
    badge:   './assets/img/icon-72.png',
    vibrate: [200, 100, 200],
    data:    { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || './'));
});
