/* ハグクミ sw.js — オフラインでも ひらけるように する */
const CACHE = 'hagukumi-v1.0.0';
const V = '?v=1.0.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
].concat([
  'css/style.css', 'lib/peerjs.min.js', 'lib/qrcode.js',
  'js/core.js', 'js/data.js', 'js/art.js', 'js/pet.js', 'js/audio.js', 'js/ui.js', 'js/screens.js',
  'js/minigames.js', 'js/battle.js', 'js/battle-ui.js', 'js/net.js', 'js/main.js',
].map((f) => f + V));
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // ページ本体: さいしんを さきに、だめなら キャッシュ
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html')));
    return;
  }
  if (url.origin === location.origin || url.host.endsWith('fonts.gstatic.com') || url.host.endsWith('fonts.googleapis.com')) {
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
