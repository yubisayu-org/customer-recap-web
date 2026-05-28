# Purchase Order Viewer

Website untuk pelanggan melihat pesanan mereka dengan memasukkan Instagram ID.
Data diambil dari **Supabase** (database yang sama dengan `inventory-dashboard-v2`)
melalui endpoint publik read-only milik dashboard.

## Arsitektur

```
Browser (public/)
  └── GET /api/orders?instagramId=...        (Netlify function, same-origin)
        └── GET ${INVOICE_API_URL}?customer=...   (dashboard public invoice API)
              └── Supabase (role read-only `invoice_reader`)
```

Netlify function (`netlify/functions/orders.js`) bertindak sebagai proxy
server-side: normalisasi handle Instagram, rate-limit, cache per-customer (60 dtk),
lalu meneruskan ke endpoint publik dashboard dan mengembalikan `{ customer, events }`.
Endpoint dashboard hanya membaca order, pembayaran, status pengiriman, dan resi —
**tidak pernah** nama, WhatsApp, alamat, atau data rekening.

## Setup

### 1. Prasyarat di `inventory-dashboard-v2`

Endpoint publik `GET /api/public/invoice` harus aktif dan role read-only siap:

1. Jalankan migrasi Supabase: `018_invoice_reader_role.sql` dan
   `020_invoice_reader_shipments.sql` (`supabase db push`).
2. Set password role secara out-of-band:
   `ALTER ROLE invoice_reader WITH PASSWORD '<strong-secret>';`
3. Set env `INVOICE_READER_DATABASE_URL` di deployment dashboard, menunjuk ke
   role `invoice_reader` via Supabase pooler.

### 2. Konfigurasi Netlify Environment Variables

Di Netlify dashboard, buka **Site settings > Environment variables** dan tambahkan:

- **`INVOICE_API_URL`**: URL endpoint publik invoice dashboard, contoh:
  `https://<domain-dashboard>/api/public/invoice`

### 3. Deploy via GitHub

1. Push repository ini ke GitHub.
2. Di [Netlify](https://app.netlify.com/):
   - Klik **Add new site > Import an existing project**
   - Pilih repository dari GitHub
   - Build settings otomatis terdeteksi dari `netlify.toml`
   - Klik **Deploy site**
3. Set environment variable sesuai langkah 2.
4. Trigger redeploy jika environment variable ditambahkan setelah deploy pertama.

## Development Lokal

```bash
npx netlify dev
```

Buat file `.env` di root project (jangan commit!):

```
INVOICE_API_URL=https://<domain-dashboard>/api/public/invoice
```

## Struktur Project

```
/netlify/functions/orders.js   ← Serverless proxy ke dashboard public API
/public/index.html             ← Frontend
/package.json                  ← Dependencies (tidak ada dep runtime; pakai global fetch)
/netlify.toml                  ← Netlify config
```
