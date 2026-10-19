# Dokumen Desain & Spesifikasi Teknis: Tarik Data RKAS dari ARKAS ke RKAS Awal newSIKAS

**Tanggal:** 16 Oktober 2026  
**Status:** Disetujui Pengguna (Tahap Review Dokumen Spesifikasi)  
**Modul:** Penganggaran / RKAS (Rencana Kegiatan dan Anggaran Sekolah)  

---

## 1. Latar Belakang & Analisis Kebutuhan

### 1.1 Konteks Permasalahan
Pengguna mengelola data RKAS (Rencana Kegiatan dan Anggaran Sekolah) di aplikasi resmi Kemendikbudristek (ARKAS 4 Desktop) yang terhubung online dengan server dinas/kementerian. Pengguna ingin agar data RKAS Awal (Murni) yang telah disahkan di ARKAS dapat ditarik langsung ke dalam aplikasi newSIKAS tanpa perlu melakukan penginputan ulang secara manual satu per satu.

### 1.2 Hasil Temuan Teknis Database ARKAS (`arkas.db`)
Berdasarkan inspeksi langsung terhadap file database SQLite terenkripsi SQLCipher (`arkas.db`):
1. **Tabel `anggaran`**:
   - Menyimpan versi RKAS per tahun anggaran dan sumber dana.
   - Kolom penentu:
     - `is_revisi = 0` : **RKAS Awal / Murni** (target penarikan).
     - `is_revisi = 1` : RKAS Pergeseran.
     - `is_revisi = 100`: RKAS Perubahan.
     - `is_approve = 1`: Status telah disahkan oleh dinas.
     - `soft_delete = 0`: Data aktif (bukan draft yang dihapus).
     - `id_ref_sumber_dana`:
       * `1` : BOS Reguler (Varian `reguler` di newSIKAS).
       * `12`: BOS Kinerja (Varian `kinerja` di newSIKAS).
       * `33`: SiLPA BOS Reguler (Varian `silpa` di newSIKAS).
       * `35`: SiLPA BOS Kinerja (Varian `kinerja_silpa` di newSIKAS).
2. **Tabel `rapbs` & `rapbs_periode`**:
   - `rapbs` menyimpan kegiatan belanja, kode rekening, nama uraian barang/jasa, harga satuan, dan volume total tahunan.
   - `rapbs_periode` memecah alokasi ke dalam bulan berjalan (`id_periode` 81 = Januari s.d. 92 = Desember) beserta volume dan jumlah rupiah masing-masing bulan.
3. **Hasil Uji Kompatibilitas (*Field Mapping Test*)**:
   - Simulasi ekstraksi data Tahun 2026 Murni (80 item kegiatan, 167 baris alokasi bulanan bernilai total Rp 29.000.000) menghasilkan **100% kecocokan**:
     * Seluruh kode kegiatan (`ref_kode.id_kode`) cocok dengan tabel `kode_kegiatans` di newSIKAS.
     * Seluruh kode rekening (`ref_rekening.kode_rekening`) cocok dengan tabel `rekening_belanjas` di newSIKAS.

---

## 2. Kebutuhan & Aturan Bisnis (Business Rules)

1. **Kondisi Pengaktifan Tombol**:
   - Tombol **"Tarik dari ARKAS"** hanya aktif dan dapat diklik **jika data RKAS di newSIKAS masih kosong (`items.length === 0`)**.
   - Jika sudah ada data RKAS di newSIKAS pada tahun dan varian tersebut, tombol otomatis tidak ditampilkan / nonaktif.
2. **Proteksi Integritas BKU (Buku Kas Umum)**:
   - Penarikan data dari ARKAS **wajib dicegah** di level backend jika pada tahun anggaran tersebut sudah terdapat pencatatan belanja di BKU (`buku_kas_umums` / `bku_uraian_details`).
3. **Penyelarasan Pagu Anggaran**:
   - Saat penarikan berhasil, kolom `pagu_anggaran` pada tabel penganggaran varian aktif (misalnya `penganggarans.pagu_anggaran`) akan otomatis diperbarui agar nilainya sama persis dengan total pagu yang disahkan di ARKAS.
4. **Antarmuka Pengguna (UI) dengan Modal Preview**:
   - Saat tombol diklik, sistem tidak langsung menimpa data, melainkan terlebih dahulu menampilkan **Modal Preview** yang memuat:
     * Tahun Anggaran & Sumber Dana
     * Total Pagu Resmi ARKAS
     * Jumlah Kegiatan & Jumlah Alokasi Bulanan
     * Tombol "Batal" dan tombol "Konfirmasi & Tarik Data".

---

## 3. Rencana Arsitektur & Perubahan Komponen

### 3.1 Python Engine: `storage/app/arkas_engine/dump_rkas.py`
Engine mandiri menggunakan Python + SQLCipher untuk membaca database SQLite terenkripsi ARKAS.

Skrip ini mendukung 2 mode operasi:
1. **Mode Check (`python dump_rkas.py --check <tahun> <sumber_dana_id> [manual_db_path]`)**:
   - Memeriksa apakah data RKAS Murni (`is_revisi = 0`, `is_approve = 1`, `soft_delete = 0`) tersedia di `arkas.db`.
   - Mengembalikan payload JSON:
     ```json
     {
       "status": "success",
       "exists": true,
       "tahun": 2026,
       "sumber_dana": "BOS Reguler",
       "pagu": 29000000,
       "total_kegiatan": 80,
       "total_alokasi": 167
     }
     ```
2. **Mode Dump (`python dump_rkas.py --dump <tahun> <sumber_dana_id> [manual_db_path]`)**:
   - Mengambil seluruh 167 data alokasi bulanan secara terperinci.
   - Query SQL teroptimasi dengan memfilter `ref_kode` dan `ref_rekening` berdasarkan tahun dan sumber dana untuk menghindari penggandaan baris (*Cartesian product*).
   - Mengembalikan payload JSON:
     ```json
     {
       "status": "success",
       "pagu": 29000000,
       "data": [
         {
           "kode_kegiatan": "03.01.03.",
           "kode_rekening": "5.1.02.02.01.0003",
           "uraian": "Honorarium Narasumber...",
           "volume": 8,
           "satuan": "orang / kegiatan",
           "harga_satuan": 50000,
           "jumlah": 400000,
           "bulan": "Juli"
         }
       ]
     }
     ```

### 3.2 Routing: `routes/variant.php`
Menambahkan dua rute baru yang otomatis mewarisi sistem prefix varian (`variant:{name}`):
```php
Route::get('rkas/{id}/check-arkas', [RkasController::class, 'checkArkasRkas'])->name('rkas.check-arkas');
Route::post('rkas/{id}/pull-arkas', [RkasController::class, 'pullArkasRkas'])->name('rkas.pull-arkas');
```

### 3.3 Backend Controller: `app/Http/Controllers/RkasController.php`
Menambahkan dua metode pendukung:
1. **`checkArkasRkas(Request $request, $id)`**:
   - Mendapatkan model Penganggaran sesuai varian aktif (`$this->Penganggaran`).
   - Menentukan `sumber_dana_id` ARKAS berdasarkan varian:
     * `reguler` -> `1`
     * `kinerja` -> `12`
     * `silpa` -> `33`
     * `kinerja_silpa` -> `35`
   - Mengeksekusi Python `--check`.
   - Mengembalikan respons JSON ke antarmuka React.
2. **`pullArkasRkas(Request $request, $id)`**:
   - **Validasi Keamanan 1**: Cek apakah data `rkas` untuk `penganggaran_id` tersebut sudah ada. Jika ada (> 0), gagalkan request dengan pesan "Penarikan hanya dapat dilakukan jika data RKAS masih kosong."
   - **Validasi Keamanan 2**: Cek apakah sudah ada catatan transaksi belanja di BKU untuk penganggaran ini. Jika ada, gagalkan request demi keamanan integritas BKU.
   - Menjalankan Python `--dump`.
   - Melakukan batch pre-load `kode_kegiatans` dan `rekening_belanjas` ke dalam associative array memory untuk pencarian instan O(1).
   - Membuka transaksi database `DB::beginTransaction()`.
   - Mengupdate `pagu_anggaran` pada model penganggaran.
   - Memasukkan data ke tabel `rkas` menggunakan model varian aktif (`$this->Rkas`).
   - `DB::commit()` dan redirect kembali dengan flash session success.

### 3.4 Antarmuka Pengguna (Frontend): `resources/js/Pages/Penganggaran/Rkas/Index.tsx`
1. **Tombol "Tarik dari ARKAS"**:
   - Ditempatkan berdampingan dengan tombol "Salin" di area header:
     ```tsx
     {items.length === 0 && !anggaran.has_perubahan && (
         <button
             onClick={handleOpenArkasPreview}
             className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-xs uppercase tracking-widest ..."
         >
             <svg ... /> {/* Download / Cloud sync icon */}
             Tarik dari ARKAS
         </button>
     )}
     ```
2. **Modal Preview (`isArkasModalOpen`)**:
   - Menggunakan komponen `Modal`.
   - Menampilkan card status preview dengan layout informatif:
     * Icon status sinkronisasi.
     * Informasi Tahun & Sumber Dana.
     * Pagu Anggaran ARKAS terformat Rupiah (`Rp 29.000.000`).
     * Jumlah Kegiatan & Alokasi Bulanan.
   - Tombol "Batal" dan "Tarik Sekarang" (dilengkapi indikator spinner saat proses penarikan sedang berjalan).

---

## 4. Rencana Pengujian & Verifikasi (Test Scenarios)

1. **Uji Coba Ekstraksi Python (`dump_rkas.py`)**:
   - Memastikan `--check` dan `--dump` mengembalikan JSON valid tanpa error pada database `arkas.db`.
   - Memastikan jumlah alokasi 167 item dan total pagu tepat Rp 29.000.000 untuk tahun 2026.
2. **Uji Coba Proteksi Validasi**:
   - Uji penolakan jika RKAS tidak kosong (misal tahun 2026 saat masih berisi 177 item).
   - Uji penolakan jika terdapat data belanja di BKU.
3. **Uji Coba Penarikan End-to-End**:
   - Buka halaman RKAS dengan data kosong (misal tahun baru atau setelah di-reset).
   - Klik tombol "Tarik dari ARKAS".
   - Pastikan modal preview menampilkan data yang tepat.
   - Klik "Tarik Sekarang".
   - Pastikan halaman me-reload dengan 167 data belanja bulanan, filter bulan bekerja normal, pagu terupdate, dan total anggaran per tahap terhitung dengan benar.

---

## 5. Komitmen Keselamatan Kode
- Tidak ada modifikasi kode pada fitur yang sudah berjalan stabil.
- Semua skrip lama tetap utuh.
- Menggunakan transaksi database (`DB::beginTransaction` / `DB::rollBack`) agar penarikan bersifat *atomic* (jika ada satu kegagalan, seluruh perubahan dibatalkan sehingga database tidak korup/setengah jadi).
