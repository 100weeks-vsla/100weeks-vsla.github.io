/* ──────────────────────────────────────────────────────────────────
   100 Weeks VSLA — Service Worker  v2.0
   Network-first for shell (HTML) so updates always show immediately.
   Cache-first for CDN libs. Network-only for Firebase/auth.
   ────────────────────────────────────────────────────────────────── */

const CACHE_NAME  = 'vsla-v2'; // bump this every time you deploy a real update
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

/* CDN assets that are safe to cache long-term */
const CDN_PREFIXES = [
  'https://cdnjs.cloudflare.com/',
  'https://cdn.jsdelivr.net/'
];

/* Firebase, auth, and Google Identity Services should always go to network */
const NETWORK_ONLY_PREFIXES = [
  'https://www.gstatic.com/firebasejs/',
  'https://firestore.googleapis.com/',
  'https://identitytoolkit.googleapis.com/',
  'https://securetoken.googleapis.com/',
  'https://accounts.google.com/',
  'https://www.googleapis.com/',
  'https://sheets.googleapis.com/'
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

  /* Always network for Firebase / Google auth & APIs */
  if(NETWORK_ONLY_PREFIXES.some(function(p){ return url.startsWith(p); })){
    return; /* fall through to browser default, never intercept */
  }

  /* Cache-first for CDN libs (these rarely change) */
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

  /* Network-first for the app shell (HTML, manifest, icons)
     — always tries to fetch the latest version first;
     only falls back to cache if the network request fails (offline). */
  if(event.request.mode === 'navigate' || SHELL_ASSETS.some(function(a){ return url.endsWith(a); })){
    event.respondWith(
      fetch(event.request).then(function(response){
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
        return response;
      }).catch(function(){
        return caches.match(event.request);
      })
    );
  }
});
