/* ハグクミ sw.js — オフラインでも ひらけるように する */
const CACHE = 'hagukumi-v1.0.2';
const V = '?v=1.0.2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest' + V, 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
].concat([
  'style.css', 'peerjs.min.js', 'qrcode.js',
  'core.js', 'data.js', 'art.js', 'pet.js', 'audio.js', 'ui.js', 'screens.js',
  'minigames.js', 'battle.js', 'battle-ui.js', 'net.js', 'main.js',
].map((f) => f + V));
self.addEventListener('install', (e) => {
  // HTTPキャッシュの ふるい ファイルを つかわないように cache: 'reload'
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // おなじ github.io に ある ほかの ゲームの キャッシュは けさない
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('hagukumi-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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
