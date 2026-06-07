// ── SERVICE WORKER — COMPUCEL SOLUTIONS JM ────────────────────────
const CACHE_NAME = 'compucel-v1';
const OFFLINE_URL = '/admin.html';

// Archivos a cachear para uso offline
const CACHE_ASSETS = [
  '/admin.html',
  '/index.html', 
  '/portal.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&display=swap'
];

// Instalar SW y cachear archivos
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_ASSETS.map(url => {
        return new Request(url, { cache: 'reload' });
      })).catch(function(err) {
        console.log('Cache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activar SW y limpiar caches viejos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network first, luego cache
self.addEventListener('fetch', function(event) {
  // Solo manejar GET requests
  if (event.request.method !== 'GET') return;
  
  // No interceptar requests a Supabase (siempre necesitan red)
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('api.callmebot.com')) return;
  if (event.request.url.includes('wa.me')) return;
  if (event.request.url.includes('qrserver.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Guardar en cache si es exitoso
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Sin red: usar cache
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Si no hay cache, mostrar admin offline
          if (event.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Notificaciones push (para futuras notificaciones)
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var options = {
    body: data.body || 'Nueva notificación de COMPUCEL',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/admin.html' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'COMPUCEL SOLUTIONS JM', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/admin.html')
  );
});
