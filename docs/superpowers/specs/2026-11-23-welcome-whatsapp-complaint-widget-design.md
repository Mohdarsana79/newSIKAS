# Desain Tombol WhatsApp Melayang "Laporan Pengaduan" pada Halaman Welcome

**Tanggal:** 2026-11-23  
**Status:** Disetujui Pengguna — Dieksekusi  
**Cakupan:** `resources/js/Components/Landing/WhatsAppComplaintWidget.tsx` & `resources/js/Pages/Welcome.tsx`.

---

## Ringkasan Desain
1. **Tombol Melayang (`fixed bottom-5 right-4 sm:right-6 z-40`):** Pil hijau WhatsApp (`#25D366`) dengan ikon WhatsApp, indikator aktif, dan teks **"Laporan Pengaduan"** (berada di bawah `VideoGuideModal`).
2. **Popover Form Pengaduan:** Saat diklik, membuka kartu mini berisi keterangan panduan ke **WA `085342209966`**, input **Nama / Asal Sekolah** (pre-fill otomatis dari `sekolah.nama_sekolah` bila ada), pilihan **Kategori Pengaduan**, dan textarea **Detail Laporan Pengaduan** (wajib diisi untuk tombol kirim).
3. **Kirim ke WhatsApp:** Menyusun pesan terformat rapi lalu membuka `https://wa.me/6285342209966?text=...` di tab baru (`noopener,noreferrer`), disertai tautan cepat *"Langsung chat WA tanpa isi form"* bagi pengguna yang ingin langsung menuju WhatsApp.
