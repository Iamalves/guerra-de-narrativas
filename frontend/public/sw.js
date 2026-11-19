/* Guerra de Narrativas: guarda o jogo para abrir sem internet.
   Com internet, busca sempre a versão nova (e atualiza a cópia guardada); sem internet, usa a cópia. */
const CACHE = 'gn-v1';
const ARQUIVOS = ['./', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png', 'icone-180.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).pathname.startsWith('/api/')) return;
  const url = new URL(req.url);
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonte) return;
  ev.respondWith(
    fetch(req).then(resp => {
      if (resp && (resp.ok || resp.type === 'opaque')) {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return resp;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined)))
  );
});
