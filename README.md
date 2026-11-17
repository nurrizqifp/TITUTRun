# TITUT Run

TITUT Run adalah dashboard pendamping latihan lari untuk mencatat sesi, memantau progres mingguan, melihat riwayat latihan, dan menyusun rencana latihan. Dikembangkan oleh **Kelompok 2-A Manajemen Proyek TI UMY**.

## Teknologi

- Frontend: React, Vite, dan Recharts.
- Backend: Node.js, Express, dan Zod.
- Database: PostgreSQL.
- Generator rencana: OpenRouter (opsional; mode lokal tersedia tanpa API key).
- Orkestrasi: Docker Compose.

## Menjalankan dengan Docker

1. Salin `.env.example` ke `.env` untuk konfigurasi Docker, dan `backend/.env.example` ke `backend/.env` untuk konfigurasi backend serta `OPENROUTER_API_KEY`. Ganti password database contoh sebelum penggunaan bersama/produksi. File `.env` lokal diabaikan Git; jangan masukkan key ke source code atau berkas yang dilacak Git. Generator menggunakan mode lokal jika key tidak diberikan.
2. Jalankan `docker compose up --build`.
3. Buka dashboard pada `FRONTEND_HOST_PORT` dan API pada `BACKEND_HOST_PORT` sesuai `.env`.

Port, URL API frontend, alamat database, image container, origin CORS, dan pengaturan OpenRouter dibaca dari file environment masing-masing (`.env`, `backend/.env`, dan `frontend/.env`). Nilai contoh berada di `.env.example` dan `backend/.env.example`. PostgreSQL tidak dipublikasikan ke host; data disimpan dalam named volume Docker `titut-run-data`. Untuk menghentikan aplikasi, jalankan `docker compose down`. Data tetap tersimpan; menghapus volume memerlukan `docker compose down -v`.

Compose membaca konfigurasi AI dari `backend/.env`. Backend lokal memerlukan `PORT`, `DATABASE_URL`, `APP_URL`, `CORS_ORIGIN`, `OPENROUTER_MODELS`, `OPENROUTER_API_URL`, `OPENROUTER_TIMEOUT_MS`, `OPENROUTER_TEMPERATURE`, dan `OPENROUTER_MAX_TOKENS`; aplikasi berhenti dengan pesan field yang belum valid alih-alih memakai default tersembunyi. Jangan commit file `.env`; jika key pernah bocor, cabut/rotasi dari dashboard OpenRouter lalu perbarui file lokal.

OpenRouter mencoba setiap model yang tercantum pada `OPENROUTER_MODELS` secara berurutan saat terjadi kesalahan jaringan, respons provider gagal, atau keluaran model tidak valid. Jika semua model gagal, dashboard menampilkan rencana lokal dan memberi tahu bahwa fallback digunakan.

## Menjalankan tanpa Docker

Gunakan versi Node.js dan PostgreSQL yang ditentukan di `.env`. Buat database dengan nilai `DATABASE_URL`, lalu salin `backend/.env.example` ke `backend/.env` dan `frontend/.env.example` ke `frontend/.env`. Di terminal terpisah:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Frontend dev tersedia pada host/port Vite. Ubah `VITE_API_URL` di `frontend/.env` dan `APP_URL`/`CORS_ORIGIN` di `backend/.env` bila menggunakan alamat yang berbeda.

## Deploy ke Vercel

Proyek ini dikonfigurasi untuk deploy ke Vercel menggunakan **Vercel Services** melalui [vercel.json](vercel.json) (`backend` dengan framework `express` pada `/api/*` dan `frontend` dengan framework `vite` pada `/*` dalam satu domain sehingga cookie sesi `HttpOnly` bekerja langsung).

1. Hubungkan repository ke Vercel (Vercel otomatis membaca `services` dan `rewrites` di `vercel.json`). Untuk pengujian lokal seluruh service sekaligus, jalankan `vercel dev`.
2. Siapkan PostgreSQL cloud (misalnya Neon, Supabase, atau Vercel Postgres).
3. Tambahkan Environment Variables di Vercel Project Settings:
   - **Wajib**:
     - `DATABASE_URL`: connection string PostgreSQL cloud
     - `DATABASE_SSL`: `true` (jika provider PostgreSQL mewajibkan SSL)
   - **Opsional**:
     - `OPENROUTER_API_KEY`: API key OpenRouter (jika kosong, generator memakai mode lokal)
     - `OPENROUTER_MODELS`: daftar model dipisah koma
     - `APP_URL` dan `CORS_ORIGIN`: jika menggunakan custom domain (jika tidak diisi, otomatis memakai `https://$VERCEL_URL`)
     - `VITE_API_URL`: biarkan kosong agar frontend memanggil `/api/*` pada domain yang sama
4. Deploy. Tabel `users`, `user_sessions`, dan `training_logs` dibuat otomatis saat request pertama.

## Endpoint API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/health` | Status server dan database |
| `GET` | `/api/logs` | Daftar catatan latihan terbaru |
| `POST` | `/api/logs` | Simpan catatan latihan |
| `POST` | `/api/schedule/generate` | Buat rencana latihan mingguan |

Contoh payload `POST /api/logs`:

```json
{
  "date": "2026-10-06",
  "distanceKm": 5,
  "durationMinutes": 32,
  "rpe": 6,
  "notes": "Lari santai"
}
```

Jarak dibatasi `0.1–100 km`, durasi `1–1000 menit`, dan RPE `1–10`. Data latihan disimpan di PostgreSQL. Mode generator lokal tidak mengirim data ke layanan eksternal. Jika OpenRouter dikonfigurasi, preferensi latihan yang diberikan ke generator dikirim ke API OpenRouter.

## Pengingat

TITUT Run bukan alat diagnosis atau pengganti saran tenaga kesehatan. Tingkatkan latihan secara bertahap, dan hentikan latihan jika terasa nyeri atau tidak aman.
