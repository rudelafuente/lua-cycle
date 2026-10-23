// VERSION must match core.js and package.json (checked by npm test).
const VERSION='0.5.0',CACHE='lua-shell-'+VERSION;
const ASSETS=['./','./index.html','./style.css','./app.js','./core.js','./tips.js','./storage.js','./report.js','./views/shared.js','./views/home.js','./views/calendar.js','./views/history.js','./views/settings.js','./views/modals.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
// cache:'reload' bypasses the HTTP cache so a new version never stores stale files from the previous one.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lua-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;event.respondWith(caches.match(event.request,{ignoreSearch:event.request.mode==='navigate'}).then(cached=>cached||fetch(event.request)));});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
