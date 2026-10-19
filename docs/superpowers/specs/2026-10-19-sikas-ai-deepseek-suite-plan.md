# Implementation Plan: SIKAS AI DeepSeek Suite (Fase 1: Fondasi BYOK & Mesin Pra-Audit Forensik BKU)

**Tanggal:** 19 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-19-sikas-ai-deepseek-suite-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-sikas-ai-deepseek-suite-design.md)  
**Status:** Menunggu Persetujuan Pengguna Sebelum Eksekusi  

---

## Ringkasan Proyek
Mengimplementasikan **Fase 1** dari SIKAS AI DeepSeek Suite, yaitu fondasi keamanan kredensial **BYOK (Bring Your Own Key)** pada profil pengguna, integrasi HTTP client DeepSeek, dan pembangunan **Mesin Pra-Audit Forensik & Kepatuhan Penutupan Kas** berbasis **DeepSeek-R1** (`deepseek-reasoner`) yang terintegrasi pada lembar Registrasi Penutupan Kas (`Rekapitulasi.tsx` tab `reg`) lengkap dengan caching cerdas dan ekspor laporan PDF.

---

## Tahapan Implementasi Detail

### Tahap 1: Migrasi Database & Model Eloquent
- [ ] Buat file migrasi `database/migrations/YYYY_MM_DD_add_deepseek_fields_to_users_table.php`:
  - Tambah kolom `deepseek_api_key` (`text`, nullable).
  - Tambah kolom `deepseek_model_reasoner` (`string`, default: `'deepseek-reasoner'`).
  - Tambah kolom `deepseek_model_chat` (`string`, default: `'deepseek-chat'`).
- [ ] Perbarui model `app/Models/User.php`:
  - Tambahkan atribut baru ke `$fillable`.
  - Tambahkan cast `'deepseek_api_key' => 'encrypted'` pada method `casts()`.
  - Sembunyikan `deepseek_api_key` pada `$hidden` agar tidak bocor ke payload publik frontend tanpa sengaja.
- [ ] Buat file migrasi `database/migrations/YYYY_MM_DD_create_bku_audit_logs_table.php`:
  - Kolom: `id`, `user_id`, `sekolah_id`, `variant` (default: `'reguler'`), `tahun`, `bulan`, `bulan_angka`, `penganggaran_id`, `compliance_score`, `executive_summary`, `findings` (`jsonb`), `rules_checked` (`jsonb`), `last_bku_updated_at` (`timestamp`), `metadata` (`jsonb`), `timestamps`.
  - Indeks majemuk pada `(variant, tahun, bulan_angka, penganggaran_id)`.
- [ ] Buat model `app/Models/BkuAuditLog.php`:
  - Definisikan `$fillable`, relasi ke `User`, `SekolahProfile`, dan casts array/json untuk `findings` dan `rules_checked`.
- [ ] Jalankan migrasi via `php artisan migrate`.

### Tahap 2: Layanan Backend (Service Layer) & Klien DeepSeek
- [ ] Buat class `app/Services/Ai/DeepSeekService.php`:
  - Helper komunikasi API ke `https://api.deepseek.com`.
  - Method `testConnection(string $apiKey): array` untuk memvalidasi API Key ke endpoint `/models`.
  - Method `callReasoner(string $apiKey, array $messages, array $options = []): array` dengan timeout 60 detik untuk model R1.
  - Method `callChat(string $apiKey, array $messages, array $options = []): array` untuk model V3.
  - Penanganan error komprehensif (koneksi terputus, API key salah, saldo/kuota token habis).
- [ ] Buat class `app/Services/Ai/BkuAuditScanner.php`:
  - Mengambil data transaksi BKU, pajak, kuitansi, dan BAST melalui `BukuKasService` sesuai varian aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
  - **Deterministic Pre-Scan:**
    * Periksa kalkulasi saldo fisik kas/bank harian (deteksi kas minus).
    * Kumpulkan transaksi dengan pajak terisi namun nomor NTPN belum diinput.
    * Kelompokkan transaksi ke rekanan yang sama pada tanggal berdekatan dengan nilai belanja < Rp 2.000.000 (indikasi *split-bill*).
    * Evaluasi realisasi belanja terhadap sisa pagu RKAS per rincian objek.
  - **Cognitive Reasoning Scanner:**
    * Susun payload ringkas (< 3.000 token) untuk dikirim ke `deepseek-reasoner`.
    * Perintahkan AI menganalisis kewajaran uraian belanja dan identifikasi aset belanja modal yang salah masuk ke pos habis pakai.
    * Ekstrak respons JSON terstruktur (Skor Kepatuhan 0-100, Ringkasan Eksekutif, Daftar Temuan per Kategori).
  - **Smart Caching:**
    * Periksa timestamp `updated_at` transaksi BKU terakhir pada bulan terkait. Jika belum berubah, muat langsung dari `BkuAuditLog` tanpa memanggil API DeepSeek.
    * Dukung opsi `force_refresh = true` untuk audit ulang.

### Tahap 3: Controller & Rute Backend
- [ ] Tambahkan method pengelolaan API Key di `app/Http/Controllers/ProfileController.php`:
  - `updateDeepSeekSettings(Request $request)`
  - `testDeepSeekConnection(Request $request)`
- [ ] Daftarkan rute profil di `routes/web.php`:
  - `POST /profile/deepseek-settings` (`profile.deepseek-settings`)
  - `POST /profile/deepseek-test` (`profile.deepseek-test`)
- [ ] Buat controller `app/Http/Controllers/BkuAuditController.php`:
  - Resolusi varian aktif via `app('variant')` dan `VariantConfig`.
  - `getStatus(Request $request)`: Mengembalikan data audit tersimpan untuk tahun, bulan, dan varian aktif.
  - `runAudit(Request $request)`: Menjalankan audit baru dan mengembalikan hasil analisis.
  - `exportPdf(Request $request, $id)`: Merender PDF Lembar Kerja Audit AI.
- [ ] Daftarkan rute audit di `routes/variant.php`:
  - `GET /api/bku-audit/status` (`api.bku-audit.status`)
  - `POST /api/bku-audit/run` (`api.bku-audit.run`)
  - `GET /bku-audit/pdf/{id}` (`bku-audit.pdf`)

### Tahap 4: Template Laporan PDF Pra-Audit
- [ ] Buat template Blade `resources/views/pdf/bku-audit-report.blade.php`:
  - Layout formal A4 dengan kop sekolah, info tahun anggaran, bulan, dan varian BOSP.
  - Box skor kepatuhan (0-100) dan ringkasan eksekutif auditor AI.
  - Tabel rincian temuan audit per kategori (dilengkapi kolom keparahan: *Bahaya, Peringatan, Rekomendasi*).
  - Rekomendasi perbaikan sebelum penutupan buku kas.
  - Kolom pengesahan tanda tangan: Bendahara BOSP dan Kepala Sekolah.

### Tahap 5: Antarmuka Pengguna (UI/UX)
- [ ] Buat komponen form `resources/js/Pages/Profile/Partials/DeepSeekApiForm.tsx`:
  - Input masked untuk API Key dengan toggle *Show/Hide*.
  - Pemilihan model default (`deepseek-reasoner` / `deepseek-chat`).
  - Tombol *"Uji Koneksi API"* dengan status visual (indikator loading, sukses hijau, atau pesan error merah).
  - Sisipkan komponen ini ke dalam halaman `resources/js/Pages/Profile/Edit.tsx`.
- [ ] Buat komponen modal `resources/js/Components/Ai/BkuAuditModal.tsx`:
  - Stepper visual animasi saat pemindaian berlangsung (*Memindai BKU → Cek Pajak & RKAS → Penalaran DeepSeek-R1 → Menyiapkan Laporan*).
  - Tampilan Skor Kepatuhan (gauge/circle) dengan kode warna (Hijau ≥ 85, Kuning 60-84, Merah < 60).
  - Ringkasan Eksekutif dari AI.
  - Accordion daftar temuan per kategori:
    * 🔴 *Keseimbangan Kas & Kronologi*
    * 🟠 *Kepatuhan Pajak & NTPN*
    * 🟡 *Belanja Modal vs Habis Pakai (BAST)*
    * 🔵 *Indikasi Split-Bill / Smurfing*
    * 🟣 *Kepatuhan Pagu RKAS*
  - Tombol aksi:
    * `[🔄 Audit Ulang]`
    * `[📄 Unduh Lembar Kerja Audit (PDF)]`
    * `[Tutup & Lanjutkan Penutupan Kas]`
- [ ] Integrasikan ke tab `reg` (Registrasi Penutupan Kas) di `resources/js/Pages/Penatausahaan/Rekapitulasi.tsx`:
  - Tambahkan tombol `[🔍 Pra-Audit AI (DeepSeek-R1)]` berdampingan dengan tombol Cetak PDF.
  - Tampilkan badge indikator skor audit terakhir jika bulan tersebut sudah pernah dipindai.
  - Panggil `BkuAuditModal` saat tombol diklik.

### Tahap 6: Uji Coba & Verifikasi
- [ ] Uji validasi input API Key di halaman profil dan pastikan kunci tersimpan terenkripsi di database.
- [ ] Uji tombol *"Uji Koneksi API"* dengan valid API Key dan invalid API Key.
- [ ] Uji eksekusi Pra-Audit AI pada bulan yang memiliki transaksi riil (misal Maret 2026).
- [ ] Verifikasi mekanisme caching: pastikan klik audit kedua tidak memotong kuota jika data BKU tidak berubah.
- [ ] Uji tombol *"Audit Ulang"* (`force_refresh`) untuk memastikan pembaruan data berhasil dipindai kembali.
- [ ] Uji ekspor PDF Lembar Kerja Audit AI dan verifikasi tata letak cetak.
- [ ] Jalankan `npm run build` untuk memverifikasi kebersihan kode TypeScript dan React.
