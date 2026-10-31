const CACHE="ktbs-static-v3";
const STATIC=["/styles.css","/ktbs-icon.svg"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
 self.skipWaiting();
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
 self.clients.claim();
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 // A navigation fetch handler is required for Chrome to recognise this as an installable PWA.
 if(request.mode==="navigate"){
   event.respondWith(fetch(request).catch(()=>caches.match("/")));
   return;
 }
 if(url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/functions/"))return;
 if(STATIC.includes(url.pathname)){
   event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
 }
});