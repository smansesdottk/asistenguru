# Asisten Guru AI

Asisten Guru AI adalah aplikasi web modern yang dirancang untuk memberdayakan para guru dengan menyediakan akses cepat dan percakapan ke data sekolah yang relevan. Dibangun dengan tumpukan teknologi serverless menggunakan Netlify Functions dan didukung oleh model bahasa canggih dari Google Gemini, aplikasi ini dapat menjawab pertanyaan terkait siswa, guru, jadwal, dan informasi sekolah lainnya secara instan.

## ✨ Fitur Utama

- **Antarmuka Percakapan**: Tanyakan apa pun dalam bahasa alami dan dapatkan jawaban yang relevan dari AI.
- **Akses Data Terpusat**: Mengambil data secara real-time dari beberapa Google Sheets, memastikan informasi selalu up-to-date.
- **Keamanan Terjamin**:
  - **Otentikasi Google OAuth 2.0**: Memastikan hanya pengguna dengan akun Google Workspace sekolah yang dapat login.
  - **Bypass Login Admin**: Akses admin khusus menggunakan kata sandi untuk pemeliharaan atau demo.
  - **Sesi Aman (JWT)**: Menggunakan JSON Web Tokens yang disimpan dalam cookie `HttpOnly` untuk manajemen sesi yang aman.
- **Arsitektur Serverless**: Seluruh aplikasi, baik frontend maupun backend, berjalan di Netlify, menghilangkan kebutuhan untuk mengelola server sendiri.
- **Rotasi Kunci API**: Mendukung banyak kunci API Gemini dan merotasinya secara otomatis untuk mendistribusikan beban dan menghindari batas kuota.
- **Status Sistem**: Indikator real-time untuk memeriksa konektivitas ke layanan penting seperti Google Sheets dan Gemini API.

## 🚀 Tumpukan Teknologi

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Netlify Functions (Serverless TypeScript)
- **Model AI**: Google Gemini API (`gemini-2.5-flash`)
- **Sumber Data**: Google Sheets (diakses sebagai CSV)
- **Autentikasi**: `jose` untuk JWT, Google OAuth 2.0
- **Platform**: Netlify

## 👨‍💻 Kreator

Aplikasi ini dirancang dan dikembangkan oleh **A. Indra Malik** dari SMAN 11 Makassar.

## 📂 Struktur Proyek

```
/
├── components/         # Komponen React (UI)
│   ├── ChatPage.tsx
│   └── LoginPage.tsx
├── netlify/
│   ├── functions/      # Kode backend (Netlify Functions)
│   │   ├── auth-*.ts   # Fungsi untuk autentikasi
│   │   ├── chat.ts     # Endpoint utama untuk chat
│   │   ├── config.ts   # Endpoint untuk konfigurasi publik
│   │   └── status.ts   # Endpoint untuk status sistem
│   └── util/
│       └── auth.ts     # Logika inti JWT dan manajemen cookie
├── App.tsx             # Komponen root yang mengatur routing login/chat
├── index.html          # File HTML utama
├── package.json        # Dependensi proyek
├── env.txt             # Template untuk environment variables
└── README.md           # Anda sedang membacanya
```

## 🛠️ Menjalankan Aplikasi

### 1. Prasyarat

- **Node.js**: Pastikan Anda memiliki Node.js versi 18 atau lebih baru.
- **Netlify CLI**: Instal secara global untuk menjalankan server development lokal dan men-deploy.
  ```bash
  npm install -g netlify-cli
  ```

### 2. Konfigurasi Lingkungan (Environment)

Aplikasi ini membutuhkan beberapa kunci rahasia dan konfigurasi untuk berjalan.

1.  **Salin Template**: Salin konten dari `env.txt` ke dalam file baru bernama `.env` di direktori root proyek Anda.
2.  **Isi Variabel**: Buka file `.env` yang baru dibuat dan isi semua variabel. Lihat petunjuk di dalam file `env.txt` untuk detail tentang setiap variabel. Ini termasuk:
    - Informasi sekolah (`SCHOOL_NAME_FULL`, dll.)
    - Kunci API Gemini (`GEMINI_API_KEYS`)
    - URL Google Sheet (`GOOGLE_SHEET_CSV_URLS`)
    - Kredensial Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
    - Domain Workspace (`GOOGLE_WORKSPACE_DOMAIN`)
    - Kata Sandi Admin (`ADMIN_PASSWORD`)
    - Rahasia JWT (`JWT_SECRET`)
3.  **Konfigurasi Google OAuth**: Pastikan Anda telah mengonfigurasi **Authorized redirect URIs** di Google Cloud Console Anda untuk menyertakan URL callback development lokal:
    - `http://localhost:8888/.netlify/functions/auth-callback`

### 3. Menjalankan Secara Lokal

Setelah file `.env` Anda dikonfigurasi, Anda dapat memulai server development lokal.

```bash
netlify dev
```

Perintah ini akan:
- Membaca variabel dari file `.env` Anda.
- Menjalankan server frontend dan semua fungsi backend secara bersamaan.
- Membuka aplikasi di browser Anda, biasanya di `http://localhost:8888`.

### 4. Deployment ke Netlify

Ada dua cara utama untuk men-deploy aplikasi Anda.

#### A. Menggunakan Netlify CLI (Direkomendasikan)

Ini adalah cara tercepat untuk setup awal.

1.  **Login ke Netlify**:
    ```bash
    netlify login
    ```
2.  **Hubungkan Proyek**:
    ```bash
    netlify link
    ```
    Pilih opsi untuk membuat situs baru.
3.  **Impor Environment Variables**: Impor semua konfigurasi dari file `env.txt` Anda langsung ke dasbor Netlify.
    ```bash
    netlify env:import env.txt
    ```
4.  **Konfigurasi Google OAuth (Produksi)**: Jangan lupa untuk menambahkan URL callback produksi Anda ke Google Cloud Console:
    - `https://nama-situs-anda.netlify.app/.netlify/functions/auth-callback`
5.  **Deploy**: Lakukan deployment pertama Anda.
    ```bash
    netlify deploy --prod
    ```

#### B. Menggunakan Git (Alur Kerja Berkelanjutan)

Setelah setup awal, ini adalah cara terbaik untuk pembaruan.

1.  **Setup di Netlify UI**:
    - Hubungkan repositori Git Anda ke situs Netlify.
    - Atur *Build command* ke `#` (kosong, karena tidak ada proses build) dan *Publish directory* ke direktori root Anda.
    - Buka **Site configuration > Build & deploy > Environment variables** dan tambahkan semua variabel dari `env.txt` Anda secara manual.
2.  **Deploy**: Cukup `git push` ke branch utama Anda. Netlify akan secara otomatis men-deploy setiap perubahan baru.

---
Dibuat dengan ❤️ untuk pendidikan.