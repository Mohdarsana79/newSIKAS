# SIKAS AI DeepSeek Suite — Fase 4: Generator Narasi LPJ/SPJ & CaLK Otomatis (Rencana Implementasi)

**Status:** READY FOR IMPLEMENTATION  
**Tanggal:** 19 Oktober 2026  
**Target Rilis:** SIKAS AI Suite v1.4  

---

## Rincian Tugas & Langkah Implementasi

### Task 1: Migrasi Database & Model Eloquent
- **Tujuan:** Membuat tabel penyimpanan dokumen CaLK agar hasil generasi dan suntingan tersimpan permanen (*persistent*).
- **Berkas yang dibuat:**
  - `database/migrations/2026_10_19_000003_create_calk_reports_table.php`
  - `app/Models/CalkReport.php` (fillable, casts `metrics_snapshot` ke `array`, relasi `user()`).
- **Verifikasi:** Jalankan `php artisan migrate`.

### Task 2: Service Agregator Finansial & Generator DeepSeek AI
- **Tujuan:** Menghitung agregat matematis angka riil dari database PostgreSQL SIKAS dan memanggil model DeepSeek-V3 untuk menyusun narasi formal kedinasan Bab I s.d. Bab V.
- **Berkas yang dibuat:**
  - `app/Services/Ai/CalkDataAggregator.php`: Menghitung Pagu, Realisasi Belanja (Operasi: Pegawai, Barang/Jasa, Modal), Serapan per Standar SNP, Pajak, dan Saldo Kas Tunai/Bank sesuai varian dan periode (`tahap_1`, `tahap_2`, `tahunan`).
  - `app/Services/Ai/CalkAiGenerator.php`: Merakit prompt SAP birokrasi pemerintahan, memanggil `DeepSeekService::callChat()` (`deepseek-chat` / V3, temperature 0.3), dan mengembalikan struktur 5 bab narasi CaLK.

### Task 3: Controller & Rute Variant
- **Tujuan:** Menyediakan endpoint API untuk mengambil data, menghasilkan narasi AI, menyimpan suntingan, dan mengunduh PDF.
- **Berkas yang dibuat:**
  - `app/Http/Controllers/CalkReportController.php`:
    - `index(Request $request)`
    - `generate(Request $request)`
    - `save(Request $request)`
    - `exportPdf(Request $request, $id)`
- **Berkas yang dimodifikasi:**
  - `routes/variant.php`: Mendaftarkan rute CaLK multi-varian.

### Task 4: Template PDF Resmi Kop Sekolah
- **Tujuan:** Merender dokumen CaLK formal siap cetak / tanda tangan sesuai format standar BPK RI & Inspektorat.
- **Berkas yang dibuat:**
  - `resources/views/pdf/calk-report.blade.php`: Kop surat resmi sekolah, tabel realisasi anggaran, teks Bab I s.d. Bab V, dan lembar pengesahan tanda tangan Kepala Sekolah & Bendahara.

### Task 5: Antarmuka Pengguna (React + TypeScript)
- **Tujuan:** Menghadirkan antarmuka interaktif bagi bendahara untuk melihat KPI, memicu generasi AI, menyunting teks bab, dan mencetak dokumen.
- **Berkas yang dibuat:**
  - `resources/js/Pages/FiturPelengkap/Laporan/components/CalkTab.tsx`
- **Berkas yang dimodifikasi:**
  - `resources/js/Pages/FiturPelengkap/Laporan/TabReguler.tsx`: Menambahkan Tab ke-5 ("CaLK & Narasi LPJ AI").

### Task 6: Kompilasi & Pengujian
- Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada kesalahan tipe TypeScript atau impor.
- Komit seluruh berkas ke Git.
