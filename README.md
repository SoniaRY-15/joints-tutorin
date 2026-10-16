# Tutor.in

Frontend React/Vite dan backend Express. Data halaman mentee/mentor terhubung ke API: profil, favorit, enrollment, sesi, wallet, assessment, roadmap, skill analysis, portfolio/proyek, peluang tersimpan, misi, dan sertifikat. Katalog awal memakai data contoh proyek yang sama di frontend dan server.

## Menjalankan

Gunakan Node.js 22 atau lebih baru. Dari folder proyek:

```sh
npm ci
npm --prefix backend ci
npm run dev
```

`npm run dev` menjalankan frontend dan backend bersama. Buka alamat yang dicetak Vite (biasanya `http://localhost:5173`). API memakai `http://127.0.0.1:5000/api`; Vite meneruskan `/api` ke backend. Untuk menjalankan terpisah, gunakan `npm run dev:frontend` dan `npm run dev:backend` di dua terminal. Di PowerShell dengan pembatasan execution policy, gunakan `npm.cmd` sebagai pengganti `npm`.

Tanpa `DATABASE_URL`, backend lokal menyimpan data secara atomik ke `backend/data/tutorin.json`. Jika `DATABASE_URL` diisi, backend memakai PostgreSQL dan tabel `tutorin_state` (dibuat otomatis); transaksi dikunci di PostgreSQL agar perubahan lintas instance tidak saling menimpa.

## Akun dan sinkronisasi

Pengguna masuk atau mendaftar sebelum memilih belajar atau mengajar dan membuka dashboard. Backend menyiapkan sesi awal privat untuk koneksi browser; akses dashboard tetap membutuhkan akun terdaftar. Akun baru mempunyai data contoh sendiri; data browser lama dan sesi awal tidak otomatis dipindahkan ke akun baru. Password di-hash dengan bcrypt; endpoint privat memakai JWT yang berlaku tujuh hari.

Backend menjadi sumber data sesi dan wallet. Harga ditentukan dari katalog server, konflik jadwal ditolak, pembatalan mengembalikan kredit satu kali, dan top-up demo memakai ID transaksi agar retry tidak menggandakan kredit. Dokumen profil, portfolio, assessment, favorit, enrollment, dan roadmap memakai cache lokal per akun dan antrean sinkronisasi. Kegagalan koneksi ditampilkan dengan perubahan tertunda dan tombol coba lagi; startup yang gagal menampilkan halaman pemulihan.

Pembayaran, profil industry mentor, dan lowongan tetap berupa **simulasi**. Belum ada payment gateway, pengiriman bukti pembayaran, email pengingat, atau koneksi otomatis ke mentor nyata. Sertifikat mengikuti bukti sesi contoh, bukan kredensial resmi.

## Konfigurasi

Lihat `backend/.env.example`. Konfigurasi: `DATABASE_URL` untuk PostgreSQL, `PORT`, `HOST`, `FRONTEND_URL` (origin dipisahkan koma), `DATA_FILE` (mode file), dan `JWT_SECRET`. Atur `JWT_SECRET` yang sama dan stabil di semua environment backend.

Frontend memakai `/api` secara default. Untuk domain API terpisah, set `VITE_API_URL=https://domain-api/api` saat build dan izinkan origin frontend melalui `FRONTEND_URL`. Untuk mengganti proxy lokal, set environment variable `API_PROXY_TARGET` sebelum menjalankan Vite.

### Vercel

`vercel.json` mengatur build frontend, fallback halaman React, dan fungsi serverless untuk semua rute `/api/*`. Fungsi tersebut menjalankan backend Express yang sama; variabel `VITE_API_URL` tidak perlu diisi untuk deployment satu domain. Tambahkan `DATABASE_URL` (connection string Neon) dan `JWT_SECRET` sebagai Environment Variables di Vercel lalu redeploy. Fungsi Vercel memerlukan `DATABASE_URL`; jangan simpan connection string di repository.

## API

| Area | Endpoint utama |
| --- | --- |
| Kesehatan server | `GET /api/health` |
| Akun | `POST /api/auth/guest`, `/register`, `/login`; `GET /api/auth/me` |
| Katalog | `GET /api/courses`, `/courses/:id`, `/tutors`, `/industry-mentors`, `/opportunities`, `/shop/packages` |
| Semua data pengguna | `GET /api/workspace`; `PUT /api/documents/:key` untuk dokumen yang divalidasi |
| Profil dan course | `GET /api/profile`, `/favorites`, `/enrollments` |
| Sesi | `GET/POST /api/sessions`; `POST /api/sessions/industry`, `/sessions/:id/cancel`; `PUT /api/sessions/:id/zoom` |
| Kredit | `GET /api/credits`; `POST /api/shop/demo-purchases` |
| Assessment dan karier | `GET /api/assessments`, `/roadmap`, `/career/skills`, `/career/portfolio`; `GET/PUT /api/career/profile` |
| Mentor | `GET /api/mentor/progress`, `/mentor/certificates`; `POST /api/mentor/missions/:id/claim` |

Endpoint data pengguna membutuhkan `Authorization: Bearer <token>`. Endpoint dokumen menolak penggantian ledger/sesi langsung; perubahan saldo hanya melalui operasi server.

Zoom hanya dikelola dari dashboard mentor. `PUT /api/sessions/:id/zoom` menyimpan link, lalu `POST /api/sessions/:id/start` menandai sesi dimulai; keduanya menolak sesi dengan peran mentee. Mentee melihat pesan menunggu sampai mentor memulai sesi, lalu bergabung melalui tombol Mulai sesi. Daftar sesi belajar dan mengajar dipisahkan berdasarkan mode dashboard. Halaman sesi memuat ulang status server setiap 10 detik dan saat jendela kembali aktif.

## Verifikasi

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

Tes API menjalankan server HTTP dan database sementara: validasi, isolasi akun, booking/refund, transaksi bersamaan, JSON rusak, dan persistensi setelah restart. Tes browser menjalankan Vite/API sementara, menavigasi halaman mentee/mentor, menyimpan profil/portfolio/enrollment/assessment, top-up demo, Zoom, login/daftar/keluar, serta menguji kegagalan jaringan dan pemulihan.

Tes browser memakai Microsoft Edge headless secara default. Set `PLAYWRIGHT_CHANNEL=chrome` untuk Chrome, atau `PLAYWRIGHT_CHANNEL=chromium` dan pasang Chromium dengan `npm --prefix backend exec playwright install chromium`.

Untuk mencoba hasil produksi, jalankan backend (`npm --prefix backend start`) dan `npm run preview` setelah build. Hosting statis harus meneruskan `/api` ke backend atau memakai `VITE_API_URL` saat build.
