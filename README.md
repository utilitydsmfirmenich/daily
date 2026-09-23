# Log Harian PID

Aplikasi **Progressive Web App (PWA)** untuk pencatatan kegiatan kerja harian berbasis **PID** (*Personal ID*). Dirancang khusus untuk efisiensi input kegiatan lapangan di smartphone Android, tablet, laptop, dan PC, dengan dukungan impor dan ekspor file Excel yang 100% presisi mengikuti format acuan `pencatatan kegiatan.xlsx`.

---

## 🌟 Fitur Utama

### 1. Multi-User & Isolasi PID
- Login berbasis **PID** (`AGSB`, `MUKB`, `IKJA`, `AHIK`) dan **PIN** numerik 6 digit.
- **Isolasi Data Penuh:** Setiap pengguna hanya dapat melihat, menambah, mengubah, dan menghapus data miliknya sendiri.
- **Proteksi Brute-Force:** Kunci sementara akun selama 15 menit jika terjadi 5 kali salah input PIN berturut-turut.

### 2. Aturan Waktu Cerdas & Shift Malam (*Midnight Rollover*)
- **Auto Start Time:** Waktu *Start* otomatis mengambil waktu *Finish* dari kegiatan terakhir yang tercatat.
- **Perhitungan Durasi Otomatis:** Durasi dihitung otomatis dalam format desimal jam dengan koma (contoh: `01:30` menjadi `1,50`).
- **Shift Malam & Rollover Tanggal:** Jika kegiatan terakhir selesai sebelum tengah malam dan kegiatan baru dicatat setelah tengah malam dengan jeda $\le 12$ jam, aplikasi secara cerdas tetap mempertahankan tanggal shift awal agar kegiatan satu shift kerja tidak terpisah hari.

### 3. Tombol Input Cepat Kegiatan (*Quick Action Buttons*)
- Tersedia tombol cepat untuk 5 kegiatan harian yang paling sering dilakukan:
  - 💬 **Briefing:** Mengisi kegiatan `"Briefing"` & kategori `"Briefing"`.
  - 🚶 **Berjalan:** Mengisi kegiatan `"Berjalan ke "` & kategori `"Berjalan"` serta langsung memfokuskan kursor di belakang kata *"ke "* untuk pengetikan tujuan lokasi.
  - ☕ **Istirahat:** Mengisi kegiatan `"Istirahat"` & kategori `"Istirahat"`.
  - ⏸️ **Break:** Mengisi kegiatan `"Break"` & kategori `"Break"`.
  - 🌙 **Solat:** Mengisi kegiatan `"Solat"` & kategori `"Solat"`.
- Tersedia baik di formulir **Catat Kegiatan Baru** maupun di jendela dialog **Edit Catatan** di halaman Riwayat.

### 4. Impor & Ekspor Excel Presisi Tinggi (ExcelJS)
- **Ekspor Excel:**
  - Menghasilkan file `.xlsx` yang identik dengan file referensi `pencatatan kegiatan.xlsx`.
  - Opsi ekspor: **PID yang sedang aktif** atau **Semua PID (4 Sheet: AGSB, MUKB, IKJA, AHIK)**.
  - Formula dinamis Excel: `=E{row}-D{row}` untuk kolom *Waktu Total* dan `=SUM(F12:F{n})` untuk baris *TOTAL*.
  - Pemformatan sel rapi: Border garis tipis, header biru tua dengan teks putih tebal, kolom desimal 2 angka di belakang koma, dan penanda sorot baris (*yellow highlight*).
- **Impor Excel:**
  - Mengunggah file Excel laporan dan memetakan baris kegiatan secara otomatis ke dalam database PID yang sesuai.

### 5. Progressive Web App (PWA) & Desain Responsif
- **Installable:** Dapat diinstal di layar utama Android (*Add to Home Screen*) layaknya aplikasi bawaan tanpa perlu Play Store.
- **Offline Resilient:** Layanan *Service Worker* dan cache statis via Workbox untuk stabilitas koneksi di area sinyal minim.
- Tampilan modern berbasis tema gelap (*Dark Theme* profesional) yang nyaman untuk mata di malam hari.

---

## 🛠️ Tech Stack

- **Frontend:** [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **Backend Edge:** [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) dengan framework [Hono](https://hono.dev/)
- **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite serverless di Edge)
- **Manipulasi Excel:** [ExcelJS](https://github.com/exceljs/exceljs)
- **Testing:** [Vitest](https://vitest.dev/)

---

## 🚀 Panduan Memulai Cepat (Local Development)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- npm (bawaan dari instalasi Node.js).

### 2. Instalasi Dependensi
```bash
git clone https://github.com/utilitydsmfirmenich/daily.git
cd daily
npm install
```

### 3. Menjalankan Server Pengembangan
Untuk menjalankan frontend Vite lokal:
```bash
npm run dev
```

Untuk menjalankan simulasi full-stack (Frontend + Cloudflare Pages Functions + Database SQLite D1 Lokal):
```bash
npm run build
npx wrangler pages dev dist --compatibility-date=2024-09-19 --d1 DB=log-harian-db --port 8788
```
Buka browser di `http://127.0.0.1:8788`.

### 4. Menjalankan Pengujian (Testing)
Aplikasi dilengkapi dengan suite pengujian otomatis untuk memvalidasi fungsi waktu, parsing file acuan Excel, dan pengujian *round-trip* ekspor-impor Excel:
```bash
npm test
```

### 5. Membangun untuk Produksi (Build)
```bash
npm run build
```
Hasil build produksi siap deploy akan tersimpan di dalam folder `dist/`.

---

## 🌐 Panduan Deploy Gratis ke Cloudflare Pages & D1 Database

Layanan Cloudflare Pages dan Cloudflare D1 sepenuhnya **GRATIS** dan terhubung otomatis dengan repositori GitHub Anda.

### Langkah 1: Buat Database Cloudflare D1
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) dan login (atau daftar gratis).
2. Di menu navigasi samping, klik **Workers & Pages** > **D1 SQL Database**.
3. Klik tombol **Create database** > pilih **Dashboard**.
4. Beri nama database: `log-harian-db` lalu klik **Create**.

### Langkah 2: Hubungkan Repositori GitHub ke Cloudflare Pages
1. Di menu navigasi samping Cloudflare, klik **Workers & Pages** > **Create application** > tab **Pages**.
2. Pilih opsi **Connect to Git** > pilih akun GitHub Anda dan pilih repositori `utilitydsmfirmenich/daily`.
3. Klik **Begin setup**.
4. Konfigurasikan pengaturan build sebagai berikut:
   - **Project name:** `utility-daily` (URL web akan menjadi `https://utility-daily.pages.dev`).
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Di bagian **Environment variables (advanced)**, tambahkan:
   - Variable name: `NODE_VERSION`, Value: `20`
6. Klik **Save and Deploy**.

### Langkah 3: Hubungkan (Binding) Database D1 ke Cloudflare Pages
1. Setelah deployment pertama selesai, masuk ke halaman proyek Pages Anda (`utility-daily`).
2. Klik tab **Settings** > pilih **Functions** di bilah kiri.
3. Gulir ke bawah ke bagian **D1 database bindings** > klik **Add binding**:
   - **Variable name:** `DB` *(Wajib menggunakan huruf kapital DB)*
   - **D1 database:** Pilih `log-harian-db` yang telah Anda buat di Langkah 1.
4. Klik **Save**.
5. Buka tab **Deployments**, klik titik tiga (⋯) pada deployment terakhir > pilih **Retry deployment** (agar binding database langsung aktif).
6. Website kini sudah aktif dan live 100% di `https://utility-daily.utility-dsmfirmenich.workers.dev`!

---

## 📱 Panduan Menggunakan Sebagai Aplikasi Android

Tersedia dua metode mudah untuk memasang aplikasi di perangkat Android:

### Metode A: Pasang Langsung sebagai PWA (Instan & Tanpa File APK)
1. Buka tautan `https://utility-daily.utility-dsmfirmenich.workers.dev` di browser **Google Chrome** pada HP Android Anda.
2. Ketuk ikon titik tiga (⋮) di pojok kanan atas browser atau ketuk banner pop-up *"Tambahkan Log PID ke Layar Utama"* yang muncul di bagian bawah layar.
3. Pilih **Instal Aplikasi** (*Install app*) atau **Tambahkan ke Layar Utama** (*Add to Home screen*).
4. Ikon aplikasi **Log PID** akan langsung terpasang di menu aplikasi Android Anda:
   - Berjalan layar penuh (*standalone*) tanpa bilah alamat URL peramban layaknya aplikasi Play Store.
   - Ikon aplikasi beresolusi tinggi dan mendukung splash screen gelap elegan.
   - Selalu terbarui otomatis (*auto-update*) setiap kali ada commit baru di repositori GitHub.

### Metode B: Unduh File Installer APK (.apk Standalone)
File `.apk` Android dapat dibuat secara otomatis di cloud menggunakan GitHub Actions tanpa memerlukan instalasi Android Studio di laptop Anda:
1. Buka halaman repositori `utilitydsmfirmenich/daily` di GitHub.
2. Klik tab **Actions** di bagian atas repositori.
3. Di panel sebelah kiri, klik workflow **"Build Android APK"**.
4. Klik tombol **Run workflow** (sebelah kanan) > pilih Branch: `main` > klik tombol hijau **Run workflow**.
5. Tunggu sekitar 2-3 menit hingga proses build selesai bertanda centang hijau.
6. Klik hasil build tersebut, lalu gulir ke bawah ke bagian **Artifacts**.
7. Klik file **`Log-Harian-PID-APK`** untuk mengunduh arsip zip yang berisi file `Log-Harian-PID.apk`.
8. Kirim file `.apk` tersebut ke ponsel Android (melalui WhatsApp, Google Drive, atau kabel USB) lalu ketuk file untuk memasang (*install*) aplikasi.

---

## 📁 Struktur Direktori

```text
pencatatan-harian/
├── functions/                  # Cloudflare Pages Functions (API Backend)
│   └── api/
│       └── [[route]].ts        # Router Hono & endpoint REST API
├── migrations/                 # Skema D1 SQLite Database
│   └── 0001_initial_schema.sql
├── public/                     # Aset statis & ikon PWA
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── src/                        # Kode sumber frontend React
│   ├── components/             # Komponen UI (Navbar, QuickActivityButtons, ExportDialog, dll.)
│   ├── context/                # AuthContext (autentikasi & sesi PID)
│   ├── lib/                    # Utilitas logika (excel-service, time-utils, api-client)
│   ├── pages/                  # Halaman utama (LoginPage, RecordPage, HistoryPage, ImportPage)
│   ├── types/                  # Definisi tipe TypeScript
│   ├── App.tsx
│   └── main.tsx
├── tests/                      # Suite pengujian Vitest
│   ├── excel-parser.test.ts
│   ├── excel-roundtrip.test.ts
│   └── time-utils.test.ts
├── pencatatan kegiatan.xlsx    # File template & acuan format data
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml               # Konfigurasi Cloudflare Pages & D1
```

---

## 🔒 Akun PID Default untuk Pengujian

| PID | Nama Lengkap | PIN Default | Peran |
| :--- | :--- | :--- | :--- |
| `AGSB` | Agus Budi | `123456` | Operator / User |
| `MUKB` | Mukhlis B | `123456` | Operator / User |
| `IKJA` | Iko J | `123456` | Operator / User |
| `AHIK` | Ahmad I | `123456` | Operator / User |

*(PIN dapat diubah melalui menu profil pengguna di dalam aplikasi)*.

---

## 📄 Lisensi
Hak Cipta © 2026. Dikembangkan untuk pencatatan kegiatan harian operasional utility.
