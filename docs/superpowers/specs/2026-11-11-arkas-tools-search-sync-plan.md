# Implementation Plan: Pembenahan Pencarian Fallback ARKAS & Solusi Performa Sinkronisasi Bebas Freeze

**Tanggal Rencana:** 11 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-11-arkas-tools-search-sync-design.md`](file:///c:/laragon\www\newSIKAS2\newSIKAS\docs\superpowers\specs\2026-11-11-arkas-tools-search-sync-design.md)  

---

## 1. Ringkasan Tugas & Tujuan

Memperbaiki dua kendala utama pada modul **Arkas Tools**:
1. **Pencarian Data Fallback & Auto-Cache:**
   Jika pengguna mencari nama barang yang belum ada di database lokal SIKAS (`ref_barangs`), backend otomatis mencari ke database SQLite ARKAS (`arkas.db`), kemudian otomatis menyimpan (*upsert*) barang yang ditemukan ke tabel `ref_barangs`, dan menampilkannya di halaman web dengan indikator informatif.
2. **Penyatuan Aksi Sinkronisasi Bebas Freeze:**
   Menghilangkan alur lama tombol *Tarik Data* yang membuang puluhan ribu data mentah ke DOM browser. Menggantinya dengan satu tombol **"Sinkronkan dengan ARKAS"** yang dilengkapi modal progres. Data langsung disinkronkan ke PostgreSQL via batch upsert di backend, dan browser hanya me-render 50 data terpaginasi sehingga **0% lag/freeze**.

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Backend `ArkasToolController.php`
- **File Target:** `app/Http/Controllers/ArkasToolController.php`
- **Pekerjaan:**
  1. **Refaktor method `search(Request $request)`:**
     - Lakukan query ke `RefBarang` lokal sesuai `$year` dan `$keyword`.
     - Jika hasil lokal menghasilkan `$paginated->total() === 0` dan `$keyword !== ''` dan `$keyword !== '__ALL__'`:
       - Jalankan `$this->runPythonQuery($keyword, $year)`.
       - Jika ditemukan data dari ARKAS (`!empty($pythonResult['data'])`):
         - Siapkan array records untuk batch upsert ke tabel `ref_barangs`.
         - Eksekusi `DB::table('ref_barangs')->upsert(...)`.
         - Query ulang data yang baru masuk ke `RefBarang` terpaginasi.
         - Kembalikan respons JSON dengan properti `source: 'arkas_auto_synced'` dan pesan *"Ditemukan X barang dari ARKAS dan otomatis disimpan ke database SIKAS."*
  2. **Refaktor method `sync(Request $request)`:**
     - Pastikan parameter `$year` diterima dengan benar ('2026', '2025', atau 'ALL').
     - Panggil `runPythonQuery('__ALL__', $year)` dengan alokasi timeout yang aman.
     - Lakukan batch upsert per chunk 2.000 data ke `ref_barangs`.
     - Kembalikan ringkasan jumlah data baru dan data yang diperbarui.
  3. **Pembersihan / Streamline method `fetchArkas(Request $request)`:**
     - Menghindari pembebanan memory payload besar yang sudah tidak lagi dipakai oleh tabel frontend.

### Tahap 2: Frontend `Index.tsx`
- **File Target:** `resources/js/Pages/ArkasTools/Index.tsx`
- **Pekerjaan:**
  1. **Penyatuan Tombol di Toolbar:**
     - Hapus tombol terpisah *Tarik Data* dan *Sync Database*.
     - Buat satu tombol utama yang elegan: **"Sinkronkan dengan ARKAS"** dengan ikon `RotateCw`.
  2. **Penyempurnaan Modal Sinkronisasi Langsung:**
     - Modal menampilkan info tahun yang dipilih dan peringatan ringkas sebelum memulai.
     - Saat dikonfirmasi, kirim request `POST /arkas-tools/sync` dengan parameter tahun.
     - Tampilkan animasi loading & status yang jelas selama sinkronisasi berjalan.
     - Setelah sukses: tutup modal, tampilkan notifikasi alert/toast, dan panggil `loadPage(1, year, '')` untuk memuat 50 data pertama dari database lokal.
  3. **Tampilan Hasil Pencarian Cerdas:**
     - Jika response mengindikasikan `source === 'arkas_auto_synced'`, tampilkan alert banner hijau di atas tabel:
       *"Barang ditemukan di database ARKAS dan telah otomatis disimpan ke database SIKAS."*
     - Tabel tetap terpaginasi rapi (50 / 100 / 200 baris per halaman) tanpa risiko browser freeze.
  4. **Pembersihan State Tidak Perlu:**
     - Bersihkan state `isFetchingAll`, `showFetchModal`, dan logic yang memuat array 76.000 baris mentah ke DOM.

---

## 3. Rencana Verifikasi & Uji Coba

1. **Test Pencarian Fallback ARKAS:**
   - Jalankan pencarian keyword "kertas" saat `ref_barangs` masih kosong atau belum ada item terkait.
   - Verifikasi respon API mengembalikan data barang kertas dari `arkas.db`.
   - Verifikasi tabel PostgreSQL `ref_barangs` otomatis terisi barang tersebut.
   - Verifikasi UI menampilkan badge/banner sukses.
2. **Test Pencarian Lokal (Setelah Ter-cache):**
   - Cari kembali keyword "kertas".
   - Verifikasi bahwa data langsung disajikan cepat dari PostgreSQL lokal (`source: 'local_database'`).
3. **Test Sinkronisasi Menyeluruh (Bebas Freeze):**
   - Klik "Sinkronkan dengan ARKAS" untuk Tahun 2026.
   - Amati browser: tidak ada not responding, animasi berjalan lancar.
   - Verifikasi 23.083 data masuk ke PostgreSQL `ref_barangs`.
   - Verifikasi tabel lokal menampilkan halaman 1 dari 462 dengan lancar.
4. **Test Build & Formatting:**
   - Jalankan `npm run build` untuk memverifikasi TypeScript & Vite compile tanpa error.
   - Jalankan `vendor/bin/pint` jika ada perubahan format PHP.

