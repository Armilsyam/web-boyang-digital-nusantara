# Panduan Hosting & Deployment — BOYANG DIGITAL

Platform **BOYANG DIGITAL** dibangun dalam satu aplikasi full-stack terpadu (**React + TypeScript + Vite + Express + SQLite bawaan Node 26**) sehingga dapat dijalankan lokal maupun langsung di-hosting ke VPS, Docker, Railway, atau Render.

## 1. Menjalankan di Komputer Lokal
1. Pastikan **Node.js v22.5+** (direkomendasikan **Node.js v26+**) terpasang.
2. Salin `.env.example` menjadi `.env` dan sesuaikan `SESSION_SECRET` serta password admin.
3. Install dependency & jalankan:
   - Windows PowerShell (gunakan `npm.cmd` jika script policy aktif):
     ```powershell
     npm.cmd install
     npm.cmd run dev
     ```
   - Mode Production (1 server terpadu di port `3000`):
     ```powershell
     npm.cmd run build
     npm.cmd start
     ```
4. Akses website di `http://localhost:3000`.

### Akun Demo Bawaan
- **Admin**: `admin@boyangdigital.id` / `AdminBoyang#2026`
- **User**: `user@boyangdigital.id` / `UserBoyang#2026`

> **Penting:** Segera ubah `ADMIN_PASSWORD`, `SESSION_SECRET`, dan pengaturan QRIS/Rekening Bank melalui **Dashboard Admin -> QRIS, Bank & Web3** sebelum rilis ke publik!

---

## 2. Hosting di Railway (Paling Mudah)
1. Push repository ini ke GitHub.
2. Buka [Railway](https://railway.app) -> **New Project -> Deploy from GitHub Repo**.
3. Tambahkan **Volume** yang di-mount ke `/app/data` agar database SQLite dan bukti transfer tetap tersimpan permanen.
4. Set Environment Variables di Railway:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<string-acak-panjang>`
   - `DATABASE_PATH=/app/data/boyang-digital.db`
   - `UPLOADS_DIR=/app/data/uploads`
   - `PAYMENT_SANDBOX_MODE=false` (jika sudah siap produksi)
5. File `railway.toml` otomatis mengatur build & healthcheck `/api/health`.

---

## 3. Hosting di VPS (Ubuntu + Docker / PM2 + Nginx)
### Menggunakan Docker:
```bash
docker build -t boyang-digital .
docker run -d \
  --name boyang-digital \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  --restart unless-stopped \
  boyang-digital
```
Arahkan domain Anda dengan Nginx Reverse Proxy ke `http://127.0.0.1:3000` lalu aktifkan SSL HTTPS gratis via Certbot (`certbot --nginx -d domainanda.com`).

---

## 4. Konfigurasi Pembayaran QRIS, Bank, E-Wallet & Web3
1. Login sebagai **Admin**, lalu masuk ke menu **Admin -> QRIS, Bank & Web3**.
2. **QRIS**:
   - Masukkan **Nama Merchant**, **Kota**, dan **NMID** resmi Anda.
   - Jika Anda sudah memiliki QRIS statis (dari Bank/GoPay/OVO/Dana/Merchant), Anda bisa menempelkan string **Payload QRIS Statis** (diawali `000201...`) atau mengunggah **Gambar QRIS Resmi**.
   - Matikan **Mode Sandbox** saat live agar pelanggan selalu mengunggah bukti transfer atau diarahkan ke verifikasi Admin / Webhook gateway.
3. **Transfer Bank & E-Wallet**:
   - Edit nomor rekening BCA, Mandiri, BNI, BRI serta nomor GoPay, OVO, DANA, ShopeePay langsung dari Admin Panel.
4. **Web3 Treasury**:
   - Ubah alamat **Treasury EVM (`0x...`)** milik Anda untuk menerima pembayaran ETH/POL/USDC di jaringan Base, Polygon, Arbitrum, maupun Ethereum.
