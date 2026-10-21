const V = "kaseb-v1", SHELL = V + "-shell", AUDIO = "kaseb-audio";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("kaseb-v") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// The page asks us to keep the audio files that sit next to index.html available offline.
self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "cache") return;
  e.waitUntil(caches.open(AUDIO).then(async (c) => {
    for (const u of e.data.urls) {
      if (await c.match(u)) continue;
      try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (_) {}
    }
  }));
});

async function audio(req) {
  const cache = await caches.open(AUDIO);
  const res = await cache.match(req.url);
  if (!res) return fetch(req);
  const range = req.headers.get("range");
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const s = m && m[1] ? +m[1] : 0;
  const en = m && m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(s, en + 1), { status: 206, headers: {
    "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes",
    "Content-Range": "bytes " + s + "-" + en + "/" + buf.byteLength, "Content-Length": String(en - s + 1) } });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes("/audio/")) { e.respondWith(audio(req)); return; }
  if (/(^|\.)(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(SHELL).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => caches.match("./index.html"))));
});
