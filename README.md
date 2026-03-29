# Purchase Order Viewer

Website untuk pelanggan melihat pesanan mereka dengan memasukkan Instagram ID. Data diambil dari Google Sheet privat.

## Setup

### 1. Buat Google Cloud Service Account

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Aktifkan **Google Sheets API**:
   - Buka **APIs & Services > Library**
   - Cari "Google Sheets API" dan klik **Enable**
4. Buat Service Account:
   - Buka **APIs & Services > Credentials**
   - Klik **Create Credentials > Service Account**
   - Isi nama (misal: `sheets-reader`), lalu klik **Create and Continue**
   - Skip role assignment, klik **Done**
5. Buat key JSON:
   - Klik service account yang baru dibuat
   - Buka tab **Keys**
   - Klik **Add Key > Create new key > JSON**
   - File JSON akan terunduh — simpan isinya untuk digunakan nanti

### 2. Bagikan Google Sheet ke Service Account

1. Buka Google Sheet yang berisi data pesanan
2. Klik **Share**
3. Masukkan email service account (formatnya seperti `nama@project-id.iam.gserviceaccount.com`)
4. Pilih akses **Viewer** (baca saja)
5. Klik **Send**

### 3. Struktur Google Sheet

Sheet harus punya satu tab dengan kolom-kolom berikut (baris pertama sebagai header):

| Order ID | Instagram ID | Event ID | Order | Unit | Price | Subtotal | Berat | Shipping Fee (per kg) |
|----------|-------------|----------|-------|------|-------|----------|-------|-----------------------|

- **Order ID**: Internal, tidak ditampilkan ke user
- **Berat**: Berat dalam kg
- **Shipping Fee (per kg)**: Tarif ongkos kirim per kg

### 4. Konfigurasi Netlify Environment Variables

Di Netlify dashboard, buka **Site settings > Environment variables** dan tambahkan:

- **`GOOGLE_SERVICE_ACCOUNT_JSON`**: Paste seluruh isi file JSON service account (satu baris, tanpa line break)
- **`SPREADSHEET_ID`**: ID dari Google Sheet (ambil dari URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`)

### 5. Deploy via GitHub

1. Push repository ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/customer-recap-web.git
   git push -u origin main
   ```

2. Di [Netlify](https://app.netlify.com/):
   - Klik **Add new site > Import an existing project**
   - Pilih repository dari GitHub
   - Build settings akan otomatis terdeteksi dari `netlify.toml`
   - Klik **Deploy site**

3. Set environment variables sesuai langkah 4

4. Trigger redeploy jika environment variables ditambahkan setelah deploy pertama

## Development Lokal

```bash
npm install
npx netlify dev
```

Buat file `.env` di root project (jangan commit!):

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
SPREADSHEET_ID=your_spreadsheet_id_here
```

## Struktur Project

```
/netlify/functions/orders.js   ← Serverless function
/public/index.html             ← Frontend
/package.json                  ← Dependencies
/netlify.toml                  ← Netlify config
```
