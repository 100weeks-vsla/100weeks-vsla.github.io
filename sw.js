/* ──────────────────────────────────────────────────────────────────
   100 Weeks VSLA — Service Worker  v1.0
   Cache-first for shell assets; network-first for Firebase/CDN.
   ────────────────────────────────────────────────────────────────── */

const CACHE_NAME  = 'vsla-v1';
const SHELL_ASSETS = [
  '/',
  'https://100weeks-vsla.github.io/vsla-app/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

/* CDN assets that are safe to cache long-term */
const CDN_PREFIXES = [
  'https://cdnjs.cloudflare.com/',
  'https://cdn.jsdelivr.net/'
];

/* Firebase & auth should always go to network */
const NETWORK_ONLY_PREFIXES = [
  'https://www.gstatic.com/firebasejs/',
  'https://firestore.googleapis.com/',
  'https://identitytoolkit.googleapis.com/',
  'https://securetoken.googleapis.com/'
];

/* ── Install: pre-cache shell ───────────────────────────────────── */
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_ASSETS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

/* ── Activate: purge old caches ────────────────────────────────── */
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

/* ── Fetch ──────────────────────────────────────────────────────── */
self.addEventListener('fetch', function(event){
  var url = event.request.url;

  /* Always network for Firebase */
  if(NETWORK_ONLY_PREFIXES.some(function(p){ return url.startsWith(p); })){
    return; /* fall through to browser default */
  }

  /* Cache-first for CDN libs */
  if(CDN_PREFIXES.some(function(p){ return url.startsWith(p); })){
    event.respondWith(
      caches.match(event.request).then(function(cached){
        if(cached) return cached;
        return fetch(event.request).then(function(response){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
          return response;
        });
      })
    );
    return;
  }

  /* Cache-first for shell (HTML, manifest, icons) */
  if(event.request.mode === 'navigate' || SHELL_ASSETS.some(function(a){ return url.endsWith(a); })){
    event.respondWith(
      caches.match(event.request).then(function(cached){
        return cached || fetch(event.request).then(function(response){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
          return response;
        });
      })
    );
  }
});
