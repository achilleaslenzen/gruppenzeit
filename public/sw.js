const CACHE = 'gruppenzeit-static-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/','/app.js','/style.css','/icon.svg','/manifest.json']))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => { if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin && !new URL(event.request.url).pathname.startsWith('/api/')) event.respondWith(caches.match(event.request).then(hit => hit ?? fetch(event.request))); });
