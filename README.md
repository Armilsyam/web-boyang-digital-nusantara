# BOYANG DIGITAL

Platform ekosistem digital modern **BOYANG DIGITAL** — menggabungkan **Layanan Jasa Digital**, **Kursus Online (LMS)**, **Produk Digital**, dan **Arsitektur Web3** dalam satu aplikasi full-stack siap hosting dengan pembayaran **QRIS Dinamis, Transfer Bank, E-Wallet, dan EVM Crypto**.

## Fitur Utama

- **Layanan Jasa Digital**: Pemesanan paket layanan (Starter / Pro / Enterprise), form *Brief Proyek*, dan pelacakan progres milestone 4 tahap oleh klien.
- **Kursus Online (LMS)**: Modul & materi terstruktur, *Free Preview*, *progress tracker* persentase belajar, serta Sertifikat Kelulusan dengan kode & *SHA-256 attestation hash*.
- **Produk Digital**: Pengiriman instan *License Key* unik dan unduhan paket aset setelah pembayaran diverifikasi.
- **Pembayaran Lengkap**:
  - **QRIS Dinamis** (standar EMVCo dengan CRC16-CCITT, unduh QR PNG, dukungan gambar QRIS kustom Admin & mode sandbox).
  - **Transfer Bank**: BCA, Mandiri, BNI, BRI dengan salin rekening, kode unik 3 digit, dan unggah bukti transfer.
  - **E-Wallet**: GoPay, OVO, DANA, ShopeePay.
  - **Web3 Crypto**: Pembayaran EVM multi-chain (Base, Polygon, Ethereum, Arbitrum, Sepolia).
- **Multi-Role User & Admin**:
  - **Portal User**: LMS, produk & lisensi, tracker proyek jasa, riwayat invoice, penautan wallet Web3 (`personal_sign` / SIWE).
  - **Dashboard Admin**: Analitik omzet, verifikasi pembayaran (*Approve/Reject*), update progres jasa, CRUD Katalog, pengaturan dinamis QRIS/Bank/E-Wallet/Web3, promo, leads konsultasi, dan manajemen role pengguna.

## Menjalankan Lokal (Node.js 22.5+ / 26+)

```bash
cp .env.example .env
npm install
npm run dev
```

Untuk build produksi:

```bash
npm run build
npm start
```

Lihat [HOSTING_GUIDE.md](./HOSTING_GUIDE.md) untuk panduan deploy ke Railway, Render, atau VPS Docker.
