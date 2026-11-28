/*
 * Service worker: l'app funziona offline servendo tutti i file da una cache versionata.
 * Ogni modifica a un file dell'app richiede di alzare CACHE, così il nuovo insieme
 * di file viene scaricato per intero e mai mescolato con quello precedente.
 */
const CACHE = "finanze-v20";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./js/app.js",
  "./js/core/money.js",
  "./js/core/dates.js",
  "./js/core/cycle.js",
  "./js/core/budget.js",
  "./js/core/voice.js",
  "./js/data/schema.js",
  "./js/data/validate.js",
  "./js/data/migrate.js",
  "./js/data/store.js",
  "./js/ui/context.js",
  "./js/ui/dom.js",
  "./js/ui/icons.js",
  "./js/ui/theme.js",
  "./js/ui/toast.js",
  "./js/ui/sheets.js",
  "./js/ui/items.js",
  "./js/ui/home.js",
  "./js/ui/movimenti.js",
  "./js/ui/fisse.js",
  "./js/ui/menu.js",
  "./js/ui/forms.js"
];

self.addEventListener("install", (e) => {
  /* cache: "reload" salta la cache HTTP del browser: i file arrivano tutti dalla stessa versione */
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })))));
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
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
