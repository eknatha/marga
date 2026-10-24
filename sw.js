'use strict';
// Network-first service worker: fresh content when online, full offline use from cache otherwise.
const CACHE = 'marga-0e68a589';
const FILES = ["./","index.html","assets/app.css","assets/app.js","assets/data.js","icon.svg","manifest.webmanifest","cheatsheets/","assets/fonts/bricolage-grotesque.woff2","assets/fonts/source-serif-4.woff2","assets/fonts/source-serif-4-italic.woff2","assets/fonts/jetbrains-mono.woff2","cheatsheets/aws.html","cheatsheets/azure.html","cheatsheets/bash.html","cheatsheets/cicd.html","cheatsheets/docker.html","cheatsheets/kubernetes.html","cheatsheets/linux.html","cheatsheets/networking.html","cheatsheets/prometheus.html","cheatsheets/sre.html","cheatsheets/systemd.html","cheatsheets/terraform.html"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
