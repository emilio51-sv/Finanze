const CACHE_NAME = "finanze-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const isDocument = event.request.mode === "navigate"
    || new URL(event.request.url).pathname.endsWith("/index.html");

  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            return caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, copy))
              .then(() => response);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request) || await caches.match("./index.html");
          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy))
            .then(() => response);
        }
        return response;
      });
    })
  );
});
