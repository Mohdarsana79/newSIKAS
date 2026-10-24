# Design Spec: Guard Validasi Hapus Penganggaran (Dokumen Laporan & RKAS Perubahan)

**Tanggal:** 24 Oktober 2026  
**Status:** Approved  
**Topik:** Penganggaran, Validasi Penghapusan, Foreign Key Constraint, Dokumen Laporan (SP2B, SPTJ, SPMTH, LPH)  

---

## 1. Latar Belakang & Masalah
Saat pengguna mencoba menghapus penganggaran RKAS awal (`penganggarans`), aplikasi mengalami error 500:
```
SQLSTATE[23503]: Foreign key violation: 7 ERROR: update or delete on table "penganggarans" violates foreign key constraint "lphs_penganggaran_id_foreign" on table "lphs"
DETAIL: Key (id)=(3) is still referenced from table "lphs".
```
Penyebab:
1. Tabel `lphs` memiliki *foreign key* `penganggaran_id` yang mereferensikan tabel `penganggarans` tanpa aturan `onDelete('cascade')`.
2. Selain LPH, dokumen laporan lain seperti SPMTH, SPTJ, dan SP2B juga mereferensikan penganggaran pada tahun anggaran yang bersangkutan. Menghapus penganggaran saat dokumen-dokumen resmi ini telah diterbitkan berisiko merusak integritas dan riwayat data laporan keuangan sekolah.
3. Saat ini validasi hapus pada `handleDelete` di frontend maupun `destroy` di backend hanya memeriksa keberadaan transaksi BKU (`has_bku`). Keberadaan dokumen laporan dan RKAS Perubahan belum divalidasi sebelum eksekusi penghapusan.

---

## 2. Tujuan & Ruang Lingkup
1. **Pencegahan di Frontend (Modal Informasi):**
   - Mendeteksi apakah penganggaran yang akan dihapus memiliki dokumen laporan (`SPMTH`, `SPTJ`, `SP2B`, `LPH`).
   - Jika ada dokumen laporan yang sudah terbuat, tampilkan modal peringatan dengan pesan dinamis yang menyebutkan dokumen terkait:
     > *"Dokumen {nama_dokumen} telah dibuat. Tidak bisa menghapus penganggaran ini karena berisiko merusak data. Hapus {nama_dokumen} terlebih dahulu agar bisa menghapus penganggaran ini."*
   - Memvalidasi agar RKAS awal tidak dapat dihapus jika RKAS Perubahan masih ada.
2. **Pengamanan Berlapis di Backend (`destroy`):**
   - Memvalidasi keberadaan RKAS Perubahan, transaksi BKU, dan dokumen laporan (`SPMTH`, `SPTJ`, `SP2B`, `LPH`).
   - Mengembalikan redirect back dengan flash pesan error yang sesuai.
   - Menambahkan blok pengaman `try...catch (\Illuminate\Database\QueryException $e)` untuk mencegah unhandled exception / crash layar 500.
3. **Dukungan Multi-Varian:**
   - Berlaku konsisten untuk semua varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).

---

## 3. Rancangan Teknis

### 3.1 Backend (`app/Http/Controllers/PenganggaranController.php`)

#### A. Inisialisasi Model Laporan pada Konstruktor
Menambahkan model laporan pada `__construct`:
```php
$this->Spmth = VariantConfig::getModelClass('spmth', $this->variant);
$this->Sptj = VariantConfig::getModelClass('sptj', $this->variant);
$this->Sp2b = VariantConfig::getModelClass('sp2b', $this->variant);
$this->Lph = VariantConfig::getModelClass('lph', $this->variant);
```

#### B. Pengecekan Dokumen pada `index()`
Pada setiap penganggaran di perulangan `index()`:
```php
$fk = VariantConfig::penganggaranFk($this->variant);
$reports = [];
if ($this->Spmth && ($this->Spmth)::where($fk, $anggaran->id)->exists()) $reports[] = 'SPMTH';
if ($this->Sptj && ($this->Sptj)::where($fk, $anggaran->id)->exists()) $reports[] = 'SPTJ';
if ($this->Sp2b && ($this->Sp2b)::where($fk, $anggaran->id)->exists()) $reports[] = 'SP2B';
if ($this->Lph && ($this->Lph)::where($fk, $anggaran->id)->exists()) $reports[] = 'LPH';
```
Diteruskan pada data item:
```php
'reports' => $reports,
```

#### C. Proteksi pada `destroy($id)`
1. **Cek RKAS Perubahan:**
   ```php
   $hasPerubahan = $this->RkasPerubahan ? ($this->RkasPerubahan)::where($fk, $id)->exists() : false;
   if ($hasPerubahan) {
       return redirect()->back()->with('error', 'Penganggaran RKAS awal tidak dapat dihapus karena RKAS Perubahan masih ada. Anda perlu menghapus RKAS Perubahan terlebih dahulu.');
   }
   ```
2. **Cek BKU:**
   ```php
   $hasBku = ($this->BukuKasUmum)::where($fk, $id)->exists();
   if ($hasBku) {
       return redirect()->back()->with('error', 'Penganggaran tidak dapat di hapus karena sudah ada data belanja pada BKU, anda perlu menghapus data bku pada penganggaran ini untuk dapat menghapus penganggaran ini');
   }
   ```
3. **Cek Dokumen Laporan:**
   ```php
   $reports = [];
   if ($this->Spmth && ($this->Spmth)::where($fk, $id)->exists()) $reports[] = 'SPMTH';
   if ($this->Sptj && ($this->Sptj)::where($fk, $id)->exists()) $reports[] = 'SPTJ';
   if ($this->Sp2b && ($this->Sp2b)::where($fk, $id)->exists()) $reports[] = 'SP2B';
   if ($this->Lph && ($this->Lph)::where($fk, $id)->exists()) $reports[] = 'LPH';

   if (! empty($reports)) {
       $reportNames = implode(', ', $reports);
       return redirect()->back()->with('error', "Dokumen {$reportNames} telah dibuat. Tidak bisa menghapus penganggaran ini karena berisiko merusak data. Hapus {$reportNames} terlebih dahulu agar bisa menghapus penganggaran ini.");
   }
   ```
4. **Try-Catch QueryException:**
   ```php
   try {
       $penganggaran->delete();
   } catch (\Illuminate\Database\QueryException $e) {
       return redirect()->back()->with('error', 'Gagal menghapus penganggaran karena masih terdapat relasi data lain yang terhubung.');
   }
   ```

---

### 3.2 Frontend (`resources/js/Pages/Penganggaran/Index.tsx`)

#### A. Interface `PenganggaranItem`
Menambahkan properti opsional `reports`:
```tsx
interface PenganggaranItem {
    id: number;
    title: string;
    pagu: string;
    status: 'regular' | 'perubahan';
    has_perubahan: boolean;
    has_bku: boolean;
    reports?: string[];
    tahun: string;
}
```

#### B. Logika `handleDelete`
```tsx
const handleDelete = (id: number, status: 'regular' | 'perubahan') => {
    const item = items.find(i => i.id === id && i.status === status);
    if (!item) return;

    // 1. Validasi jika status regular tapi masih ada RKAS Perubahan
    if (status === 'regular' && item.has_perubahan) {
        setAlertMessage("Penganggaran RKAS awal tidak dapat dihapus karena RKAS Perubahan masih ada. Anda perlu menghapus RKAS Perubahan terlebih dahulu.");
        setIsAlertModalOpen(true);
        return;
    }

    // 2. Validasi BKU
    if (item.has_bku) {
        if (status === 'perubahan') {
            setAlertMessage("RKAS Perubahan tidak dapat dihapus karena sudah ada data belanja pada BKU bulan Juli - Desember. Anda perlu menghapus data BKU pada periode tersebut terlebih dahulu.");
        } else {
            setAlertMessage("Penganggaran tidak dapat di hapus karena sudah ada data belanja pada BKU, anda perlu menghapus data bku pada penganggaran ini untuk dapat menghapus penganggaran ini");
        }
        setIsAlertModalOpen(true);
        return;
    }

    // 3. Validasi Dokumen Laporan (SP2B, SPTJ, SPMTH, LPH)
    if (item.reports && item.reports.length > 0) {
        const reportNames = item.reports.join(', ');
        setAlertMessage(`Dokumen ${reportNames} telah dibuat. Tidak bisa menghapus penganggaran ini karena berisiko merusak data. Hapus ${reportNames} terlebih dahulu agar bisa menghapus penganggaran ini.`);
        setIsAlertModalOpen(true);
        return;
    }

    setDeleteId(id);
    setDeleteStatus(status);
    setIsDeleteModalOpen(true);
};
```

---

## 4. Kriteria Pengujian (Testing & Verification)
1. **Penghapusan dengan Dokumen Laporan:**
   - Baris penganggaran yang memiliki LPH/SPMTH/SPTJ/SP2B ketika diklik Hapus akan langsung memunculkan modal peringatan dengan daftar dokumen spesifik.
   - Modal konfirmasi hapus tidak dimunculkan dan request hapus tidak dikirim.
2. **Penghapusan dengan RKAS Perubahan:**
   - Baris penganggaran reguler yang memiliki RKAS Perubahan akan dicegah dengan modal peringatan yang mengarahkan pengguna menghapus RKAS Perubahan terlebih dahulu.
3. **Backend Safety Guard:**
   - Jika request delete dipanggil langsung (bypass frontend), backend menolak dan mengembalikan pesan error yang sesuai tanpa error 500 / foreign key violation.
4. **Penghapusan Bersih (Happy Path):**
   - Baris penganggaran yang tidak memiliki BKU, tidak memiliki RKAS Perubahan, dan tidak memiliki dokumen laporan dapat dihapus dengan sukses.
