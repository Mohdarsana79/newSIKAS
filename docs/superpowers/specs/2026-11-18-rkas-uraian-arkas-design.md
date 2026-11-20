# Desain Form Uraian Arkas, Validasi Batas Atas Harga Satuan, & Penyandingan Uraian SIKAS–ARKAS pada RKAS Awal dan RKAS Perubahan

Tanggal: 2026-11-18  
Status: Disetujui User  
Ruang Lingkup:
- `database/migrations/2026_11_18_000001_add_uraian_arkas_to_rkas_tables.php`
- [HasRkasBehavior.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/Traits/HasRkasBehavior.php)
- [RkasPerubahan.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/RkasPerubahan.php)
- [KinerjaRkasPerubahan.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/KinerjaRkasPerubahan.php)
- [ArkasToolController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ArkasToolController.php)
- [RkasController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasController.php)
- [RkasPerubahanController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/RkasPerubahanController.php)
- [BukuKasUmumController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuKasUmumController.php)
- [routes/variant.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php)
- [ArkasUraianSelect.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Rkas/ArkasUraianSelect.tsx)
- [Rkas/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/Rkas/Index.tsx)
- [RkasPerubahan/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penganggaran/RkasPerubahan/Index.tsx)

---

## 1. Latar Belakang & Tujuan
Pada alur penganggaran BOSP, sekolah sering kali menyusun uraian kegiatan di newSIKAS dengan deskripsi yang lebih spesifik (Uraian SIKAS), sedangkan di aplikasi desktop ARKAS uraian barang/jasa mengikuti katalog acuan barang (`ref_acuan_barang` yang disinkronkan ke tabel `ref_barangs` melalui menu **Arkas Tools**) atau diketik manual apabila kode rekening tersebut tidak memiliki katalog acuan di ARKAS.

Fitur ini menambahkan field **Uraian Arkas** pada form Tambah/Edit **RKAS Awal** dan **RKAS Perubahan** (untuk seluruh varian anggaran: `reguler`, `kinerja`, `silpa`, `kinerja_silpa`) dengan tujuan:
1. Menyandingkan **Uraian Arkas** dengan **Uraian SIKAS** sehingga saat pengguna melakukan **Tarik RKAS dari ARKAS** maupun **Tarik BKU dari ARKAS**, data antara newSIKAS dan ARKAS tetap selaras dan tidak merusak uraian SIKAS.
2. Menghubungkan pilihan **Uraian Arkas** dengan **Kode Rekening Belanja** dan **Tahun Anggaran Aktif** pada `ref_barangs` (Arkas Tools).
3. Memvalidasi **Harga Satuan** terhadap **Batas Atas** (`batas_atas`) dari item Uraian Arkas yang dipilih secara *real-time* (mengubah form Harga Satuan menjadi merah dengan keterangan melebihi batas atas dan memblokir penyimpanan jika melebihi batas atas).
4. Menyediakan tombol toggle **Lihat Uraian Arkas / Tampilkan Uraian SIKAS** di atas tabel RKAS serta menampilkan Uraian Arkas pada modal **Detail Data RKAS**.

---

## 2. Keputusan Desain

### 2.1 Skema Database & Model (4 Varian Anggaran)
1. **Migrasi Database (`2026_11_18_000001_add_uraian_arkas_to_rkas_tables.php`):**
   - Menambahkan dua kolom *nullable* pada 6 tabel RKAS (`rkas`, `rkas_perubahans`, `kinerja_rkas`, `kinerja_rkas_perubahans`, `silpa_rkas`, `kinerja_silpa_rkas`):
     - `uraian_arkas` (`text`, *nullable*): Menyimpan teks uraian versi ARKAS (baik dari pilihan katalog Arkas Tools maupun ketikan manual).
     - `id_barang_arkas` (`string`, *nullable*): Menyimpan `id_barang` dari tabel `ref_barangs` (contoh: `1.3.02.05.02.0005.00189-1-520205020005`) apabila uraian dipilih dari katalog Arkas Tools. Kolom ini memastikan item dengan `nama_barang` kembar tetapi beda `id_barang`, `satuan`, dan `batas_atas` tetap teridentifikasi secara presisi saat proses Edit maupun validasi server-side.
   - Menambahkan composite index `ref_barangs_tahun_kode_rekening_idx` pada `['tahun', 'kode_rekening']` di tabel `ref_barangs` untuk mempercepat pencarian katalog berdasarkan tahun dan kode rekening.
2. **Model & Trait:**
   - Menambahkan `uraian_arkas` dan `id_barang_arkas` ke dalam `$fillable` pada:
     - `App\Models\Traits\HasRkasBehavior` (mencakup `Rkas`, `KinerjaRkas`, `SilpaRkas`, `KinerjaSilpaRkas`)
     - `App\Models\RkasPerubahan`
     - `App\Models\KinerjaRkasPerubahan`

### 2.2 Endpoint Pencarian Uraian Arkas berdasarkan Kode Rekening & Tahun
1. **`ArkasToolController::byRekening(Request $request)` (`GET /arkas-tools/by-rekening`, route name: `arkas-tools.by-rekening` di `routes/variant.php`):**
   - Parameter:
     - `year` (`int`, wajib): Tahun anggaran aktif pada Penganggaran (contoh: `2026`, `2027`).
     - `kode_rekening` (`string`, wajib): Kode rekening belanja yang dipilih (contoh: `5.2.02.05.02.0005`).
     - `keyword` (`string`, opsional): Kata kunci pencarian `nama_barang` atau `id_barang`.
     - `id_barang` (`string`, opsional): Untuk memuat detail item terpilih saat mode Edit.
   - Respons JSON:
     - `year_synced` (`bool`): Apakah tabel `ref_barangs` memiliki data untuk `tahun = $year`.
     - `has_rekening_catalog` (`bool`): Apakah terdapat baris di `ref_barangs` dengan `tahun = $year` dan `kode_rekening = $kodeRekening`.
     - `total_rekening_items` (`int`): Jumlah total barang pada kode rekening dan tahun tersebut.
     - `data` (`array`): Daftar barang (dibatasi maksimal 150 item teratas yang cocok dengan `keyword` agar dropdown tetap ringan dan responsif) dengan atribut:
       - `id_barang`
       - `nama_barang`
       - `kode_rekening`
       - `satuan`
       - `batas_atas` (`float`)
       - `tahun` (`int`)
     - `selected_item` (`object|null`): Detail item spesifik jika `id_barang` atau `uraian_arkas` dikirimkan saat membuka form Edit.

### 2.3 Komponen Form `Uraian Arkas` (`ArkasUraianSelect.tsx`) & Alur Interaksi Modal
1. **Tata Letak & Sifat Field:**
   - Diletakkan satu baris penuh tepat di bawah field **Rekening Belanja** dan di atas grid 2 kolom (**Uraian** & **Harga Satuan**) pada modal Tambah/Edit `Rkas/Index.tsx` dan `RkasPerubahan/Index.tsx`.
   - Bersifat **opsional** (boleh dikosongkan meskipun tahun sudah tersinkron di Arkas Tools).
2. **State & Kondisi Non-Aktif:**
   - **Tahun Belum Tersinkron (`!anggaran.is_arkas_year_synced`)**: Input dinonaktifkan (`disabled`) dengan tampilan peringatan halus: *"Data Arkas Tools untuk tahun anggaran {anggaran.tahun} belum disinkronkan. Silakan sinkronkan di menu Arkas Tools untuk mengaktifkan form ini."*
   - **Rekening Belanja Belum Dipilih (`!data.rekening_id`)**: Input dinonaktifkan sementara dengan placeholder *"-- Pilih Rekening Belanja terlebih dahulu --"*.
3. **Relasi dengan Kode Rekening (`kode_rekening`):**
   - Ketika pengguna memilih **Rekening Belanja** (misal `5.2.02.05.02.0005`), komponen mengecek katalog `ref_barangs` pada tahun anggaran aktif:
     - **Kondisi A — Rekening Terdaftar di Katalog Arkas Tools (`has_rekening_catalog === true`)**:
       - Form berfungsi sebagai *searchable combobox* dengan ikon pencarian (mirip tampilan ARKAS desktop).
       - Pengguna mengetik pada form untuk memfilter uraian pada rekening tersebut.
       - Dropdown menampilkan tabel 4 kolom: **Kode** (`id_barang`), **Uraian** (`nama_barang`), **Satuan** (`satuan`), dan **Batas Atas** (`Rp ...`).
       - Saat salah satu baris dipilih:
         1. `data.uraian_arkas` diisi dengan `nama_barang` dan `data.id_barang_arkas` diisi dengan `id_barang`.
         2. State `batasAtas` diset ke nilai `batas_atas` item tersebut.
         3. Kolom **Satuan** pada seluruh baris `data.alokasi` bulan otomatis diisi dengan `satuan` dari item Arkas tersebut (untuk bulan yang belum terealisasi penuh / `!isLunas`).
         4. Apabila kolom **Uraian (SIKAS)** (`data.uraian`) masih kosong, otomatis diisi dengan `nama_barang` tersebut untuk memudahkan pengguna (pengguna tetap bebas mengubah Uraian SIKAS sesuai kebutuhan).
       - Tersedia tombol hapus pilihan (`X`) untuk mengosongkan kembali `Uraian Arkas`.
     - **Kondisi B — Rekening Tidak Ada di Katalog Arkas Tools (`has_rekening_catalog === false`)**:
       - Form otomatis berfungsi sebagai input teks bebas (*free-text*) di mana pengguna mengetikkan sendiri `Uraian Arkas`.
       - `data.id_barang_arkas` diset `''` (kosong) dan `batasAtas` diset `null` (tidak ada pembatasan batas atas harga satuan).
       - Ditampilkan petunjuk kecil di bawah input: *"Rekening belanja ini tidak memiliki katalog di Arkas Tools — silakan ketik Uraian Arkas secara manual."*
   - Jika pengguna mengganti **Rekening Belanja** ke rekening lain pada saat input baru (atau mengedit rekening), pilihan `uraian_arkas`, `id_barang_arkas`, dan `batasAtas` di-reset agar tidak terjadi ketidakcocokan rekening.

### 2.4 Validasi Batas Atas Harga Satuan (Hard Validation)
1. **Validasi Real-Time di Frontend (`Rkas/Index.tsx` & `RkasPerubahan/Index.tsx`):**
   - Jika item `Uraian Arkas` yang dipilih memiliki `batasAtas !== null && batasAtas > 0` dan `Number(data.harga_satuan) > batasAtas`:
     - Input **Harga Satuan** diberi styling error merah (`!border-rose-400 !bg-rose-50/70 !text-rose-700 focus:!border-rose-500 focus:!ring-rose-200/60 dark:!border-rose-500/60 dark:!bg-rose-500/10 dark:!text-rose-300`).
     - Di bawah input Harga Satuan ditampilkan pesan validasi merah: `"Melebihi batas atas harga satuan Arkas (Maks: Rp {format(batasAtas)})"`.
     - Saat form di-submit (`submit()`), sistem memblokir penyimpanan apabila Harga Satuan masih melebihi `batasAtas`.
   - Jika `batasAtas` bernilai `0` atau `null` (misal input manual atau item tanpa batas atas di Arkas), validasi batas atas tidak memblokir Harga Satuan.
2. **Validasi Server-Side (`RkasController` & `RkasPerubahanController`):**
   - Pada method `store` dan `updateGroup` / `update`, jika `id_barang_arkas` (atau `uraian_arkas` pada kode rekening tersebut) merujuk ke baris `RefBarang` pada tahun anggaran aktif dengan `batas_atas > 0`, dan `harga_satuan > batas_atas`, backend mengembalikan error validasi pada `harga_satuan`: `"Harga satuan melebihi batas atas Arkas (Maks: Rp ...)."`.

### 2.5 Tombol Toggle "Lihat Uraian Arkas / Tampilkan Uraian SIKAS" & Modal Detail Item
1. **Tombol Toggle di Atas Tabel RKAS Awal & RKAS Perubahan:**
   - Pada bagian `actions` komponen `DataTable` (di samping badge jumlah baris), ditambahkan tombol toggle:
     - Saat state `showArkasUraian === false` (default): label tombol adalah **"Lihat Uraian Arkas"**, header kolom tabel tertulis **"Uraian"**, dan sel menampilkan `item.uraian` (Uraian SIKAS).
     - Saat diklik (`showArkasUraian === true`): label tombol berubah menjadi **"Tampilkan Uraian SIKAS"**, header kolom tabel berubah menjadi **"Uraian Arkas"**, dan sel menampilkan `item.uraian_arkas` (atau teks miring *"Belum disandingkan"* dengan sub-teks `item.uraian` jika `uraian_arkas` masih kosong).
   - Pencarian tabel (`searchQuery`) juga mencari pada `item.uraian` maupun `item.uraian_arkas`.
2. **Modal Detail Item (`Detail Data RKAS`):**
   - Pada bagian **Informasi Anggaran** di modal Detail Item (`Rkas/Index.tsx` & `RkasPerubahan/Index.tsx`), ditampilkan field **Uraian SIKAS** dan **Uraian Arkas** (menampilkan nilai `uraian_arkas` atau `"-"` jika belum diisi).

### 2.6 Integrasi Sinkronisasi: Tarik BKU dari ARKAS, Tarik RKAS dari ARKAS, & Salin Data
1. **Tarik BKU dari ARKAS (`BukuKasUmumController::executePullArkasBku`)**:
   - Saat mencocokkan item belanja dari BKU ARKAS (`$item['rapbs_uraian']` dan `$item['uraian']`) terhadap daftar RKAS / RKAS Perubahan (`$targetPool`):
     - Prioritas 1 (Exact Match via `uraian_arkas` atau `uraian`): Mencocokkan `kode_id == $itemKegId` dan `kode_rekening_id == $itemRekId` di mana `LOWER(TRIM(rkas.uraian_arkas))` **atau** `LOWER(TRIM(rkas.uraian))` sama dengan `LOWER(TRIM($item['rapbs_uraian']))` atau `LOWER(TRIM($item['uraian']))` (dengan prioritas tambahan jika `harga_satuan` juga sama).
     - Ketika baris RKAS (`$matchedRkas`) ditemukan, detail item BKU (`BukuKasUmumUraianDetail`) disimpan dengan `'uraian' => $matchedRkas->uraian` (**Uraian SIKAS**) dan `$rkasFkKey => $matchedRkas->id`. Dengan demikian, laporan BKU dan perhitungan FIFO `dibelanjakan` pada tabel RKAS tetap 100% menggunakan Uraian SIKAS yang telah disandingkan.
2. **Perhitungan `dibelanjakan` / `getBkuSpentVolume` pada `RkasController` & `RkasPerubahanController`**:
   - Selain mencocokkan berdasarkan signature `kode_id + kode_rekening_id + LOWER(TRIM(uraian)) + harga_satuan`, juga mendukung pencocokan jika detail BKU memiliki teks yang sama dengan `LOWER(TRIM(uraian_arkas))` pada kegiatan, rekening, dan harga satuan yang sama, sehingga data BKU yang ditarik sebelum maupun sesudah penyandingan tetap terbaca akurat.
3. **Tarik RKAS Awal & RKAS Perubahan dari ARKAS (`ArkasRkasSyncService`, `pullArkasRkas`, & `pullArkasRkasPerubahan`)**:
   - Tombol **Tarik dari ARKAS** pada halaman **RKAS Awal** (`Rkas/Index.tsx`) dan **RKAS Perubahan** (`RkasPerubahan/Index.tsx`) selalu ditampilkan bagi Bendahara meskipun data RKAS sudah terisi maupun BKU sudah memiliki transaksi.
   - **Mode A — RKAS SIKAS masih kosong (`0` baris)**:
     - Seluruh baris dari ARKAS di-insert dengan `uraian` (SIKAS) = `uraian_arkas` = teks uraian dari ARKAS, beserta `id_barang_arkas` jika cocok di `ref_barangs`.
     - Nilai `pagu_anggaran` pada `penganggaran` diperbarui dari ARKAS apabila `paguArkas > 0`.
   - **Mode B — RKAS SIKAS sudah terisi (`> 0` baris) — Mode Penyandingan Aman (Match-Only, Anti Pembengkakan Anggaran)**:
     - Sistem **TIDAK PERNAH menghapus** baris SIKAS, **TIDAK PERNAH menimpa** `uraian` SIKAS (maupun volume/harga/bulan SIKAS), **TIDAK PERNAH auto-insert** baris baru dari ARKAS, dan **TIDAK mengubah `pagu_anggaran`** secara otomatis.
     - Sebelum pencocokan, sistem menormalisasi:
       - `kode_kegiatan` tanpa titik akhir (`rtrim(trim($kode), '.')`) agar `"08.04.13"` dan `"08.04.13."` dianggap sama (tidak bergantung pada kesamaan integer `kode_id`),
       - `kode_rekening` di-trim,
       - `satuan` (case-insensitive + normalisasi sinonim umum ejaan Indonesia seperti `dos`/`dus`, `lbr`/`lembar`, `btl`/`botol`, `bh`/`buah`, `org`/`orang`, `bln`/`bulan`, `keg`/`kegiatan`, `pkt`/`paket`, `eks`/`eksemplar`, `kotak`/`box`) & `bulan` case-insensitive,
       - `harga_satuan` (toleransi `< 0.01`) & `volume` (toleransi `< 0.001`).
     - Algoritma pencocokan cerdas 6 pass pada kombinasi `(kode_kegiatan_norm, kode_rekening_norm)` yang sama:
       1. **Pass 1 (1-ke-1 Exact Bulan Sama + Uraian Sama):** `bulan`, `harga_satuan`, `satuan`, `volume`, dan (`uraian_arkas` atau `uraian` == `uraian` ARKAS).
       2. **Pass 2 (1-ke-1 Exact Nilai Bulan Sama):** `bulan`, `harga_satuan`, `satuan`, `volume` (tie-breaker: grup pasangan bulan lain → `similar_text`).
       3. **Pass 3 (1-ke-Banyak Agregasi Bulan Sama):** 1 item ARKAS dicocokkan ke beberapa baris SIKAS pada `bulan`, `harga_satuan`, `satuan` sama yang `SUM(jumlah) == arkas.volume` (grup penuh terlebih dahulu, lalu *bounded subset-sum*).
       4. **Pass 4 (1-ke-1 Lintas Bulan):** `kode_kegiatan`, `kode_rekening`, `harga_satuan`, `satuan`, `volume` sama meski bulan berbeda (tie-breaker: exact uraian → grup pasangan → `similar_text` → bulan terdekat).
       5. **Pass 5 (1-ke-Banyak Lintas Bulan / Split-Bulan):** beberapa baris SIKAS pada `kode_kegiatan`, `kode_rekening`, `harga_satuan`, `satuan` sama (diprioritaskan per `uraian` SIKAS yang sama) yang `SUM(jumlah) == arkas.volume`.
       6. **Pass 6 (Banyak-ke-1 Lintas Bulan):** beberapa item ARKAS dengan `(kode_kegiatan, kode_rekening, uraian, satuan, harga_satuan)` sama yang `SUM(volume)`-nya sama dengan `jumlah` pada 1 baris SIKAS.
     - **Laporan Peringatan (`arkas_sync_report` flash Inertia + `ArkasSyncReportModal.tsx`)**:
       - Menghitung `total_sikas_rp`, `total_arkas_rp`, `selisih_rp`, `is_budget_mismatch` (`abs(selisih_rp) >= 1.0`), `matched`, `cross_month_matched`, `inserted`, `unpaired_sikas` (baris SIKAS yang `uraian_arkas`-nya masih kosong atau tidak punya pasangan di ARKAS), dan `unmatched_arkas` (item ARKAS yang gagal dicocokkan beserta alasannya).
       - Modal laporan peringatan otomatis muncul pada `Rkas/Index.tsx` & `RkasPerubahan/Index.tsx` setelah proses Tarik ARKAS selesai.
     - **Badge Peringatan di Atas Tabel**:
       - Jika masih terdapat baris dengan `uraian_arkas` kosong (`unpairedCount > 0`), ditampilkan badge amber **`{unpairedCount} baris belum disandingkan`** di sebelah tombol *Lihat Uraian Arkas* yang dapat diklik untuk memfilter khusus baris yang belum disandingkan.
4. **Salin Data (`salinDariRkas` & `copyPreviousPerubahan`)**:
   - Menyertakan kolom `uraian_arkas` dan `id_barang_arkas` saat menyalin data dari RKAS Awal ke RKAS Perubahan maupun saat menyalin data dari tahun sebelumnya.

### 2.7 Toggle "Lihat Uraian Arkas / Lihat Uraian SIKAS" pada Halaman Summary & Export PDF/Excel
1. **Tombol Toggle Global pada `Rkas/Summary.tsx` & `RkasPerubahan/Summary.tsx`**:
   - Ditempatkan di header halaman di samping tombol **Tanggal Cetak** (`Rkas/Summary.tsx`) / **Tanggal Perubahan** (`RkasPerubahan/Summary.tsx`).
   - Default (`showArkasUraian === false`): label **"Lihat Uraian Arkas"**; seluruh tab & export menampilkan **Uraian SIKAS**.
   - Saat aktif (`showArkasUraian === true`): label **"Lihat Uraian SIKAS"** (styling lime aktif); seluruh tab & export menampilkan **Uraian Arkas**.
   - **Fallback bersih**: apabila `uraian_arkas` kosong (`null`/blank), otomatis menampilkan **Uraian SIKAS** biasa tanpa label *"Belum disandingkan"*.
   - State `showArkasUraian` tetap terjaga saat berpindah tab maupun ganti bulan pada RKA Bulanan (`preserveState: true`).
2. **Backend Summary & Export (`RkasController` & `RkasPerubahanController`)**:
   - Helper `resolveDisplayUraian($item, bool $useArkas)` dan `isArkasUraianMode(Request $request)` (`?uraian_mode=arkas`).
   - `summary()` menyertakan field `uraian_arkas` pada item di `kelolaDataRkas()`, `kelolaDataRincian()`, dan `lembarData` (LK-221) tanpa mengubah kunci pengelompokan `$key` (berbasis `$item->uraian`), sehingga pasangan Murni ↔ Perubahan tidak pernah pecah.
   - Seluruh endpoint Cetak PDF & Export Excel yang menampilkan uraian item (10 endpoint pada `RkasController`, 12 endpoint pada `RkasPerubahanController`) membaca `?uraian_mode=arkas` dan meneruskan `$useArkas` ke helper data. Khusus template Rincian Pencairan (`laporan/rincian_pencairan.blade.php` & `laporan/rincian_pencairan_excel.blade.php`), kunci pengelompokan `$groupedItems` menggunakan `uraian_sikas` asli agar dua item SIKAS berbeda yang memiliki `uraian_arkas` sama tidak tergabung secara keliru saat cetak mode ARKAS.
3. **Frontend Tabs & Export URLs**:
   - Helper bersama `resources/js/Utils/rkasUraian.ts` (`getDisplayUraian`).
   - Berlaku pada seluruh tab aktif yang menampilkan uraian item: RKA Tahapan, RKA Tahapan V.1, RKA Tahapan V.2 (Perubahan), Lembar Kerja 221, RKA Bulanan, Rincian / Rincian Perubahan, dan `TabRincianPencairan` (menjaga `item.uraian` asli pada mutasi Edit/Gabung/Ungabung dan menjaga `uraian_gabungan` untuk baris gabungan).
   - File partials cadangan pada `Rkas/Partials/` & `RkasPerubahan/Partials/` ikut menerima prop opsional `showArkasUraian?: boolean` agar konsisten.
   - `handlePrint`, `handleExportExcel`, dan link export pada `TabRincianPencairan` menambahkan parameter `uraian_mode=arkas` saat `showArkasUraian === true`.

### 2.8 Sinkronisasi BKU dari ARKAS Dua-Mode (Safe Pairing & Auto-Split FIFO) + Toggle "Lihat Uraian Arkas / Lihat Uraian SIKAS" pada BKU
1. **Kolom Identitas Ganda pada Tabel BKU (4 Varian)**:
   - Pada `buku_kas_umums`, `kinerja_buku_kas_umums`, `silpa_buku_kas_umums`, dan `kinerja_silpa_buku_kas_umums`:
     - `id_transaksi_arkas` (`string`, nullable): menyimpan nomor bukti ARKAS (mis. `BPU01`, `BNU01`) tanpa menimpa `id_transaksi` SIKAS (mis. `001/BOSP/THP-I/2026`).
     - `nomor_nota_arkas` (`string`, nullable): menyimpan nomor nota ARKAS (`no_nota`) tanpa menimpa `nomor_nota` SIKAS.
     - `uraian_arkas` (`text`, nullable): menyimpan nama rekening belanja murni (`rekening_belanjas.rincian_objek`, *fallback* ke uraian transaksi ARKAS) tanpa menimpa `uraian` (`"Lunas Bayar ..."`) maupun `uraian_opsional` (`"Lunas bayar belanja ..."`) milik SIKAS.
   - Pada `buku_kas_umum_uraian_details`, `kinerja_buku_kas_umum_uraian_details`, `silpa_buku_kas_umum_uraian_details`, dan `kinerja_silpa_buku_kas_umum_uraian_details`:
     - `uraian_arkas` (`text`, nullable): menyimpan uraian item belanja asli dari ARKAS tanpa menimpa `uraian` item SIKAS.
2. **Sinkronisasi BKU Dua-Mode dievaluasi Per Bulan (`ArkasBkuSyncService` & `BukuKasUmumController::executePullArkasBku`)**:
   - **Normalisasi `kode_kegiatan`**: `rtrim(trim($kode), '.')` agar `"08.04.13"` dan `"08.04.13."` selalu cocok dan mengambil `kode_id` yang sama dengan baris RKAS yang cocok.
   - **Mode 1 — Bulan SUDAH memiliki transaksi belanja BKU di SIKAS (Safe Match-Only Pairing)**:
     - **TIDAK PERNAH menghapus** transaksi BKU SIKAS pada bulan tersebut dan **TIDAK PERNAH menimpa** `id_transaksi`, `nomor_nota`, `uraian`, `uraian_opsional`, `nama_penerima_pembayaran`, maupun relasi Kwitansi/BAST/Surat Pesanan/Tanda Terima/Dokumen.
     - Mencocokkan setiap transaksi ARKAS pada bulan tersebut ke transaksi BKU SIKAS pada bulan yang sama berdasarkan `(kode_kegiatan_norm, kode_rekening, total_transaksi_kotor)` dengan *tie-breaker* kesamaan `tanggal_transaksi` dan `nama_toko`/`nama_penerima_pembayaran`.
     - Hanya mengisi `id_transaksi_arkas`, `nomor_nota_arkas`, dan `uraian_arkas` pada header BKU yang cocok, serta `uraian_arkas` pada baris `uraian_details` (dari `rkas.uraian_arkas` yang terhubung atau item ARKAS yang cocok).
     - Mencatat volume `uraian_details` yang sudah terpakai ke dalam tracker kumulatif `$spentByRkasId` agar kuota lintas bulan terhitung akurat.
   - **Mode 2 — Bulan MASIH KOSONG di BKU SIKAS (Smart Import dengan Format Baku SIKAS + Auto-Split FIFO)**:
     - Menyinkronkan `PenerimaanDana`, `PenarikanTunai`, `SetorTunai` (tanpa duplikasi jika sudah ada pada tanggal & nominal yang sama), serta record penutupan bulan (`is_bunga_record`).
     - Menghasilkan `id_transaksi` SIKAS yang melanjutkan pola penomoran berurutan sekolah pada tahun anggaran tersebut (mis. `055/BOSP/THP-II/2026` melanjutkan `054/BOSP/THP-I/2026`, atau `BPU-032` melanjutkan `BPU-031`), sembari menyimpan `no_bukti` ARKAS (`BNU01` / `BPU55`) ke `id_transaksi_arkas` dan `no_nota` ke `nomor_nota_arkas`.
     - Mencocokkan setiap item belanja ARKAS ke pool RKAS (`RkasPerubahan` jika Tahap 2 dan sudah terisi, atau `Rkas`) dengan kolom FK dinamis yang selaras dengan pool aktif (`VariantConfig::uraianDetailRkasFk($variant, $usePerubahanPool)`), menggunakan **Auto-Split FIFO** berdasarkan sisa kuota (`jumlah - spentByRkasId`):
       - Apabila 1 item BKU ARKAS bervolume gabungan (mis. `Tinta Printer Warna-` vol 3 atau `Photo Copy` vol 140) berpasangan dengan beberapa baris RKAS SIKAS yang memiliki `uraian_arkas` sama (`EPSON Red` 1, `Blue` 1, `Yellow` 1), item otomatis dipecah (*auto-split*) menjadi beberapa baris `BukuKasUmumUraianDetail` sesuai kuota masing-masing baris RKAS SIKAS, di mana `uraian` berisi Uraian SIKAS dan `uraian_arkas` berisi Uraian ARKAS.
       - Apabila beberapa transaksi/item BKU ARKAS memakai `uraian_arkas` dan harga yang sama secara berulang (mis. `BPU10–17` atau tagihan bulanan Juli–September pada `BNU01`/`BNU09`/`BNU11`), tracker `$spentByRkasId` mengalokasikan secara berurutan (FIFO kronologis bulan) ke baris RKAS berikutnya yang masih memiliki sisa kuota.
       - Menghapus fallback berbahaya `$targetPool->first()` agar item yang tidak memiliki kecocokan kegiatan+rekening tidak pernah ditautkan ke baris RKAS yang salah.
     - Menyusun `uraian` header BKU dengan format baku SIKAS `"Lunas Bayar " . $rekeningBelanja->rincian_objek` dan `uraian_opsional` dengan `"Lunas bayar belanja " . $firstMatchedSikasUraian`, sementara `uraian_arkas` header menyimpan nama rekening belanja murni (`$rekeningBelanja->rincian_objek`) dan `detail.uraian_arkas` menyimpan uraian barang asli dari ARKAS.
3. **Tombol Toggle "Lihat Uraian Arkas / Lihat Uraian SIKAS" pada `Penatausahaan/Bku.tsx`, Modal Edit/Tambah BKU & `DetailPembelanjaanModal.tsx`**:
   - Tombol toggle ditempatkan pada deretan aksi header halaman `Bku.tsx`.
   - Saat mode default (`showArkasUraian === false`): tombol berlabel **"Lihat Uraian Arkas"**; tabel BKU, Modal Edit/Tambah BKU (Step 2 & Step 3), dan modal Detail Pembelanjaan menampilkan `id_transaksi` SIKAS (`001/BOSP/THP-I/2026`), `nomor_nota` SIKAS, `uraian_opsional`/`uraian` SIKAS (`Lunas bayar belanja...`), serta `detail.uraian` SIKAS.
   - Saat aktif (`showArkasUraian === true`): tombol berubah menjadi **"Lihat Uraian SIKAS"**; tabel BKU menampilkan `id_transaksi_arkas` (fallback ke `id_transaksi`) dan nama rekening belanja murni (`rekening_belanja.rincian_objek`, fallback ke `uraian_arkas`/`uraian_opsional`/`uraian`), modal Detail Pembelanjaan menampilkan `id_transaksi_arkas`, `nomor_nota_arkas`, serta `detail.uraian_arkas`, dan **Modal Edit/Tambah BKU (Step 2 & Step 3)** menampilkan **`uraian_arkas`** (dari `api.bku.uraian`) sebagai judul utama item beserta sub-label kecil `SIKAS: {uraian}` bila berbeda.
   - **Konsolidasi Multi-Bulan & Preservasi `uraian_arkas` saat Simpan Edit (`getUraianItems`, `store`, `update`)**: `getUraianItems` mengembalikan `uraian_arkas` dan `rkas_ids` grup lintas bulan (dengan *fallback* ke `Rkas` jika `RkasPerubahan` kosong dan tetap menyertakan item milik `exclude_bku_id`), sehingga transaksi multi-bulan tetap tercentang utuh dengan volume gabungan saat dibuka di Modal Edit; `store` dan `update` menyimpan `uraian_arkas` pada header dan setiap detail tanpa kolom `penganggaran_id` yang tidak valid pada tabel detail.

### 2.9 Toggle "Lihat BKU Arkas / Lihat BKU SIKAS" pada Halaman Rekapitulasi BKU & Seluruh Cetak PDF/Excel
1. **Tombol Toggle Global pada `Penatausahaan/Rekapitulasi.tsx`**:
   - Ditempatkan di header halaman (`PageHeader.actions`).
   - Default (`bkuMode === 'sikas'`): tombol berlabel **"Lihat BKU Arkas"**; seluruh tab & hasil cetak PDF/Excel menampilkan format SIKAS (1 baris per nota pada Buku Kas, serta No. Bukti & Uraian SIKAS).
   - Saat aktif (`bkuMode === 'arkas'`): tombol berubah menjadi **"Lihat BKU SIKAS"** (warna lime aktif); seluruh tab pratinjau langsung memuat ulang data dengan parameter `?bku_mode=arkas` dan meneruskan `bku_mode=arkas` ke seluruh 11 endpoint Cetak PDF & Export Excel.
2. **Service Terpusat `App\Services\BkuArkasDisplayService` (4 Varian)**:
   - `isArkasMode(Request $request)`: membaca `bku_mode === 'arkas'`.
   - `resolveNoBukti($bku, bool $isArkasMode)`: memakai `id_transaksi_arkas` (*fallback* ke `id_transaksi` / `nomor_nota`) saat Mode ARKAS aktif.
   - `resolveHeaderUraian($bku, bool $isArkasMode)`: memakai nama rekening belanja (`rekeningBelanja->rincian_objek`, *fallback* `uraian_arkas` / `uraian_opsional` / `uraian`) saat Mode ARKAS aktif untuk baris pajak maupun *fallback* transaksi tanpa rincian.
   - `expandArkasItems($bku, ...)`: memecah 1 transaksi BKU menjadi baris per item barang sesuai format cetakan BKU resmi ARKAS Desktop, menggabungkan item dalam nota yang sama dengan `(uraian_arkas, harga_satuan)` identik (menjumlahkan volume & nominalnya), melengkapi *fallback* `detail.uraian_arkas` dari baris RKAS/RKAS Perubahan tertaut, dan menjaga keseimbangan saldo (*fallback* ke 1 baris utuh senilai `total_transaksi_kotor` apabila tidak ada detail atau jumlah detail tidak sama dengan `total_transaksi_kotor`).
3. **Cakupan 7 Tab & 11 Endpoint Export**:
   - Berlaku seragam pada **BKU Umum** (`BukuKasUmumController` — API, PDF, Excel), **BKP Bank** (`BukuBankController` — API, PDF, Excel), **BKP Tunai** (`BukuKasPembantuTunaiController` — API, PDF, Excel), **BKP ROB** (`BukuRobController` — API, PDF), **BKP Pajak** (`BukuPajakController` — API, PDF, Excel), **BHP** (`BhpController` — API, PDF), dan **BHM** (`BhmController` — API, PDF).

### 2.10 Mode Rekonsiliasi Penuh & Deteksi Perbedaan RKAS Perubahan (ARKAS-Authoritative Tahap 2)
- **Pratinjau Deteksi Perbedaan (*Dry-Run* di `RkasPerubahanController::checkArkasRkasPerubahan`)**:
  - Ketika RKAS Perubahan SIKAS sudah terisi (`current_rkas_count > 0`), `check-arkas` memanggil `dump_rkas_perubahan.py dump` 1 kali dan menjalankan `ArkasRkasSyncService::syncFromArkas(..., reconcilePerubahan: true, spentVolumeByRowId: ..., dryRun: true)` tanpa menulis ke database, lalu mengembalikan `diff_preview` (`will_update`, `will_insert`, `will_delete`, `protected_bku`, `protected_tahap1`, `unmatched_arkas`, estimasi total Rp & selisih akhir) untuk ditampilkan pada Modal Deteksi Perbedaan (`ArkasAwalPreviewModal` dengan `scope="perubahan"`).
- **Eksekusi Penarikan (`RkasPerubahanController::pullArkasRkasPerubahan`)**:
  - Memvalidasi parameter `mode` (`reconcile` | `match_only`, *default* `'reconcile'`).
  - Pada `mode = 'match_only'` (saat pengguna memilih opsi sekunder *"Hanya Sandingkan Uraian"*), hanya menyandingkan `uraian_arkas` tanpa mengubah/menambah/menghapus baris.
  - Pada `mode = 'reconcile'` (**Mode C — `perubahan_reconcile`**):
    1. **Proteksi Mutlak Tahap 1 & Proteksi Cerdas Berbasis Volume BKU Tahap 2**: Baris Tahap 1 (`Januari–Juni`) tidak pernah diubah/dihapus dan diisolasi dari pencocokan lintas bulan dengan Tahap 2 (`sameTahap = true`). Baris Tahap 2 (`Juli–Desember`) yang sudah terpakai di `BukuKasUmumUraianDetail` (agregasi `SUM(volume)` via `VariantConfig::uraianDetailRkasFk($variant, true)` + *fallback* baris BKU *legacy* dengan FK `NULL`, dihitung di dalam `DB::transaction()`) dilindungi dari penghapusan otomatis, pergeseran bulan, perubahan `harga_satuan`, serta penurunan volume di bawah volume terpakai BKU (penyesuaian volume tetap diizinkan selama `volume_baru >= spent_volume`).
    2. **Pass 4 & Pass A (Penyesuaian Tahap 2 dengan Uraian SIKAS Terjaga)**: Pasangan 1-ke-1 Tahap 2 yang bergeser bulan dengan satuan sama (Pass 4) maupun sisa baris SIKAS Tahap 2 yang bergeser bulan (mis. `November → Oktober`), berubah volume (`2 → 4`, `9 → 10`), berganti satuan (`buah → exemplar`), atau berubah harga (Pass A1–A3) diperbarui `bulan`, `jumlah`, `satuan`, `harga_satuan`, `uraian_arkas`, dan `id_barang_arkas`-nya **tanpa mengubah `uraian` SIKAS**.
    3. **Pass B (Penambahan Item Baru Tahap 2)**: Sisa item ARKAS Tahap 2 yang benar-benar baru (dengan referensi master terdaftar dan tidak berkonflik dengan baris ber-BKU) otomatis ditambahkan ke `rkas_perubahans` (mewarisi `uraian` SIKAS jika pecahan bulan, atau memakai `uraian_arkas`).
    4. **Pass C (Penghapusan Item Tahap 2 yang Dibatalkan)**: Sisa baris SIKAS Tahap 2 tanpa pasangan di ARKAS dan tidak terpakai di BKU dihapus dari `rkas_perubahans` agar anggaran kembali seimbang (`Selisih Rp 0`). Jika hasil rekonsiliasi seimbang (`!is_budget_mismatch`) dan `paguArkas > 0`, `penganggarans.pagu_anggaran` ikut disinkronkan.
    5. **Modal Deteksi Perbedaan & Laporan (`ArkasAwalPreviewModal.tsx` & `ArkasSyncReportModal.tsx`)**: Menampilkan rincian perubahan sebelum tarik data (tab `Akan Disesuaikan`, `Akan Ditambahkan`, `Akan Dihapus Tahap 2`, `Dilindungi Tahap 1 / BKU & Peringatan`) serta ringkasan hasil setelah tarik data.

### 2.11 Deteksi Perbedaan & Rekonsiliasi Pergeseran RKAS Awal (`awal_reconcile`)
- **Sumber Versi ARKAS (`storage/app/arkas_engine/dump_rkas.py`)**:
  - Mengambil versi RKAS Awal terbaru sebelum RKAS Perubahan: prioritas `is_revisi < 100 AND soft_delete = 0 AND is_approve = 1` diurutkan `is_revisi DESC, create_date DESC`, dengan *fallback* ke `is_revisi < 100 AND soft_delete = 0` jika belum ada versi disetujui (mis. draf tahun baru).
  - Mengembalikan `is_revisi` (`0` = Murni, `>= 1` = Pergeseran ke-N) pada mode `check` maupun `dump`.
- **Deteksi Perbedaan Sebelum Menarik (*Dry-Run Preview* di `RkasController::checkArkasRkas`)**:
  - Ketika RKAS Awal SIKAS sudah terisi (`current_rkas_count > 0`), `check-arkas` menjalankan `ArkasRkasSyncService::syncFromArkas(..., reconcileAwal: true, spentVolumeByRowId: ..., dryRun: true)` tanpa menulis ke database dan mengembalikan `diff_preview` (`will_update`, `will_insert`, `will_delete`, `protected_bku`, `unmatched_arkas`, `has_differences`, `total_sikas_rp`, `estimated_sikas_rp`, `total_arkas_rp`, `estimated_selisih_rp`).
- **Rekonsiliasi RKAS Awal dengan Proteksi Cerdas Berbasis Volume BKU (`RkasController::pullArkasRkas`)**:
  - Menerima `mode` (`'reconcile'` | `'match_only'`, *default* `'match_only'` demi kompatibilitas mundur).
  - Pada `mode = 'reconcile'` (dijalankan saat pengguna menyetujui penyesuaian di Modal Deteksi Perbedaan):
    1. Menghitung total volume terpakai BKU (`SUM(volume)` di `bku_uraian_detail` varian aktif berdasarkan `VariantConfig::uraianDetailRkasFk($variant, false)`) di dalam `DB::transaction()`.
    2. **Proteksi Berbasis Volume BKU**: Baris yang sudah tersentuh BKU (`spent_volume > 0`) dilarang dihapus, dilarang digeser bulannya, dilarang diubah `harga_satuan`-nya, dan volumenya tidak boleh turun di bawah `spent_volume` (penyesuaian volume tetap diizinkan selama `volume_baru >= spent_volume`, misalnya pecah bulan `April 2 → Maret 1 + April 1` saat 1 unit di April sudah terpakai BKU).
    3. **Penyesuaian Penuh Menjaga `Uraian SIKAS` (Januari–Desember)**: Pergeseran bulan 1-ke-1, perubahan volume/satuan/harga disesuaikan mengikuti ARKAS tanpa menimpa `uraian` SIKAS; item baru/pecahan bulan ditambahkan (mewarisi `uraian` SIKAS jika cocok `(kegiatan, rekening, uraian_arkas, harga_satuan)` dengan baris SIKAS yang disesuaikan); baris SIKAS tanpa BKU yang tidak ada di ARKAS dihapus agar anggaran seimbang.
    4. Jika hasil rekonsiliasi seimbang (`!is_budget_mismatch`) dan `paguArkas > 0`, `pagu_anggaran` ikut disinkronkan.
- **UI Modal Deteksi Perbedaan (`ArkasAwalPreviewModal.tsx` & `ArkasSyncReportModal.tsx`)**:
  - Menampilkan badge status versi (`RKAS Murni` / `Pergeseran ke-N`), perbandingan total anggaran, tab detail perbedaan (`Akan Disesuaikan`, `Akan Ditambahkan`, `Akan Dihapus`, `Dilindungi BKU / Peringatan`), serta tombol aksi **Ya, Tarik & Sesuaikan** (`mode: 'reconcile'`) dan opsi sekunder **Hanya Sandingkan Uraian** (`mode: 'match_only'`).

---

## 3. Verifikasi & Pengujian
1. **Unit / Feature Test (`php artisan test`)**:
   - Menguji endpoint `GET /arkas-tools/by-rekening` (ketika tahun belum disinkron, ketika rekening ada di `ref_barangs`, dan ketika rekening tidak ada di `ref_barangs`).
   - Menguji penyimpanan & update RKAS Awal serta RKAS Perubahan dengan `uraian_arkas` dan `id_barang_arkas`.
   - Menguji validasi *hard block* ketika `harga_satuan` melebihi `batas_atas` dari `RefBarang` pada tahun aktif, serta lolos ketika `harga_satuan <= batas_atas` atau `batas_atas == 0`.
   - Menguji penyalinan `uraian_arkas` saat `salinDariRkas`.
   - Menguji pencocokan `uraian_arkas` dan penggunaan `uraian` SIKAS saat menarik BKU dari ARKAS.
2. **Pemeriksaan Kualitas Kode**:
   - Menjalankan `vendor/bin/pint` untuk format PHP.
   - Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan TypeScript strict dan bundle React bebas dari error.
   - Menjalankan review dua poros (`/code-review`: Standards & Spec) setelah implementasi selesai.
