# Implementation Plan: Pelacakan Progres Nyata (Real-Time Progress) pada Modal Restore Database

**Tanggal Rencana:** 11 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-11-realtime-restore-progress-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-11-realtime-restore-progress-design.md)

---

## 1. Ringkasan Tugas & Sasaran
Menyempurnakan modal restore database agar persentase progres dan teks tahapan berjalan secara **nyata (real-time)** mengikuti proses backend, tidak langsung melonjak ke 100% di awal:
1. Menambahkan endpoint `GET /backup/restore-progress/{restoreId}`.
2. Menyimpan status proses di file temporer disk `storage/app/temp/restore_progress_{restoreId}.json` yang tahan terhadap pembersihan skema database.
3. Mencatat tahapan persentase nyata dari awal hingga akhir (10% s/d 100%) dan status error.
4. Menerapkan polling 600ms di frontend dengan animasi pergerakan bar yang mulus.
5. Menampilkan konfirmasi centang hijau selama 1,5 detik sebelum otomatis me-reload halaman.

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Routing (`routes/web.php`)
- **File:** `routes/web.php`
- **Perubahan:**
  Tambahkan rute polling progress di dalam grup auth database backup:
  ```php
  Route::get('/backup/restore-progress/{restoreId}', [DatabaseController::class, 'restoreProgress'])
      ->name('backup.restore-progress');
  ```

### Tahap 2: Backend Controller (`app/Http/Controllers/DatabaseController.php`)
- **File:** `app/Http/Controllers/DatabaseController.php`
- **Perubahan:**
  1. Buat method `restoreProgress(string $restoreId)`:
     - Cari file `storage/app/temp/restore_progress_{$restoreId}.json`.
     - Kembalikan data status dalam format JSON (`percent`, `message`, `status`).
     - Jika file belum ada, kembalikan default:
       `['percent' => 5, 'message' => 'Menghubungkan ke server...', 'status' => 'processing']`.
  2. Buat helper `protected function setRestoreProgress(string $restoreId, int $percent, string $message, string $status = 'processing'): void`:
     - Tulis payload ke `storage/app/temp/restore_progress_{$restoreId}.json`.
  3. Modifikasi method `restore(Request $request)`:
     - Ambil `restore_id` dari request: `$restoreId = $request->input('restore_id', 'restore_' . uniqid());`.
     - Tulis status di setiap tahapan:
       * **10%**: "Memvalidasi berkas & kesiapan sistem..."
       * **20%**: "Memeriksa format paket cadangan (.rsv)..."
       * **30%**: "Mengekstrak paket arsip & file basis data..."
       * **45%**: "Membersihkan & menyiapkan skema database baru..."
       * **65%**: "Mengimpor tabel & data transaksi ke PostgreSQL..."
       * **80%**: "Menyinkronkan sequence ID & migrasi skema..."
       * **95%**: "Memulihkan berkas fisik gambar kop surat & dokumen..."
       * **100%**: "Pemulihan basis data & berkas berhasil selesai!"
     - Pada blok `catch (Exception $e)`:
       * Catat status `error`: `$this->setRestoreProgress($restoreId, 100, 'Gagal: ' . $e->getMessage(), 'error');`.
     - Pada blok `finally`:
       * Jangan langsung hapus file status agar polling terakhir dapat membaca status 100% / error. Biarkan file terhapus secara alami atau jadwalkan pembersihan.

### Tahap 3: Frontend Modal & Polling (`resources/js/Pages/Backup/Index.tsx`)
- **File:** `resources/js/Pages/Backup/Index.tsx`
- **Perubahan:**
  1. Tambahkan state:
     - `restoreStep`: status teks langkah (misal: "Mengunggah berkas...").
     - `restorePercent`: nilai angka progres (0 s/d 100).
     - `restoreStatus`: `'idle' | 'uploading' | 'processing' | 'completed' | 'error'`.
     - `restoreError`: pesan kendala jika terjadi kegagalan.
  2. Pada `executeRestore`:
     - Buat `currentRestoreId = 'restore_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)`.
     - Set status `'uploading'`, kirim form via `router.post(route('backup.restore'), { backup_file: restoreFile, restore_id: currentRestoreId })`.
     - Saat upload HTTP berjalan: skala 0% s/d 15% (mengunggah berkas).
     - Begitu upload HTTP tuntas, nyalakan interval polling (tiap 600ms) ke `route('backup.restore-progress', currentRestoreId)`.
     - Perbarui bar persentase dan teks secara mulus mengikuti balasan dari server.
     - Jika menerima `status === 'completed'`:
       * Hentikan polling.
       * Set progres 100%, tampilkan centang hijau dan pesan sukses.
       * Tunggu 1,5 detik via `setTimeout`, lalu eksekusi `window.location.reload()`.
     - Jika menerima `status === 'error'` atau request `onError`:
       * Hentikan polling.
       * Set status `'error'`, ubah warna bar jadi merah, tampilkan pesan kendala di modal.
  3. Desain UI Progress Bar:
     - Tampilan dinamis dengan warna ungu/indigo berdenyut (*animated pulse*).
     - Ikon status (spinner saat berjalan, centang hijau saat sukses, tanda seru merah saat error).
     - Tombol batal dinonaktifkan selama pemrosesan aktif, berganti tombol "Tutup" saat error terjadi.

### Tahap 4: Verifikasi & Pengujian
1. `php -l app/Http/Controllers/DatabaseController.php`
2. `npm run build`
3. Pengujian simulasi end-to-end pemulihan database dengan pengecekan respon JSON status per tahapan.
4. `vendor/bin/pint`
