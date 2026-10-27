/* 每日目标 · 离线支持
   页面和数据先走网络（保证总是最新）；没网或网络太慢时用上次缓存的版本。
   /api/（进度同步）从不缓存。改了文件不用改这里，下次联网打开就会更新缓存。 */
var CACHE = 'jlpt-v1';
var CORE = ['./', 'index.html', 'grammar.css', 'app.js', 'data.js', 'words.js', 'table.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var fonts = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;
  if (url.pathname.indexOf('/api/') === 0) return;
  if (fonts) { // 字体很少变：有缓存就直接用
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (res) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return res; }); }));
    return;
  }
  var key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(new Promise(function (resolve) {
    var done = false;
    function fromCache() { return caches.match(key, { ignoreSearch: true }); }
    var timer = setTimeout(function () { fromCache().then(function (hit) { if (hit && !done) { done = true; resolve(hit); } }); }, 3500);
    fetch(req).then(function (res) {
      if (res && res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, cp); }); }
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      fromCache().then(function (hit) { if (!done) { done = true; resolve(hit || new Response('离线，且没有缓存', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })); } });
    });
  }));
});
