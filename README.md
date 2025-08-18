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

## 🚀 Panduan Deployment

### Metode 1: Tombol "Deploy to Vercel" (Sangat Direkomendasikan & Anti Gagal)

Ini adalah cara termudah dan tercepat untuk men-deploy aplikasi. Anda akan dipandu melalui proses penyiapan otomatis.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fais-sman11mks%2Fasisten-guru-ai-vercel&env=SCHOOL_NAME_FULL,SCHOOL_NAME_SHORT,APP_VERSION,APP_BASE_URL,GEMINI_API_KEYS,GOOGLE_SHEET_CSV_URLS,ADMIN_PASSWORD,JWT_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,GOOGLE_WORKSPACE_DOMAIN&project-name=asisten-guru-ai&repository-name=asisten-guru-ai)

#### Langkah 1: Persiapan Wajib (Siapkan Ini Dulu!)

Sebelum menekan tombol, pastikan Anda sudah memiliki semua informasi berikut. Ini akan membuat prosesnya lancar.

1.  **Akun GitHub**: Anda memerlukannya untuk login ke Vercel dan membuat salinan (fork) proyek.
2.  **Kunci API Gemini**: Dapatkan dari [Google AI Studio](https://aistudio.google.com/app/apikey). Anda bisa membuat beberapa kunci dan memisahkannya dengan koma.
3.  **URL Google Sheet**: Buka Google Sheet Anda, lalu pilih `File > Bagikan > Publikasikan di web`. Pilih `Seluruh Dokumen` dan format `Comma-separated values (.csv)`. Salin URL yang dihasilkan. Ulangi untuk semua sheet yang diperlukan.
4.  **Kredensial Google OAuth (Opsional)**: Jika ingin menggunakan login Google, siapkan dari [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
    *   **Google Client ID**
    *   **Google Client Secret**
    *   **Google Workspace Domain** (contoh: `sekolahanda.sch.id`)

#### Langkah 2: Proses Deployment di Vercel

1.  **Klik Tombol "Deploy"** di atas.
2.  **Login & Buat Proyek**: Anda akan diarahkan ke Vercel. Login dengan akun GitHub Anda. Vercel akan meminta Anda untuk membuat repositori Git baru (ini adalah salinan proyek untuk Anda). Beri nama dan klik **"Create"**.
3.  **Isi Environment Variables**: Ini adalah bagian terpenting. Vercel akan menampilkan formulir untuk mengisi semua konfigurasi.
    *   Isi semua variabel sesuai data yang sudah Anda siapkan.
    *   **UNTUK `APP_BASE_URL`**: Karena Anda belum tahu URL finalnya, isi dengan placeholder sementara, contoh: `https://placeholder.com`. **Kita akan memperbaikinya di Langkah 4.**
    *   **UNTUK `JWT_SECRET`**: Buat string acak yang sangat panjang dan aman (64+ karakter). Anda bisa menggunakan generator online seperti [jwtsecrets.com](https://jwtsecrets.com/#generator) (pilih panjang 64+ karakter) untuk membuatnya.
    *   **VARIABEL GOOGLE (Opsional)**: Jika Anda tidak ingin menggunakan login Google, biarkan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_WORKSPACE_DOMAIN` **kosong**. Aplikasi akan otomatis beralih ke mode "Hanya Admin".
4.  **Klik "Deploy"**: Setelah semua terisi, klik "Deploy". Vercel akan memulai proses build. Tunggu beberapa menit hingga selesai.

#### Langkah 3: Dapatkan URL Produksi Anda

Setelah deployment selesai, Vercel akan memberikan Anda URL produksi (contoh: `https://nama-proyek-anda.vercel.app`). **Selamat! Aplikasi Anda sudah online.**

#### Langkah 4: Konfigurasi Final (Wajib Agar Login Berfungsi!)

Sekarang kita perbaiki placeholder yang tadi.

1.  **Perbarui `APP_BASE_URL` di Vercel**:
    *   Di dasbor proyek Vercel Anda, buka tab **"Settings" > "Environment Variables"**.
    *   Cari variabel `APP_BASE_URL`, klik menu tiga titik, lalu pilih **"Edit"**.
    *   Ganti nilai placeholder (`https://placeholder.com`) dengan **URL produksi asli** yang baru saja Anda dapatkan dari Vercel. **PENTING: Jangan sertakan garis miring (`/`) di akhir URL.**
    *   Klik **"Save"**.
    *   Vercel akan meminta Anda untuk men-deploy ulang agar perubahan berlaku. Buka tab **"Deployments"**, cari deployment terbaru, klik menu tiga titik, dan pilih **"Redeploy"**.

2.  **Perbarui URI Pengalihan Google (Jika Menggunakan Login Google)**:
    *   Kembali ke [Google Cloud Console](https://console.cloud.google.com/apis/credentials) Anda.
    *   Buka kredensial OAuth 2.0 Anda.
    *   Di bagian **"Authorized redirect URIs"**, tambahkan URL callback produksi Anda: `https://NAMA-PROYEK-ANDA.vercel.app/api/auth-callback`. Ganti `NAMA-PROYEK-ANDA.vercel.app` dengan URL Anda.

Selesai! Aplikasi Anda sekarang sepenuhnya terkonfigurasi dan siap digunakan.

---

### Metode 2: Deployment Manual (Alternatif)

Gunakan metode ini jika Anda lebih suka melakukan setup langkah demi langkah secara manual. Pilih salah satu dari dua opsi di bawah ini.

#### Opsi A: Menggunakan Integrasi Git

Metode ini menghubungkan repositori GitHub Anda langsung ke Vercel. Setiap kali Anda melakukan `push`, Vercel akan otomatis men-deploy versi terbaru.

1.  **Fork & Klon**: Buat *fork* dari repositori ini ke akun GitHub Anda, lalu klon ke komputer lokal.
2.  **Deploy ke Vercel**: Login ke Vercel, pilih **"Add New... -> Project"**, dan impor repositori yang sudah Anda *fork*.
3.  **Konfigurasi Environment Variables**: Vercel akan meminta Anda untuk menambahkan variabel lingkungan. Salin semua isi dari file `env.txt`, dan isi nilainya satu per satu di dasbor Vercel.
4.  **Deploy**: Klik "Deploy". Setelah selesai, Vercel akan memberikan URL produksi.
5.  **Konfigurasi Final**: Ikuti **Langkah 4** dari "Metode 1" di atas untuk memperbarui `APP_BASE_URL` dan URI pengalihan Google.

#### Opsi B: Menggunakan Vercel CLI

Metode ini untuk men-deploy langsung dari terminal tanpa menghubungkan repositori Git.

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
7.  **Konfigurasi Final**: Ikuti **Langkah 4** dari "Metode 1" di atas.

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