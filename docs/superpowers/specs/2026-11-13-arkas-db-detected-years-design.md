# Desain Deteksi Otomatis Daftar Tahun dari Database ARKAS (`arkas.db`)

Tanggal: 2026-11-13  
Status: Draft untuk Review User  
Ruang Lingkup:
- [query.py](file:///c:/laragon/www/newSIKAS2/newSIKAS/storage/app/arkas_engine/query.py)
- [ArkasToolController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/ArkasToolController.php)
- [ArkasYearSelect.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Arkas/ArkasYearSelect.tsx)
- [ArkasToolTest.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/tests/Unit/ArkasToolTest.php)

---

## 1. Latar Belakang & Tujuan

Sebelumnya, daftar tahun pada pemilih `react-select` di **Arkas Tools** diambil dari tabel `Penganggaran` milik aplikasi SIKAS. Namun karena modul Arkas Tools menyinkronkan katalog barang (`ref_acuan_barang` -> `ref_barangs`), daftar tahun yang relevan bagi pengguna adalah **tahun-tahun yang benar-benar terdeteksi di file database ARKAS (`arkas.db`)** — digabung/fallback aman dengan tahun yang sudah tersimpan di `ref_barangs` lokal bila `arkas.db` sedang tidak terbaca/offline.

---

## 2. Desain Engine Python (`storage/app/arkas_engine/query.py`)

- Menambahkan cabang khusus saat `keyword == '__YEARS__'` setelah proses dekripsi SQLCipher berhasil:
  ```python
  if keyword == '__YEARS__':
      cursor.execute(
          "SELECT DISTINCT tahun FROM ref_acuan_barang WHERE tahun IS NOT NULL ORDER BY tahun DESC"
      )
      years = [str(row[0]) for row in cursor.fetchall() if row[0] is not None]
      conn.close()
      print(json.dumps({'status': 'success', 'years': years, 'db_path': db_path}))
      return
  ```
- Operasi hanya membaca nilai unik kolom `tahun` (beberapa baris saja), sehingga selesai dalam hitungan milidetik tanpa memuat data barang.

---

## 3. Desain Backend (`ArkasToolController`)

1. **Method Baru `protected function detectArkasYears(): array`**:
   - Memanggil `$this->runPythonQuery('__YEARS__', 'ALL')`.
   - Jika response memiliki `'status' === 'success'` dan `'years'` berupa array, memfilter nilai numerik valid dan mengembalikannya sebagai `string[]`.
   - Jika engine error atau `arkas.db` belum terpasang/tidak ditemukan, mengembalikan array kosong `[]` tanpa melempar exception agar halaman tetap bisa dibuka.
2. **Pembaruan `index(Request $request)`**:
   - Menghapus query ke model `Penganggaran` (dan import `VariantConfig` yang tidak lagi dibutuhkan di `ArkasToolController`).
   - Mengambil tahun terdeteksi dari `$this->detectArkasYears()`.
   - Menggabungkan hasil tersebut dengan key tahun yang sudah tersimpan di `ref_barangs` lokal (`array_keys($yearsCount)`), menghapus duplikat, dan mengurutkan numerik descending (terbaru paling atas).
   - Fallback ke `[(string) date('Y')]` bila keduanya kosong (mis. database lokal kosong dan `arkas.db` tidak tersedia).
   - Menetapkan `$defaultYear` = `$request->filled('year') ? (string) $request->input('year') : $activeYears[0]`.
   - Mengirim `activeYears` ke Inertia (`ArkasTools/Index`).
3. **Timeout Ringan untuk `__YEARS__` di `runPythonQuery`**:
   - Menyetel `$process->setTimeout($keyword === '__YEARS__' ? 15 : 180)` agar halaman tidak pernah tertahan terlalu lama bila proses OS lambat.

---

## 4. Penyesuaian Label Frontend (`ArkasYearSelect.tsx`)

- Memperbarui pesan kosong (`noOptionsMessage`) dan komentar JSDoc dari *"Tahun anggaran aktif tidak ditemukan"* menjadi *"Tahun dari database ARKAS tidak ditemukan"* (atau *"Tahun tidak ditemukan"*), serta tetap mempertahankan seluruh fitur `react-select` searchable Neo-Bento pada `ArkasTools/Index.tsx` dan `ArkasSyncModal.tsx`.
- Ketika pengguna memilih `Semua Tahun`, antrean sinkronisasi bertahap (`ArkasSyncModal`) otomatis menjalankan tahun-tahun yang terdeteksi di `arkas.db` secara kronologis.

---

## 5. Verifikasi
- Memperbarui [ArkasToolTest.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/tests/Unit/ArkasToolTest.php) agar menguji deteksi tahun dari `arkas.db` / fallback `RefBarang` (termasuk pengujian mock/subclass `detectArkasYears()` agar test deterministik baik saat `arkas.db` tersedia maupun tidak).
- Menjalankan `vendor/bin/pint`, `php artisan test --filter=ArkasToolTest` (dan `composer test`), serta `npm run build`.

