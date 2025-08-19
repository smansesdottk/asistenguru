# Asisten Guru AI

Asisten Guru AI adalah aplikasi web modern yang dirancang untuk memberdayakan para guru dengan menyediakan akses cepat dan percakapan ke data sekolah yang relevan. Dibuat oleh A. Indra Malik (SMAN 11 Makassar). Dibangun dengan tumpukan teknologi serverless menggunakan Vercel dan didukung oleh model bahasa canggih dari Google Gemini, aplikasi ini dapat menjawab pertanyaan terkait siswa, guru, jadwal, dan informasi sekolah lainnya secara instan.

## ✨ Fitur Utama

- **Antarmuka Percakapan**: Tanyakan apa pun dalam bahasa alami dan dapatkan jawaban yang relevan dari AI.
- **Akses Data Terpusat**: Mengambil data secara real-time dari beberapa Google Sheets, memastikan informasi selalu up-to-date.
- **Keamanan Fleksibel**:
  - **Otentikasi Google OAuth 2.0 (Opsional)**: Jika dikonfigurasi, dapat memastikan hanya pengguna dengan akun Google Workspace institusi yang dapat login.
  - **Mode Login Hanya Admin**: Jika kredensial Google tidak diatur, aplikasi secara otomatis beralih ke mode login aman hanya dengan kata sandi admin.
  - **Sesi Aman (JWT)**: Menggunakan JSON Web Tokens yang disimpan dalam cookie `HttpOnly` untuk manajemen sesi yang aman.
- **Arsitektur Serverless**: Seluruh aplikasi, baik frontend maupun backend, berjalan di Vercel, menghilangkan kebutuhan untuk mengelola server sendiri.
- **Rotasi Kunci API**: Mendukung banyak kunci API Gemini dan merotasinya secara otomatis untuk mendistribusikan beban dan menghindari batas kuota.
- **Status Sistem**: Indikator real-time untuk memeriksa konektivitas ke layanan penting seperti Google Sheets dan Gemini API.
- **Dapat Diinstal (PWA)**: Dapat diinstal di perangkat seluler (Android/iOS) atau desktop langsung dari browser untuk akses cepat seperti aplikasi native, lengkap dengan dukungan offline.

## 🚀 Tumpukan Teknologi

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Vercel Serverless Functions (TypeScript)
- **Model AI**: Google Gemini API (`gemini-2.5-flash`)
- **Sumber Data**: Google Sheets (diakses sebagai CSV)
- **Autentikasi**: `jose` untuk JWT, Google OAuth 2.0
- **Platform**: Vercel

## 📲 Instalasi di Perangkat (PWA)

Aplikasi ini dirancang sebagai **Progressive Web App** (PWA), yang berarti Anda dapat menginstalnya di perangkat Anda untuk pengalaman yang lebih cepat dan terintegrasi, bahkan saat offline.

### Android (via Google Chrome)
1. Buka aplikasi di browser Google Chrome.
2. Ketuk tombol menu (tiga titik vertikal) di pojok kanan atas.
3. Pilih **"Instal aplikasi"** atau **"Tambahkan ke layar utama"**.
4. Konfirmasi instalasi, dan ikon aplikasi akan muncul di layar utama Anda.

### iOS (via Safari)
1. Buka aplikasi di browser Safari.
2. Ketuk tombol **Bagikan** (ikon kotak dengan panah ke atas) di bilah bawah.
3. Gulir ke bawah dan pilih **"Tambahkan ke Layar Utama"** (*Add to Home Screen*).
4. Beri nama aplikasi jika perlu, lalu ketuk **"Tambah"** (*Add*).

Setelah diinstal, aplikasi dapat diluncurkan langsung dari layar utama seperti aplikasi lainnya.

## 🎨 Mengganti Logo Aplikasi

Logo aplikasi ini dikontrol oleh dua file SVG di folder root proyek:

- `icon.svg`: Digunakan sebagai ikon utama untuk PWA (saat diinstal di layar utama) dan ikon sentuh Apple. Logo ini harus berbentuk persegi agar terlihat bagus.
- `favicon.svg`: Digunakan sebagai ikon kecil yang muncul di tab browser (favicon). Pastikan logo ini tetap jelas saat ditampilkan dalam ukuran yang sangat kecil.

Untuk mengganti logo, cukup ganti konten file `icon.svg` dan `favicon.svg` di **folder root proyek** dengan file SVG Anda sendiri. Pastikan nama filenya tetap sama.

## 🚀 Panduan Deployment

### Metode 1: Deployment via GitHub (Sangat Direkomendasikan)

Ini adalah cara paling stabil dan direkomendasikan untuk men-deploy aplikasi. Anda akan membuat salinan proyek di akun GitHub Anda sendiri, lalu menghubungkannya ke Vercel.

#### Langkah 1: Persiapan (Wajib Disiapkan Terlebih Dahulu)

Sebelum memulai, pastikan Anda sudah memiliki semua informasi berikut. Ini akan membuat prosesnya lancar dan cepat.

-   **Akun GitHub**: Anda memerlukannya untuk membuat salinan proyek dan login ke Vercel. Jika belum punya, daftar [di sini](https://github.com).
-   **Kunci API Gemini**: Dapatkan dari [Google AI Studio](https://aistudio.google.com/app/apikey). Anda bisa membuat beberapa kunci dan memisahkannya dengan koma.
-   **URL Google Sheet**: Buka Google Sheet Anda, lalu pilih `File > Bagikan > Publikasikan di web`. Pilih `Seluruh Dokumen` dan format `Comma-separated values (.csv)`. Salin URL yang dihasilkan. Ulangi untuk semua sheet yang diperlukan.
-   **Kredensial Google OAuth (Opsional)**: Jika ingin menggunakan login Google, siapkan dari [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
    *   Google Client ID
    *   Google Client Secret
    *   Domain Google Workspace Anda (contoh: `sekolahanda.sch.id`)

#### Langkah 2: Buat Salinan Proyek (Fork) ke Akun GitHub Anda

"Fork" adalah proses membuat salinan pribadi dari sebuah repositori. Ini memungkinkan Anda untuk memiliki versi proyek sendiri.

1.  Buka halaman repositori proyek ini di GitHub: [https://github.com/ais-sman11mks/asisten-guru-ai-vercel](https://github.com/ais-sman11mks/asisten-guru-ai-vercel).
2.  Di pojok kanan atas halaman, klik tombol **"Fork"**.
3.  GitHub akan meminta Anda untuk mengonfirmasi. Anda bisa biarkan nama repositori tetap sama. Klik **"Create fork"**.
4.  Sekarang Anda memiliki salinan repositori ini di bawah akun GitHub Anda.

#### Langkah 3: Hubungkan dan Deploy Proyek di Vercel

1.  Buka [Vercel](https://vercel.com) dan login menggunakan akun GitHub Anda.
2.  Di dasbor Vercel, klik **"Add New..." -> "Project"**.
3.  Di halaman "Import Git Repository", Vercel akan menampilkan daftar repositori dari akun GitHub Anda. Pilih repositori `asisten-guru-ai` yang baru saja Anda fork, lalu klik **"Import"**.
4.  Vercel akan secara otomatis mendeteksi bahwa ini adalah proyek React/Vercel Functions dan akan menampilkan halaman **"Configure Project"**.

#### Langkah 4: Konfigurasi Environment Variables di Vercel

Ini adalah bagian terpenting. Di halaman "Configure Project", buka bagian **"Environment Variables"**. Anda perlu menambahkan semua konfigurasi dari file `env.txt`.

1.  Salin nama setiap variabel dari `env.txt` (misalnya, `ORGANIZATION_NAME_FULL`) ke kolom "Name" di Vercel.
2.  Isi nilainya di kolom "Value" sesuai data yang sudah Anda siapkan di Langkah 1.
3.  **PENTING**:
    *   **`APP_BASE_URL`**: Karena Anda belum tahu URL finalnya, isi dengan placeholder sementara, contoh: `https://placeholder.com`. **Kita akan perbaiki ini nanti.**
    *   **`JWT_SECRET`**: Buat string acak yang sangat panjang dan aman (64+ karakter). Gunakan generator online seperti [jwtsecrets.com](https://jwtsecrets.com/#generator).
    *   **`ORGANIZATION_DATA_SOURCES` & `SHEET_NAMES`**: Pastikan urutan URL dan Nama sama persis.
    *   **Login Google (Opsional)**: Jika tidak ingin pakai login Google, biarkan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_WORKSPACE_DOMAIN` **kosong**. Aplikasi akan otomatis beralih ke mode "Hanya Admin".

#### Langkah 5: Mulai Deployment

Setelah semua variabel terisi, klik tombol **"Deploy"**. Vercel akan mulai membangun dan men-deploy aplikasi Anda. Proses ini mungkin memakan waktu beberapa menit.

Setelah selesai, Vercel akan memberikan Anda URL produksi (contoh: `https://asisten-guru-ai-xxxx.vercel.app`). **Selamat, aplikasi Anda sudah online!** Namun, masih ada satu langkah terakhir yang krusial.

#### Langkah 6: Konfigurasi Final (Wajib Agar Login Berfungsi!)

Sekarang kita perbaiki placeholder `APP_BASE_URL` dan mengonfigurasi Google.

1.  **Perbarui `APP_BASE_URL` di Vercel**:
    *   Di dasbor proyek Vercel Anda, buka tab **"Settings" -> "Environment Variables"**.
    *   Cari variabel `APP_BASE_URL`, klik menu tiga titik, lalu pilih **"Edit"**.
    *   Ganti nilai placeholder (`https://placeholder.com`) dengan **URL produksi asli** yang baru saja Anda dapatkan dari Vercel. **PENTING: Jangan sertakan garis miring (`/`) di akhir URL.**
    *   Klik **"Save"**.
    *   Perubahan ini memerlukan deployment ulang. Buka tab **"Deployments"**, cari deployment teratas (yang terbaru), klik menu tiga titik di sebelah kanan, dan pilih **"Redeploy"**. Klik "Redeploy" lagi untuk konfirmasi.

2.  **Perbarui URI Pengalihan Google (Jika Menggunakan Login Google)**:
    *   Kembali ke [Google Cloud Console](https://console.cloud.google.com/apis/credentials) Anda.
    *   Buka kredensial OAuth 2.0 Anda.
    *   Di bagian **"Authorized redirect URIs"**, tambahkan URL callback produksi Anda: `https://URL-PRODUKSI-ANDA/api/auth-callback`. Ganti `URL-PRODUKSI-ANDA` dengan URL Vercel Anda.

Selesai! Aplikasi Anda sekarang sepenuhnya terkonfigurasi dan siap digunakan.

---

### Metode 2: Deployment Manual via Vercel CLI (Alternatif)

Gunakan metode ini untuk men-deploy langsung dari terminal tanpa menghubungkan repositori Git secara formal ke Vercel.

1.  **Instalasi**: Unduh kode proyek, lalu instal Vercel CLI (`npm install -g vercel`) dan dependensi proyek (`npm install`).
2.  **Login**: Jalankan `vercel login` di terminal.
3.  **Buat `.env.local`**: Salin `env.txt` menjadi `.env.local` dan isi semua nilainya.
4.  **Hubungkan Proyek**: Jalankan `vercel` untuk menghubungkan folder lokal Anda ke proyek baru di Vercel.
5.  **Tambahkan Variabel ke Vercel**: Tambahkan semua variabel dari `.env.local` ke Vercel menggunakan perintah `vercel env add NAMA_VARIABEL "nilainya"`.
6.  **Build & Deploy**:
    ```bash
    vercel build --prod
    vercel deploy --prebuilt --prod
    ```
7.  **Konfigurasi Final**: Ikuti **Langkah 6** dari "Metode 1" di atas untuk memperbarui `APP_BASE_URL` dan URI pengalihan Google.

---

## 🛠️ Menjalankan Secara Lokal

1.  **Prasyarat**:
    - Node.js (v20+)
    - Vercel CLI: `npm install -g vercel`
2.  **Login Vercel CLI**:
    ```bash
    vercel login
    ```
3.  **Konfigurasi `.env`**: Buat salinan dari `env.txt` yang sudah diisi, dan ganti namanya menjadi `.env.local` di folder root proyek. Pastikan `APP_BASE_URL` diisi dengan `http://localhost:3000`.
4.  **Konfigurasi Google OAuth Lokal (Jika Digunakan)**: Di Google Cloud Console, tambahkan URI redirect berikut untuk development: `http://localhost:3000/api/auth-callback`
5.  **Jalankan Server Development**:
    ```bash
    vercel dev
    ```
    Aplikasi akan terbuka di `http://localhost:3000`.
