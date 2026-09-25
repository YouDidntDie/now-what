// ═══════════════════════════════════════════════════════════════════════════
//  FIELD PROTOCOL — Service Worker
//  Cache-first for all local assets. Network-first for Google Fonts.
//  Version bump CACHE_VERSION to force a full refresh on next load.
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'fp-v1';
const FONT_CACHE    = 'fp-fonts-v1';

// Everything that must be available offline
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',

  // Manifest & system data
  './data/site_manifest.json',
  './data/rules.json',
  './data/gear.json',
  './data/tasks.json',
  './data/skill_tree.json',
  './data/scenario_components.json',
  './data/atlas.json',

  // Atlas — all continents
  './data/atlas_africa.json',
  './data/atlas_americas_north.json',
  './data/atlas_americas_south.json',
  './data/atlas_asia.json',
  './data/atlas_europe.json',
  './data/atlas_oceania.json',
  './data/atlas_polar.json',

  // Encyclopedia — all domains
  './data/encyclopedia_fire_part1.json',
  './data/encyclopedia_fire_part2.json',
  './data/encyclopedia_food_part1.json',
  './data/encyclopedia_food_part2.json',
  './data/encyclopedia_knots_part1.json',
  './data/encyclopedia_knots_part2.json',
  './data/encyclopedia_medical_part1.json',
  './data/encyclopedia_medical_part2.json',
  './data/encyclopedia_navigation_part1.json',
  './data/encyclopedia_navigation_part2.json',
  './data/encyclopedia_psychology_part1.json',
  './data/encyclopedia_psychology_part2.json',
  './data/encyclopedia_shelter_part1.json',
  './data/encyclopedia_shelter_part2.json',
  './data/encyclopedia_shelter_part3.json',
  './data/encyclopedia_water_part1.json',
  './data/encyclopedia_water_part2.json',
];

// ── Install: pre-cache everything ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts — network-first, fall back to font cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(networkFirstFonts(event.request));
    return;
  }

  // Everything else (local assets) — cache-first
  event.respondWith(cacheFirst(event.request));
});

// Cache-first: serve from cache, update cache in background if network available
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  // Not in cache yet — fetch, cache, and return
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fully offline and not cached — return offline page if it's a navigation
    if (request.mode === 'navigate') {
      const cached = await caches.match('./index.html');
      if (cached) return cached;
    }
    return new Response('Offline — resource not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Network-first for fonts: try network, cache on success, fall back to cache
async function networkFirstFonts(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(FONT_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503 });
  }
}

// ── Message: force update on demand ───────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
