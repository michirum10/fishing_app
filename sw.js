// sw.js - Service Worker for 釣り天気 PWA
const CACHE_NAME = 'tsuri-tenki-v1';
const STATIC_CACHE = 'tsuri-static-v1';

// キャッシュする静的アセット
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/spots.json',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
];

// インストール: 静的アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(() => {
      // CDN失敗でもインストールは続行
      return caches.open(STATIC_CACHE).then(cache =>
        cache.addAll(STATIC_ASSETS.filter(u => !u.startsWith('http')))
      );
    })
  );
  self.skipWaiting();
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// フェッチ戦略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエスト: Network First（失敗時はキャッシュ）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 外部CDN: Cache First
  if (url.hostname !== location.hostname) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 静的アセット: Cache First（なければNetwork）
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'オフラインです' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // オフラインフォールバック
    const fallback = await caches.match('/index.html');
    return fallback || new Response('オフラインです', { status: 503 });
  }
}
