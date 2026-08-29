/* ==========================================================================
   BUILD.TECH — Service Worker
   Rôle : (1) rendre le site installable (PWA), (2) mettre en cache le strict
   nécessaire pour un chargement plus rapide, (3) afficher les notifications
   push si elles sont configurées (voir README.md, partie 9.2).
   ========================================================================== */
var CACHE_NAME = "buildtech-cache-v1";
var CORE_ASSETS = [
  "./index.html",
  "./assets/css/style.css",
  "./assets/img/favicon.svg",
  "./assets/img/logo-placeholder.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(CORE_ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Stratégie "network first, fallback cache" : on ne sert jamais de données
// obsolètes si le réseau répond, mais le site reste consultable hors-ligne
// pour les pages déjà visitées.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  // Ignore tout ce qui n'est pas http(s) (ex. requêtes chrome-extension://
  // injectées par des extensions du navigateur) : l'API Cache ne les supporte
  // pas et les laisser passer sans interception évite les erreurs console.
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); }).catch(function () {});
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) { return cached || Response.error(); });
      })
  );
});

self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: "Build.Tech", body: "Vous avez une nouvelle notification." }; }
  var title = data.title || "Build.Tech";
  var options = {
    body: data.body || "Vous avez reçu une nouvelle réponse sur Build.Tech.",
    icon: "./assets/img/favicon.svg",
    badge: "./assets/img/favicon.svg",
    data: { url: data.url || "./chat.html" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "./chat.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf(url.replace("./", "")) !== -1) return clients[i].focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
