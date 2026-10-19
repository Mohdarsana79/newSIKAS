# Implementation Plan & Dokumen Desain: Fitur Sync Database & Status Referensi Barang ARKAS Tools

**Tanggal:** 16 Oktober 2026  
**Status:** Menunggu Review & Persetujuan Pengguna  
**Modul:** Arkas Tools (Pencarian & Sinkronisasi Referensi Barang)  

---

## 1. Latar Belakang & Analisis Masalah

### 1.1 Kondisi Saat Ini
1. Halaman **Arkas Tools** (`resources/js/Pages/ArkasTools/Index.tsx`) saat ini hanya berfungsi sebagai viewer pencarian langsung ke database SQLite terenkripsi ARKAS (`arkas.db`) melalui perantara Python (`storage/app/arkas_engine/query.py`).
2. Di database PostgreSQL lokal SIKAS (`newSIKAS`), **belum ada tabel khusus** untuk menyimpan data referensi acuan barang (`ref_acuan_barang`).
3. Akibat belum adanya tabel lokal:
   - Setiap pencarian kata kunci harus menjalankan proses eksternal Python (`python.exe` -> `SQLCipher` -> `arkas.db`), yang lebih lambat dan memakan resource sistem.
   - Tidak ada status pembanding antara data ARKAS lokal dengan data aplikasi SIKAS.
   - Tidak ada tombol untuk menyimpan/menyinkronkan data barang ke database PostgreSQL lokal.

### 1.2 Temuan Bug & Masalah Teknis
1. **Bug Parameter Tahun di `query.py`**:
   - Di `ArkasToolController.php`, parameter `$year` dikirim ke Python `query.py`, namun di dalam query SQL `query.py`, parameter `$year` **tidak digunakan dalam klausa WHERE**.
   - Akibatnya, seluruh data dari tahun 2024, 2025, dan 2026 bercampur aduk.
2. **Karakteristik Primary Key di ARKAS**:
   - Berdasarkan inspeksi langsung pada `ref_acuan_barang` di `arkas.db`, kunci unik adalah **kombinasi `(id_barang, tahun)`**.
   - Satu `id_barang` yang sama bisa muncul di tahun 2024, 2025, dan 2026 dengan harga batas atas atau rincian yang berbeda.
   - Total data aktual di `arkas.db`:
     * Tahun 2024: 27.927 baris
     * Tahun 2025: 25.158 baris
     * Tahun 2026: 23.083 baris
     * **Total Keseluruhan:** **76.168 baris** data.
3. **Risiko Performa & Memory Limit**:
   - Mengambil 76.168 baris data sekaligus via stdout JSON Python ke PHP berukuran sekitar ~25 MB payload.
   - Insert baris demi baris menggunakan Eloquent standard akan sangat lambat (bisa memakan waktu beberapa menit).
   - **Solusi Performa:** Menggunakan batch `upsert` bawaan PostgreSQL (`DB::table('ref_barangs')->upsert(...)`) dengan chunk 2.000 data per query, sehingga 76.000 data selesai disinkronkan hanya dalam hitungan 5–10 detik.

---

## 2. Kebutuhan Fitur & Alur Kerja yang Diinginkan

Sesuai arahan pengguna dan hasil interview:
1. **Database Baru untuk Arkas Tools**: Membuat tabel `ref_barangs` di database PostgreSQL SIKAS.
2. **Kolom Status pada Tabel**:
   - `Data Baru`: Data barang dari ARKAS belum ada di database lokal SIKAS.
   - `Perlu Update`: Data barang sudah ada di database lokal SIKAS, tetapi terdapat perbedaan data (misalnya nama barang, batas atas, rekening, atau satuan mengalami perubahan di ARKAS).
   - `Sudah Ada`: Data barang di ARKAS dan database lokal SIKAS sudah sama persis.
3. **Logika Tombol Sync Database**:
   - Jika terdapat data yang berstatus `Data Baru` atau `Perlu Update`, tombol **"Sync Database"** berstatus **AKTIF** (warna hijau).
   - Jika semua data sudah berstatus `Sudah Ada` (data 100% identik / sudah tersinkron), tombol **"Sync Database"** otomatis menjadi **NON-AKTIF (Disabled)**.
4. **Mode Operasional Hibrid Cepat**:
   - Form pencarian cepat sehari-hari langsung membaca dari database lokal PostgreSQL `ref_barangs` (pencarian instan <50ms).
   - Tombol "Tarik Data" digunakan untuk memeriksa/mengambil data dari file `arkas.db`, mendeteksi status pembaruan, dan mengaktifkan tombol Sync jika ada data baru/berubah.
   - Tombol "Sync Database" melakukan penyimpanan/pembaruan ke PostgreSQL secara batch otomatis.

---

## 3. Rencana Arsitektur & Perubahan Kode

### 3.1 Migration Database: `create_ref_barangs_table.php`
Membuat file migrasi `database/migrations/2026_10_16_000001_create_ref_barangs_table.php`:
```php
Schema::create('ref_barangs', function (Blueprint $table) {
    $table->id();
    $table->string('id_barang', 50)->index();
    $table->string('nama_barang', 255);
    $table->string('kode_rekening', 50)->nullable()->index();
    $table->text('rekening')->nullable();
    $table->string('satuan', 50)->nullable();
    $table->decimal('batas_atas', 15, 2)->default(0);
    $table->integer('tahun')->index();
    $table->timestamps();

    // Composite unique agar data per tahun tidak duplikat
    $table->unique(['id_barang', 'tahun'], 'ref_barangs_id_tahun_unique');
});
```

### 3.2 Model Eloquent: `app/Models/RefBarang.php`
Membuat model untuk memudahkan interaksi data dan query pencarian:
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RefBarang extends Model
{
    protected $table = 'ref_barangs';

    protected $fillable = [
        'id_barang',
        'nama_barang',
        'kode_rekening',
        'rekening',
        'satuan',
        'batas_atas',
        'tahun',
    ];

    protected $casts = [
        'batas_atas' => 'float',
        'tahun' => 'integer',
    ];
}
```

### 3.3 Penyesuaian Engine Python: `storage/app/arkas_engine/query.py`
Memperbaiki bug parameter tahun dan menambahkan mode query yang efisien:
- Jika tahun dipilih (misal '2026'), query memfilter `WHERE a.tahun = ?`.
- Jika dipilih 'ALL', query mengambil seluruh tahun (2024–2026).
- Format output JSON tetap konsisten: `id_barang`, `nama_barang`, `kode_rekening`, `rekening`, `satuan`, `batas_atas`, `tahun`.

### 3.4 Controller Backend: `app/Http/Controllers/ArkasToolController.php`
Menyediakan 3 endpoint utama:
1. `search(Request $request)`:
   - Pencarian keyword di database lokal `ref_barangs` menggunakan SQL `ILIKE`.
   - Mengembalikan data barang beserta status `Sudah Ada`.
   - Jika tabel lokal masih kosong, mengembalikan notifikasi agar user menekan "Tarik Data".
2. `fetchArkas(Request $request)`:
   - Mengambil data dari `arkas.db` via Python.
   - Mengambil seluruh key existing dari tabel `ref_barangs` (atau per tahun terpilih) ke dalam memori hash map untuk pencocokan kilat (O(1)).
   - Membandingkan:
     * Apakah pasangan `id_barang` + `tahun` ada di tabel lokal? Jika belum -> `status = 'Data Baru'`.
     * Jika sudah ada, apakah `nama_barang`, `kode_rekening`, `satuan`, atau `batas_atas` berbeda? Jika beda -> `status = 'Perlu Update'`, jika sama -> `status = 'Sudah Ada'`.
   - Menghitung total count: `count_baru`, `count_update`, `count_ada`.
   - Mengembalikan data ke frontend beserta flag `can_sync: (count_baru > 0 || count_update > 0)`.
3. `sync(Request $request)`:
   - Mengambil data dari ARKAS yang berstatus `Data Baru` dan `Perlu Update`.
   - Melakukan batch `upsert` ke tabel `ref_barangs` dalam potongan (chunk) 2.000 baris.
   - Mengembalikan respons JSON berisi jumlah data yang berhasil ditambahkan dan diperbarui.

### 3.5 Rute Web: `routes/variant.php`
Menambahkan rute pendukung di bawah grup Arkas Tools:
```php
// Arkas Tools
Route::get('/arkas-tools', [ArkasToolController::class, 'index'])->name('arkas-tools.index');
Route::get('/arkas-tools/search', [ArkasToolController::class, 'search'])->name('arkas-tools.search');
Route::get('/arkas-tools/fetch-arkas', [ArkasToolController::class, 'fetchArkas'])->name('arkas-tools.fetch-arkas');
Route::post('/arkas-tools/sync', [ArkasToolController::class, 'sync'])->name('arkas-tools.sync');
Route::get('/arkas-tools/path', [ArkasSettingController::class, 'getPath'])->name('arkas-tools.get-path');
Route::post('/arkas-tools/path', [ArkasSettingController::class, 'savePath'])->name('arkas-tools.save-path');
```

### 3.6 Frontend: `resources/js/Pages/ArkasTools/Index.tsx`
Menyesuaikan antarmuka pengguna:
1. **Dropdown Filter Tahun**:
   - Pilihan: "2026", "2025", "2024", atau "Semua Tahun".
2. **Tombol "Sync Database"**:
   - Ditambahkan di samping tombol "Tarik Data".
   - Disabled jika:
     * Belum melakukan tarik data / tidak ada data yang dimuat.
     * Sedang proses loading/syncing.
     * Tidak ada item yang berstatus `Data Baru` atau `Perlu Update` (artinya semua sudah `Sudah Ada`).
   - Warna tombol: Hijau emerald saat aktif (`bg-emerald-600 hover:bg-emerald-700`), abu-abu saat disabled.
3. **Kolom Baru pada Tabel: "Status"**:
   - Badge `Data Baru`: Background hijau muda (`bg-emerald-100 text-emerald-800`).
   - Badge `Perlu Update`: Background kuning/amber (`bg-amber-100 text-amber-800`).
   - Badge `Sudah Ada`: Background abu-abu (`bg-gray-100 text-gray-600`).
4. **Summary Card / Badge**:
   - Menampilkan ringkasan data: Total Ditemukan, Data Baru, Perlu Update, Sudah Ada.
5. **Modal Konfirmasi & Progress Bar**:
   - Memberikan konfirmasi sebelum sinkronisasi dimulai.
   - Menampilkan animasi progress bar saat proses sinkronisasi database sedang berlangsung.
6. **Export CSV**:
   - Mempertahankan fungsi export CSV yang sudah ada dengan penambahan kolom Status.

---

## 4. Rencana Langkah Pengujian (Testing & Verifikasi)

1. **Pengujian Migrasi Database**:
   - Memastikan migration `create_ref_barangs_table` berhasil dieksekusi tanpa error di PostgreSQL.
   - Memastikan unique index `(id_barang, tahun)` terpasang.
2. **Pengujian Deteksi Status**:
   - Saat tabel `ref_barangs` masih kosong, seluruh data ARKAS harus berstatus `Data Baru`.
   - Tombol "Sync Database" harus aktif.
3. **Pengujian Sinkronisasi Batch**:
   - Menjalankan "Sync Database", memastikan data 76.000 baris masuk ke PostgreSQL tanpa timeout atau memory limit.
   - Memastikan waktu eksekusi berada dalam rentang wajar (sekitar 5–10 detik).
4. **Pengujian Penonaktifan Tombol Sync (Idempotensi)**:
   - Setelah sync selesai, ketika data dimuat ulang, seluruh data harus berstatus `Sudah Ada`.
   - Tombol "Sync Database" harus otomatis menjadi non-aktif (disabled).
5. **Pengujian Deteksi Pembaruan (Perlu Update)**:
   - Melakukan simulasi perbedaan salah satu field di database lokal, memastikan sistem mendeteksi baris tersebut sebagai `Perlu Update`.
   - Tombol "Sync Database" harus kembali aktif untuk memperbarui baris tersebut.
6. **Pengujian Pencarian Cepat**:
   - Mengetik kata kunci di form pencarian dan memastikan hasil tampil cepat langsung dari PostgreSQL.
7. **Pengujian Export Excel/CSV**:
   - Memastikan file CSV yang diunduh tetap lengkap dan bebas dari formula injection.

---

## 5. Pertanyaan & Konfirmasi Sebelum Eksekusi

Dokumen desain dan implementation plan ini telah disusun dengan cermat sesuai kebutuhan Anda.  
Sesuai **Aturan No. 1** Anda (*"Tidak boleh eksekusi kode tanpa instruksi dari saya"*), belum ada kode program yang dieksekusi atau diubah.

Silakan lakukan review terhadap rencana di atas. Jika Anda menyetujui, berikan instruksi untuk memulai eksekusi langkah demi langkah.
