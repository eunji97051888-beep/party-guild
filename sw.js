const CACHE = 'party-manager-v35';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./index.html','./icon-192.png','./offline.html'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',e=>{if(e.request.mode!=='navigate')return;e.respondWith(fetch(e.request).catch(()=>caches.match('./offline.html')));});
