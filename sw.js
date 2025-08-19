const CACHE_NAME = 'asisten-guru-ai-cache-v2'; // Versi cache dinaikkan untuk memicu pembaruan
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/bundle.js',
  '/index.css',
  '/icon.svg',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache for new version');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  // Kita tidak memanggil self.skipWaiting() di sini karena ingin memberikan
  // pengguna kontrol kapan harus memperbarui.
});

// Listener ini menunggu pesan dari klien, yang dikirim
// saat pengguna mengklik tombol "Perbarui".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  // Untuk panggilan API, gunakan jaringan saja. Jangan cache.
  if (event.request.url.includes('/api/')) {
    // Sengaja tidak memanggil event.respondWith() untuk menggunakan perilaku jaringan default.
    return;
  }

  // Untuk semua permintaan lain, gunakan strategi cache-first.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada respons cache, kembalikan.
        if (response) {
          return response;
        }
        // Jika tidak, ambil dari jaringan.
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  // Event ini dijalankan ketika service worker baru menjadi aktif
  // setelah skipWaiting() dipanggil, atau ketika semua tab lama ditutup.
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Hapus cache lama yang tidak ada dalam whitelist.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Perintahkan service worker aktif untuk segera mengambil alih halaman.
      console.log('New service worker activated. Claiming clients.');
      return self.clients.claim();
    })
  );
});