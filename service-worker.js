const APP_VERSION = "2026-03-20-01";
const CACHE_NAME = "expense-tracker-static-" + APP_VERSION;
const CACHE_PREFIX = "expense-tracker-static-";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=2026-03-20-01",
  "./app.js?v=2026-03-20-01",
  "./manifest.webmanifest?v=2026-03-20-01",
  "./icons/app-icon.svg?v=2026-03-20-01",
  "./icons/app-icon-192.png?v=2026-03-20-01",
  "./icons/app-icon-512.png?v=2026-03-20-01",
  "./icons/apple-touch-icon.png?v=2026-03-20-01"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_ASSETS);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isStaticAsset(requestUrl.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

function networkFirst(request) {
  return fetch(request).then(function (response) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(function (cache) {
      cache.put(request, copy);
    });
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      return cached || caches.match("./index.html");
    });
  });
}

function staleWhileRevalidate(request) {
  return caches.match(request).then(function (cached) {
    const networkPromise = fetch(request).then(function (response) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(request, copy);
      });
      return response;
    }).catch(function () {
      return cached;
    });

    return cached || networkPromise;
  });
}

function isStaticAsset(pathname) {
  return (
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".webmanifest") ||
    pathname.endsWith(".html") ||
    pathname === "/" ||
    pathname.endsWith("/index.html")
  );
}
