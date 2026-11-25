# Desain: Master Data PTK per Tahun & Uraian Arkas Honor Guru/Tendik

Tanggal: 2026-11-24

## 1. Latar Belakang & Temuan Empiris (`arkas.db`)
Pada ARKAS Desktop, saat memilih **Kegiatan Pembayaran Honor (`07.12.*`)** bersama **Rekening Belanja Jasa Tenaga Pendidikan / Kependidikan** (mis. `5.1.02.02.01.0013` – Honorarium Guru), dropdown **Uraian** tidak mengambil daftar SSH dari `ref_acuan_barang` (yang hanya berisi item seperti Pelatih Paskibraka Rp 50.000–Rp 75.000), melainkan mengambil daftar **Guru/Tendik honorer sekolah** dari tabel **`ptk`** dengan tampilan 2 kolom **`NUPTK | Nama`**.

Temuan struktur `arkas.db`:
- Tabel `ptk` menyimpan data per `tahun_ajaran_id`, dengan kolom `ptk_id`, `nama`, `nuptk` (nullable), `jenis_kelamin`, `jenis_ptk_arkas`, `masa_kerja_tahun`, `masa_kerja_bulan`, `pernah_serfikasi`, `soft_delete`.
- Kode `jenis_ptk_arkas`:
  - `10` = Guru / Pendidik (eligible honor BOSP)
  - `11` = Tenaga Kependidikan non-pendidik (TU, Operator, Kebersihan, Keamanan, Lab)
  - `90` = ASN / PNS / Kepala Sekolah (**dikecualikan** dari dropdown honor meski `soft_delete = 0`)
- Transaksi honor di `rapbs` + `rapbs_ptk` memiliki `id_barang = NULL` sehingga **tidak dibatasi batas atas SSH**.

## 2. Keputusan Desain
1. **Penyimpanan Lokal Berversi per Tahun (`ref_ptks`) + CRUD Manual + Sync ARKAS:**
   - Tabel lokal `ref_ptks` terisolasi per `tahun` (pola sama dengan `ref_barangs`, `kode_kegiatans`, `rekening_belanjas`).
   - Kolom `sumber` (`'arkas'` | `'manual'`) melindungi entri manual bendahara agar tidak pernah tertimpa/terhapus ketika dilakukan Sync ulang dari `arkas.db`.
2. **Aturan Pemicu Strict (Persis ARKAS Desktop) + Switch Cepat ke Katalog SSH:**
   - Mode dropdown PTK aktif otomatis **hanya jika**:
     - `kode_kegiatan` berawalan `07.12.` (`07.12.01.` s.d. `07.12.04.`), **DAN**
     - `kode_rekening` termasuk rekening honor PTK (`5.1.02.02.01.0013` → Guru `10`; `0015`, `0026`, `0027`, `0030`, `0031` → Tendik `11`).
   - Kegiatan di luar `07.12.*` (mis. ekstrakurikuler Paskibraka) tetap memakai Katalog SSH.
   - Di dalam dropdown tetap tersedia tombol switch cepat **`Daftar PTK` ↔ `Katalog SSH`** (serta opsi tampilkan semua PTK honorer bila kategori Tendik kosong).
3. **Format Nilai Tersimpan:**
   - `uraian_arkas` = `Nama (NUPTK)` bila NUPTK terisi (contoh: `HUSNI (0938767668130252)`), fallback `Nama` saja bila NUPTK kosong.
   - `id_barang_arkas` = `''` / `null` dan `batasAtasArkas = null` sehingga bebas dari validasi batas atas SSH.
   - `uraian` di-autofill jika masih kosong.
4. **Menu Data Master & Integrasi Sync:**
   - Menu baru **Data PTK** di bawah grup **Data Master** pada Sidebar (RBAC module `data_ptk` di `PermissionCatalog`).
   - Fitur: selector tahun, filter kategori (`Guru/Pendidik`, `Tenaga Kependidikan`, `ASN/Nonaktif`), cari Nama/NUPTK, **Sync dari ARKAS**, **Salin Tahun**, dan **Tambah/Edit/Aktif-Nonaktif/Hapus** PTK.
   - Auto-sync fail-safe juga dijalankan saat user melakukan Sync di `Arkas Tools` maupun `Referensi Kode (Sync Semua)`.

## 3. Rencana Komponen
- Migrasi: `database/migrations/2026_11_24_000002_create_ref_ptks_table.php`
- Model: `app/Models/RefPtk.php`
- Python Engine: `storage/app/arkas_engine/dump_reference.py` (mode `ptk` + include `ptk.tahun_ajaran_id` di mode `years`)
- Service: `app/Services/RefPtkService.php`
- Controller & Routes: `app/Http/Controllers/DataPtkController.php`, update `ArkasToolController::byRekening()` & `sync()`, `ReferensiKodeController::syncAll()`, `routes/variant.php`, `app/Config/PermissionCatalog.php`
- Frontend: `ArkasUraianSelect.tsx`, `Rkas/Index.tsx`, `RkasPerubahan/Index.tsx`, `DataMaster/DataPtk/Index.tsx`, `Sidebar.tsx`, `featureSearchCatalog.ts`
- Pengujian: `tests/Feature/RkasPtkUraianTest.php`
