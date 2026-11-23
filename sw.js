const CACHE = "finanze-v8";
const ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const isDocument = e.request.mode === "navigate" ||
    new URL(e.request.url).pathname.endsWith("/index.html");

  if (isDocument) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      let response;
      try {
        response = await fetch(e.request);
      } catch (error) {
        const cached = await cache.match(e.request) || await cache.match("./index.html");
        if (cached) return cached;
        throw error;
      }

      if (response.ok) await cache.put(e.request, response.clone());
      return response;
    })());
    return;
  }

  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});