# SIKAS AI DeepSeek Suite — Fase 3: Asisten Diagnosa & Rekonsiliasi Sinkronisasi ARKAS (Rencana Implementasi)

**Status:** READY FOR IMPLEMENTATION  
**Tanggal:** 19 Oktober 2026  
**Target Rilis:** SIKAS AI Suite v1.3  

---

## Task Breakdown & Eksekusi

### Task 1: Engine & Service Backend Diagnosa ARKAS
- **Tujuan:** Mengumpulkan data diff komprehensif antara database PostgreSQL SIKAS dan SQLite ARKAS via Python engine, kemudian meminta analisis diagnosa dari DeepSeek-V3.
- **File Baru:** `app/Services/Ai/ArkasDiagnosticService.php`
  - Method `runFullDiagnostic(User $user, string $variant, int $tahun): array`
  - Method `runContextualDiagnostic(User $user, string $variant, int $tahun, string $scope, array $context): array`
  - Helper pengumpulan data:
    - Status konektivitas dan path `arkas.db`.
    - Perbandingan Pagu & Rincian RKAS Murni & Perubahan.
    - Perbandingan Transaksi BKU bulanan (Belanja, Penerimaan, Penarikan, Setor, status tutup buku).
    - Status sinkronisasi `ref_barangs`.
  - Integrasi dengan `DeepSeekService::chatCompletion()` (model `deepseek-chat` / V3) menggunakan system prompt khusus spesialis ARKAS & Keuangan Sekolah BOSP.
- **Verifikasi:** Script test atau controller call mengembalikan struktur JSON yang valid dan lengkap.

### Task 2: Controller & Rute Variant
- **Tujuan:** Menyediakan endpoint aman untuk diagnosa sistem dan kontekstual.
- **File Baru:** `app/Http/Controllers/ArkasAiDiagnosticController.php`
  - Action `diagnoseSystem(Request $request)`
  - Action `diagnoseContext(Request $request)`
- **File Dimodifikasi:** `routes/variant.php`
  - Daftarkan:
    - `POST /arkas-tools/ai-diagnose` -> `api.arkas-ai.diagnose`
    - `POST /arkas-tools/ai-diagnose-context` -> `api.arkas-ai.diagnose-context`
- **Multi-variant compliance:** Menggunakan `VariantConfig` untuk mengenali variant aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) dan ID sumber dana ARKAS terkait.

### Task 3: Komponen Modal Diagnosa & Rekonsiliasi AI
- **Tujuan:** Antarmuka responsif dan elegan untuk menampilkan hasil audit, diff matrix, risiko timpa ulang, dan langkah remediasi.
- **File Baru:** `resources/js/Components/Ai/ArkasDiagnosticModal.tsx`
  - Tampilan visual:
    - Badge status kesehatan sistem (`HEALTHY`, `WARNING_DIFFERENCE`, `BLOCKED_CONFLICT`, `ERROR_CONNECTIVITY`).
    - Matriks komparasi ARKAS vs SIKAS (Pagu, Transaksi, Status Tutup Buku).
    - Callout Peringatan Risiko Timpa Ulang (*Overwrite Warnings*).
    - Daftar Langkah Solusi Remediasi Bertahap (*Remediation Action Checklist*) dengan checkbox interaktif agar bendahara dapat menandai langkah yang sudah diselesaikan.
    - Tombol "Salin Rekomendasi" ke clipboard.

### Task 4: Integrasi Antarmuka (Dual-Trigger)
- **Tujuan:** Menghubungkan modal diagnosa ke 2 lokasi strategis:
  1. **Tab Baru di `resources/js/Pages/ArkasTools/Index.tsx`**:
     - Tambahkan Tab Bar di bagian atas: "Katalog & Sinkronisasi Barang" dan "Pusat Diagnosa & Rekonsiliasi AI".
     - Pada tab Pusat Diagnosa, tampilkan kartu ikhtisar integritas database ARKAS, ringkasan perbandingan 12 bulan, dan tombol pemicu diagnosa menyeluruh.
  2. **Tombol Kontekstual di `resources/js/Pages/Penatausahaan/Bku.tsx`**:
     - Di dalam modal penarikan bulanan (`isArkasMonthlyModalOpen`), tambahkan tombol "🔍 Analisis Selisih AI" yang langsung memanggil diagnosa kontekstual untuk bulan tersebut sebelum bendahara memutuskan untuk menimpa ulang.

### Task 5: Validasi, Pengujian & Build
- Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada kesalahan kompilasi TypeScript atau styling.
- Commit seluruh berkas yang telah dibuat/diubah ke repositori Git.
