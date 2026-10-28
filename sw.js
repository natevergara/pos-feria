/* ============================================================
   POS FERIA — Service Worker
   Estrategia: CACHE-FIRST ESTRICTA (100% offline / modo avión)
   ------------------------------------------------------------
   - install  : precarga todos los recursos locales de la app.
   - activate : borra cachés de versiones anteriores + clients.claim().
   - fetch    : responde exclusivamente desde caché; en un fallo devuelve
                un error offline y nunca consulta la red.
   ============================================================ */
'use strict';

/* IMPORTANTE: al cambiar cualquier archivo de la app hay que subir esta
   versión (v1 → v2 → …); con cache-first estricto el navegador seguirá
   sirviendo la copia antigua hasta que cambie el nombre de la caché. */
const CACHE_NAME = 'pos-feria-v3';

/* Recursos locales imprescindibles. Todos relativos: funcionan tanto en
   file:// como servidos desde un subdirectorio (scope "./"). */
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

/* ------------------------------------------------------------
   INSTALL — precarga atómica del app shell
   ------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // La única actividad de red permitida ocurre aquí, durante la
      // instalación inicial, para precargar recursos locales del mismo origen.
      // Un shell incompleto no debe activarse como si estuviera listo.
      const entries = await Promise.all(APP_SHELL.map(async (url) => {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (!response.ok) {
          throw new Error('No se pudo precachear ' + url + ': HTTP ' + response.status);
        }
        return [url, response];
      }));
      await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
      // Toma control de la app sin esperar a que se cierren las pestañas.
      await self.skipWaiting();
    })()
  );
});

/* ------------------------------------------------------------
   ACTIVATE — limpieza de versiones viejas + claim
   ------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('pos-feria-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      // Habilita navigationPreload? No: se desactiva para no tocar la red.
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch (_) {
          /* Navegadores sin soporte: ignorar. */
        }
      }

      // Control inmediato de los clientes ya abiertos.
      await self.clients.claim();
    })()
  );
});

/* ------------------------------------------------------------
   FETCH — cache-first estricto
   ------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignora esquemas no HTTP(S), como chrome-extension://.
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    (async () => {
      if (url.origin !== self.location.origin || request.method !== 'GET') {
        return new Response('Solicitud bloqueada: POS Feria funciona sin red.', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      const cache = await caches.open(CACHE_NAME);
      // 1) Caché primero (incluye navegaciones y recursos del shell).
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      // 1b) Variante sin hash/query para navegaciones (./index.html).
      if (request.mode === 'navigate') {
        const shell = await cache.match('./index.html', { ignoreSearch: true });
        if (shell) return shell;
      }

      // Sin fallback de red: un miss nunca genera una petición, incluso si
      // el dispositivo vuelve a tener conexión.
      return new Response('Recurso no disponible sin conexión.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })()
  );
});
