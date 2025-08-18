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

Ada dua cara untuk men-deploy aplikasi ini ke Vercel. **Pilih salah satu metode di bawah ini.** Anda tidak perlu melakukan keduanya. Metode integrasi Git adalah yang paling mudah dan direkomendasikan untuk sebagian besar pengguna.

---

### Metode 1: Menggunakan Integrasi Git (Cara Termudah & Direkomendasikan)

Metode ini menghubungkan repositori GitHub Anda langsung ke Vercel. Setiap kali Anda melakukan `push` ke branch utama, Vercel akan secara otomatis men-deploy versi terbaru.

#### Langkah 1: Persiapan Awal

1.  **Fork Repositori**: Buat *fork* dari repositori ini ke akun GitHub Anda.
2.  **Klon Repositori**: Klon repositori yang sudah Anda *fork* ke komputer lokal.
    ```bash
    git clone https://github.com/NAMA_ANDA/nama-repositori.git
    cd nama-repositori
    ```
3.  **Konfigurasi Variabel**: Buka file `env.txt`. Isi semua variabel di bagian **"PENGATURAN WAJIB"**.
    - **Sangat Penting**: Pastikan Anda mengisi `APP_BASE_URL` dengan URL lengkap situs Anda setelah di-deploy (misalnya, `https://proyek-anda.vercel.app`). Ini wajib agar Login Google berfungsi. **Jangan sertakan garis miring (`/`) di akhir URL.**
    - Jika Anda tidak mengisi variabel `GOOGLE_...`, aplikasi akan berjalan dalam mode **"Hanya Admin"**.

#### Langkah 2: Deploy ke Vercel

1.  **Login ke Vercel**: Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2.  **Impor Proyek**: Di dasbor Vercel, klik **"Add New... -> Project"**. Pilih repositori yang sudah Anda *fork* tadi.
3.  **Konfigurasi Proyek**: Vercel akan secara otomatis mendeteksi konfigurasi dari `vercel.json` dan `package.json`. Anda tidak perlu mengubah pengaturan build.
4.  **Tambahkan Environment Variables**: Buka bagian **"Environment Variables"**. Salin dan tempel semua variabel dari file `env.txt` Anda yang sudah diisi.
5.  **Deploy**: Klik tombol **"Deploy"**. Vercel akan memulai proses build dan deployment. Setelah selesai, Anda akan mendapatkan URL unik untuk situs Anda.

#### Langkah 3: Konfigurasi Final Google OAuth (Jika Digunakan)

Jika Anda mengisi variabel Google, lakukan langkah ini:
1.  **Buka Google Cloud Console**: Kembali ke halaman kredensial OAuth 2.0 Anda.
2.  **Tambahkan URI Pengalihan Resmi**: Di bagian **"Authorized redirect URIs"**, tambahkan URL callback produksi Anda: `https://NAMA-SITUS-ANDA.vercel.app/api/auth-callback`.

---

### Metode 2: Menggunakan Vercel CLI (Untuk Pengguna Lanjutan)

Metode ini memungkinkan Anda untuk men-deploy langsung dari terminal di komputer Anda tanpa perlu menghubungkan repositori Git.

#### Langkah 1: Persiapan Awal

1.  **Unduh Kode**: Unduh atau klon repositori ini ke komputer lokal Anda.
2.  **Instal Vercel CLI & Dependensi**: Buka terminal di folder proyek dan jalankan:
    ```bash
    npm install -g vercel
    npm install
    ```
3.  **Login ke Vercel**: Di terminal, login ke akun Vercel Anda.
    ```bash
    vercel login
    ```
4.  **Konfigurasi `.env.local`**: Buat salinan dari `env.txt`, ganti namanya menjadi `.env.local`, dan isi semua variabelnya. File ini akan digunakan untuk proses build lokal.

#### Langkah 2: Hubungkan Proyek dan Atur Variabel di Vercel

1.  **Hubungkan Proyek**: Jalankan perintah berikut di terminal:
    ```bash
    vercel
    ```
    CLI akan menanyakan beberapa hal. Jawab seperti ini untuk setup awal:
    - `? Set up and deploy “/path/to/your/project”?` → **Y** (Yes)
    - `? Which scope do you want to deploy to?` → Pilih akun pribadi Anda.
    - `? Link to an existing project?` → **N** (No)
    - `? What’s your project’s name?` → (Otomatis) Tekan Enter.
    - `? In which directory is your code located?` → (Otomatis, `./`) Tekan Enter.
    - `Auto-detected Project Settings... Override?` → **N** (No)
    
    Tunggu hingga deployment pertama selesai. URL produksi Anda akan ditampilkan. **Penting:** Salin URL ini dan tempelkan ke variabel `APP_BASE_URL` di file `.env.local` Anda.

2.  **Tambahkan Environment Variables ke Vercel**: Anda harus menambahkan semua variabel dari `.env.local` ke Vercel satu per satu melalui terminal.
    ```bash
    # Contoh:
    vercel env add SCHOOL_NAME_FULL "Nama Sekolah Saya"
    vercel env add GEMINI_API_KEYS "kunci_api_anda_disini"
    vercel env add JWT_SECRET "kunci_rahasia_anda_yang_sangat_panjang"
    
    # Lakukan ini untuk SEMUA variabel dari file .env.local Anda
    ```

#### Langkah 3: Build dan Deploy

1.  **Build Proyek untuk Produksi**: Perintah ini akan membuat folder `.vercel/output` yang berisi file-file yang siap di-deploy.
    ```bash
    vercel build --prod
    ```
2.  **Deploy Proyek yang Sudah Di-build**: Perintah ini akan mengunggah isi dari folder `.vercel/output` ke Vercel.
    ```bash
    vercel deploy --prebuilt --prod
    ```
    Setelah selesai, aplikasi Anda akan diperbarui di URL produksi.

#### Langkah 4: Konfigurasi Final Google OAuth (Jika Digunakan)

Langkah ini sama dengan metode Git. Pastikan URI redirect di Google Cloud Console sudah benar: `https://NAMA-SITUS-ANDA.vercel.app/api/auth-callback`.

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
