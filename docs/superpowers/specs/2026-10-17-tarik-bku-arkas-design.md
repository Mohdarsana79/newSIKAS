# Dokumen Desain & Spesifikasi Teknis: Tarik Data BKU dari ARKAS ke newSIKAS

**Tanggal:** 17 Oktober 2026  
**Status:** Siap Direview & Disetujui Pengguna  
**Modul:** Penatausahaan / BKU (Buku Kas Umum)  

---

## 1. Latar Belakang & Analisis Kebutuhan

### 1.1 Konteks Kebutuhan
Setelah fitur penarikan **RKAS Awal (Murni)** berhasil diimplementasikan dan berjalan 100% akurat di newSIKAS, pengguna membutuhkan fitur kelanjutan untuk menarik data **Buku Kas Umum (BKU)** dari aplikasi ARKAS 4 Desktop ke newSIKAS.

Berdasarkan keputusan pengguna:
1. **Cakupan Penarikan (Kombinasi):**
   - **Level Tahunan (Semua Bulan):** Disediakan tombol pada halaman daftar BKU per tahun (`Penatausahaan/Index.tsx`) untuk menarik seluruh data BKU dalam satu tahun anggaran (Januari s.d. Desember).
   - **Level Bulanan (Per Bulan):** Disediakan tombol pada halaman detail BKU bulan berjalan (`Penatausahaan/Bku.tsx`) untuk menarik atau memperbarui data BKU pada bulan yang sedang dibuka saja.
2. **Perilaku Timpa Ulang (*Overwrite Confirmation*):**
   - Jika data BKU di newSIKAS pada periode terkait (tahunan atau bulanan) **sudah ada data**, sistem **tidak langsung menimpa atau menolak**, melainkan menampilkan modal konfirmasi timpa ulang (*overwrite*) secara eksplisit:
     * Menampilkan informasi jumlah transaksi existing di newSIKAS yang akan digantikan.
     * Memberikan checkbox konfirmasi: *"Saya memahami bahwa transaksi BKU di periode ini akan digantikan dengan data resmi dari ARKAS"*.
     * Eksekusi penarikan dijalankan secara *atomic* dalam transaksi database (`DB::beginTransaction` / `DB::rollBack`) sehingga jika terjadi kendala, data lama tetap utuh tanpa risiko korupsi data.

---

## 2. Hasil Investigasi & Pemetaan Database ARKAS ke newSIKAS

Pemeriksaan menyeluruh terhadap database terenkripsi SQLCipher ARKAS (`arkas.db`) menunjukkan **100% kompatibilitas dan kelengkapan data** terhadap struktur tabel newSIKAS:

### 2.1 Pemetaan Jenis Transaksi (`kas_umum.id_ref_bku`)

| ID Ref BKU ARKAS | Keterangan di ARKAS | Tabel Target di newSIKAS | Kolom Kunci newSIKAS |
| :--- | :--- | :--- | :--- |
| `2` | Penerimaan Dana (BBU) | `penerimaan_danas` | `sumber_dana`, `jumlah_dana`, `tanggal_terima` |
| `3` | Tarik Tunai Bank ke Tunai | `penarikan_tunais` | `jumlah_penarikan`, `tanggal_penarikan` |
| `5` | Setor Tunai ke Bank | `setor_tunais` | `jumlah_setor`, `tanggal_setor` |
| `4` | Belanja Kas Keluar (Tunai) | `buku_kas_umums` + `bku_uraian_details` | `jenis_transaksi = 'tunai'` |
| `15` | Belanja Kas Keluar (Non-Tunai) | `buku_kas_umums` + `bku_uraian_details` | `jenis_transaksi = 'non-tunai'` |
| `6` & `7` | Bunga Bank & Pajak Bunga Bank | `buku_kas_umums` | `is_bunga_record = true`, `bunga_bank`, `pajak_bunga_bank` |
| - | Tutup Buku Bulanan (`aktivasi_bku`) | `buku_kas_umums` | `tanggal_tutup = aktivasi_bku.tanggal_finish` |

### 2.2 Relasi Belanja & Rincian Barang
1. **Nota Toko (`kas_umum_nota`):**
   - `no_bukti` → `nomor_nota` (contoh: `BPU01`, `BPU02`).
   - `tgl_nota` → `tanggal_transaksi`.
   - `nama_toko` → `nama_toko`.
   - `alamat_toko` → `alamat_toko`.
   - `npwp` → `npwp`.
   - `is_siplah` → `is_siplah`.
2. **Item Rincian Belanja (`kas_umum` + `rapbs` + `rapbs_periode`):**
   - Setiap transaksi belanja di ARKAS memiliki rincian barang: `uraian`, `volume`, `satuan`, `harga_satuan`, dan `saldo` (`jumlah`).
   - Seluruh baris belanja terhubung ke `rapbs_periode` dan `rapbs`.
   - **Hasil Uji Lapangan 2026:** Dari 87 item transaksi belanja tahun 2026 di ARKAS, **87 dari 87 item (100%) cocok secara persis (*Exact Match*)** dengan data RKAS newSIKAS melalui relasi `kode_id`, `kode_rekening_id`, dan `uraian`.
3. **Pajak dan NTPN Resmi (`kas_umum_nota_pajak` & `kas_umum` sub-records):**
   - Pajak belanja (PPN, PPh 21, PPh 22, PPh 23, Pajak Daerah) tercatat pada baris `id_ref_bku = 10 / 11`.
   - Nomor NTPN resmi dan tanggal lapor tersimpan di tabel `kas_umum_nota_pajak` (`ntpn`, `tanggal_lapor`), dan akan otomatis diisikan ke kolom `ntpn`, `tanggal_lapor`, `pajak`, `persen_pajak`, dan `total_pajak` di `buku_kas_umums`.

---

## 3. Aturan Bisnis & Mekanisme Pengamanan (Business Rules)

1. **Prasyarat Wajib RKAS:**
   - Sebelum BKU dapat ditarik, **data RKAS di newSIKAS untuk tahun anggaran dan varian bersangkutan harus sudah ada**.
   - Jika RKAS masih kosong, penarikan BKU ditolak dengan pesan:  
     *"Data RKAS belum ada di newSIKAS. Silakan tarik atau isi data RKAS terlebih dahulu sebelum menarik BKU."*
2. **Dua Titik Akses Penarikan (Kombinasi):**
   - **Akses A (Tahunan):** Tombol *"Tarik BKU dari ARKAS"* pada card/accordion tahun di halaman `Penatausahaan/Index.tsx`. Menarik seluruh transaksi penerimaan, penarikan, setor tunai, belanja bulanan, dan tutup buku dari Januari hingga Desember.
   - **Akses B (Bulanan):** Tombol *"Tarik BKU Bulan Ini"* pada toolbar halaman `Penatausahaan/Bku.tsx`. Menarik seluruh transaksi belanja, mutasi kas, dan tutup buku untuk bulan aktif tersebut.
3. **Mekanisme Konfirmasi Timpa Ulang (*Overwrite*):**
   - Sistem memeriksa apakah periode target di newSIKAS sudah memiliki data:
     * **Jika Kosong:** Modal menampilkan rincian data ARKAS yang siap ditarik, tombol langsung bertuliskan *"Tarik BKU Sekarang"*.
     * **Jika Sudah Ada Data:** Modal menampilkan peringatan berwarna kuning/oranye:
       > **Peringatan Timpa Ulang Data:**  
       > Di newSIKAS sudah tercatat **{X} transaksi** pada periode ini. Melanjutkan penarikan akan menghapus transaksi saat ini dan menggantikannya dengan data resmi dari ARKAS.
       > 
       > [X] *Saya menyetujui untuk menimpa ulang data BKU yang ada.*
       Tombol *"Tarik & Timpa Ulang BKU"* baru aktif setelah persetujuan dicentang.
4. **Keamanan Transaksional Database (*Atomic Transaction*):**
   - Seluruh proses penghapusan data lama dan penginputan data baru ARKAS dieksekusi di dalam `DB::beginTransaction()`.
   - Jika ada kegagalan kueri atau format data pada tahap apapun, dilakukan `DB::rollBack()` secara otomatis sehingga database tidak akan berada dalam status korup atau setengah terisi.

---

## 4. Rencana Arsitektur & Perubahan Komponen

### 4.1 Python Engine Mandiri: `storage/app/arkas_engine/dump_bku.py`
Engine Python baru yang bertugas membaca database SQLite SQLCipher ARKAS (`arkas.db`).

Mendukung 2 perintah utama:
1. **Mode Check (`--check`):**
   - Parameter: `<tahun> <sumber_dana_id> [bulan] [manual_db_path]`
   - Memeriksa ketersediaan BKU di ARKAS tanpa menarik seluruh payload besar.
   - Output JSON:
     ```json
     {
       "status": "success",
       "exists": true,
       "tahun": 2026,
       "bulan": "Maret",
       "total_penerimaan": 1,
       "nominal_penerimaan": 14500000,
       "total_penarikan": 1,
       "nominal_penarikan": 14500000,
       "total_setor": 0,
       "nominal_setor": 0,
       "total_transaksi_belanja": 12,
       "nominal_belanja": 8348000,
       "is_tutup_buku": true,
       "tanggal_tutup": "2026-03-31",
       "bunga_bank": 0,
       "pajak_bunga": 0
     }
     ```
2. **Mode Dump (`--dump`):**
   - Parameter: `<tahun> <sumber_dana_id> [bulan] [manual_db_path]`
   - Mengambil seluruh detail terstruktur:
     * `penerimaan_dana`: array penerimaan dana.
     * `penarikan_tunai`: array penarikan tunai bank ke tunai.
     * `setor_tunai`: array setor tunai ke bank.
     * `transaksi_belanja`: array belanja (nota, toko, npwp, jenis transaksi tunai/non-tunai, rincian barang, harga, volume, kode kegiatan, kode rekening, pajak, NTPN, tanggal lapor).
     * `penutupan_bulan`: status aktivasi/tutup buku per bulan beserta tanggal finish, bunga bank, dan pajak bunga bank.

### 4.2 Routing: `routes/variant.php`
Menambahkan rute baru yang otomatis mendukung 4 varian anggaran (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`):
```php
// Check & Pull BKU Level Tahunan (di PenatausahaanController / BukuKasUmumController)
Route::get('penatausahaan/{penganggaran}/check-arkas-bku', [BukuKasUmumController::class, 'checkArkasBkuYearly'])->name('penatausahaan.check-arkas-bku');
Route::post('penatausahaan/{penganggaran}/pull-arkas-bku', [BukuKasUmumController::class, 'pullArkasBkuYearly'])->name('penatausahaan.pull-arkas-bku');

// Check & Pull BKU Level Bulanan
Route::get('penatausahaan/{penganggaran}/bku/{bulan}/check-arkas-bku', [BukuKasUmumController::class, 'checkArkasBkuMonthly'])->name('bku.check-arkas-bku');
Route::post('penatausahaan/{penganggaran}/bku/{bulan}/pull-arkas-bku', [BukuKasUmumController::class, 'pullArkasBkuMonthly'])->name('bku.pull-arkas-bku');
```

### 4.3 Backend Controller: `app/Http/Controllers/BukuKasUmumController.php`
Implementasi 4 metode:
1. `checkArkasBkuYearly(Request $request, $penganggaran_id)`:
   - Validasi keberadaan RKAS di newSIKAS.
   - Hitung jumlah transaksi BKU existing di newSIKAS pada tahun tersebut (`has_existing_data`, `existing_count`).
   - Panggil Python `--check` untuk tahun tersebut.
   - Kembalikan data gabungan status newSIKAS & ARKAS.
2. `pullArkasBkuYearly(Request $request, $penganggaran_id)`:
   - Verifikasi parameter `overwrite = true` jika terdapat data existing.
   - Panggil Python `--dump`.
   - Buka `DB::beginTransaction()`.
   - Hapus data BKU existing tahun tersebut (`buku_kas_umums`, `buku_kas_umum_uraian_details`, `penerimaan_danas`, `penarikan_tunais`, `setor_tunais`).
   - Masukkan penerimaan dana, penarikan tunai, setor tunai, transaksi belanja, rincian item (dengan pencocokan `rkas_id`), pajak/NTPN, dan record penutupan bulan.
   - `DB::commit()` dan redirect back dengan notifikasi sukses.
3. `checkArkasBkuMonthly(Request $request, $penganggaran_id, $bulan)`:
   - Validasi keberadaan RKAS.
   - Hitung jumlah transaksi BKU existing di bulan tersebut.
   - Panggil Python `--check` dengan filter bulan.
4. `pullArkasBkuMonthly(Request $request, $penganggaran_id, $bulan)`:
   - Eksekusi penarikan scoped pada bulan yang dipilih dalam transaksi database.

### 4.4 Antarmuka Pengguna (Frontend):
1. **Halaman `resources/js/Pages/Penatausahaan/Index.tsx`**:
   - Menambahkan tombol *"Tarik BKU dari ARKAS"* di header setiap tahun anggaran (di samping tombol *Cetak* dan *Tambah Penerimaan Dana*).
   - Modal Konfirmasi Penarikan Tahunan:
     * Ringkasan penerimaan, penarikan, belanja, dan status bulan.
     * Box Peringatan Overwrite jika sudah ada data BKU di newSIKAS.
     * Tombol Batal & Tombol Tarik Sekarang (dengan animasi loading/spinner).
2. **Halaman `resources/js/Pages/Penatausahaan/Bku.tsx`**:
   - Menambahkan tombol *"Tarik BKU Bulan Ini"* di toolbar atas (berdampingan dengan tombol *Tambah Pembelanjaan*, *Cari*, dan *Hapus BKU*).
   - Modal Konfirmasi Penarikan Bulanan dengan detail transaksi bulan aktif dan peringatan overwrite jika sudah ada data.

---

## 5. Rencana Pengujian & Verifikasi (Test Scenarios)

1. **Uji Script Python `dump_bku.py`**:
   - Memastikan `--check` dan `--dump` berjalan cepat, aman, dan mengembalikan JSON valid.
   - Memastikan pengujian pada data tahun 2026 menghasilkan 87 item belanja, penerimaan dana Tahap 1, penarikan tunai, serta status tutup bulan.
2. **Uji Validasi Prasyarat**:
   - Uji penolakan penarikan BKU jika data RKAS newSIKAS kosong.
3. **Uji Timpa Ulang (*Overwrite Protection*)**:
   - Cek apakah modal konfirmasi mendeteksi data existing dengan tepat.
   - Pastikan tombol eksekusi terkunci hingga checkbox persetujuan dicentang.
4. **Uji Penarikan Bulanan (Single Month)**:
   - Tarik BKU untuk bulan Maret 2026.
   - Pastikan transaksi belanja bulan Maret masuk lengkap beserta rincian item barang, toko, NPWP, pajak PPh/PPN, dan nomor NTPN.
5. **Uji Penarikan Tahunan (All Months)**:
   - Tarik seluruh BKU tahun 2026.
   - Pastikan seluruh penerimaan dana, penarikan tunai, belanja dari Januari s.d. Desember, dan status tutup buku bulanan terisi dengan rapi.
6. **Uji Integritas Saldo**:
   - Pastikan perhitungan saldo kas tunai, saldo kas bank, dan total belanja di newSIKAS sesuai dengan saldo yang tercatat di ARKAS.

---

## 6. Komitmen Keselamatan Kode
- Tidak ada modifikasi kode lama yang merusak fitur existing.
- Semua operasi database menggunakan `DB::beginTransaction()` dan `DB::rollBack()` untuk menjamin keamanan dan konsistensi data.
- Menjaga kepatuhan terhadap arsitektur 4 varian anggaran newSIKAS.
