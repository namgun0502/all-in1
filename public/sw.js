// Janytree Care Minimal Service Worker for PWA Installability
const CACHE_NAME = 'janytree-care-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});