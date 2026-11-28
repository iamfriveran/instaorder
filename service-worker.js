/**
 * INSTAOrder — Service Worker
 * ===========================
 * Objetivo: que la app se pueda instalar y abrir rápido, y que cada vez que
 * se suben archivos nuevos a GitHub los dispositivos reciban la versión nueva.
 *
 *  - Archivos de la app (mismo origen): "red primero". Si hay Internet siempre
 *    se usa lo último publicado en GitHub Pages; sin Internet se usa la copia
 *    guardada para poder abrir la app (los pedidos en tiempo real igualmente
 *    requieren conexión).
 *  - SDK de Firebase y tipografías (CDN): copia en caché + actualización en
 *    segundo plano.
 *  - NUNCA se interceptan las conexiones a la base de datos (firebaseio.com,
 *    googleapis de autenticación): los pedidos no pasan por la caché.
 *
 * Al publicar una versión nueva, cambia CACHE_VERSION (ver README › Actualizar).
 * Los pedidos viven en Firebase y la bandeja local en localStorage, por lo que
 * actualizar la app no borra órdenes.
 */

const CACHE_VERSION = "instaorder-v1.5.2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./firebase-config.js",
  "./firebase-service.js",
  "./catalog.js",
  "./manifest.json",
  "./js/auth.js",
  "./js/availability.js",
  "./js/components.js",
  "./js/external.js",
  "./js/pedidosya.js",
  "./js/install.js",
  "./js/kitchen.js",
  "./js/outbox.js",
  "./js/router.js",
  "./js/settings.js",
  "./js/sound.js",
  "./js/state.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/waiter.js",
  "./js/whatsapp.js",
  "./assets/logo.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
];

const NEVER_CACHE = [/firebaseio\.com/, /firebasedatabase\.app/, /identitytoolkit\.googleapis\.com/, /securetoken\.googleapis\.com/];
const CDN = [/gstatic\.com\/firebasejs/, /fonts\.googleapis\.com/, /fonts\.gstatic\.com/, /cdn\.jsdelivr\.net\/npm\/tesseract/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL.map((u) => new Request(u, { cache: "reload" }))))
  );
  // No se activa solo: la app muestra "Actualizar ahora" para no recargar
  // a mitad de un pedido. La primera instalación se activa de inmediato.
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("instaorder-") && k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NEVER_CACHE.some((r) => r.test(url.href))) return;

  if (CDN.some((r) => r.test(url.href))) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === "navigate") return (await cache.match("./index.html")) || Response.error();
    return Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_VERSION);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

/* Tocar una notificación del sistema abre/enfoca INSTAOrder. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (all.length) return all[0].focus();
    return self.clients.openWindow("./index.html#/mesero");
  })());
});
