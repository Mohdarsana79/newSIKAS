# Rencana Implementasi: Deteksi Daftar Tahun Langsung dari `arkas.db`

Acuan Desain: [2026-11-13-arkas-db-detected-years-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-13-arkas-db-detected-years-design.md)

## Tugas 1 — Engine Python (`storage/app/arkas_engine/query.py`)
1. Tambahkan blok penanganan `if keyword == '__YEARS__':` sebelum percabangan `__ALL__` dan keyword pencarian biasa.
2. Query `SELECT DISTINCT tahun FROM ref_acuan_barang WHERE tahun IS NOT NULL ORDER BY tahun DESC`, kembalikan JSON `{ "status": "success", "years": [...], "db_path": db_path }`, lalu tutup koneksi SQLite dan return.

## Tugas 2 — Backend (`app/Http/Controllers/ArkasToolController.php`)
1. Hapus import `App\Config\VariantConfig` yang tidak dipakai lagi.
2. Tambahkan method `protected function detectArkasYears(): array`:
   - Memanggil `$this->runPythonQuery('__YEARS__', 'ALL')`.
   - Mengembalikan list string tahun valid (`ctype_digit` / numerik) jika `status === 'success'` dan `is_array($res['years'] ?? null)`, atau `[]` jika gagal.
3. Perbarui `index(Request $request)`:
   - Hitung `$yearsCount` dari `RefBarang` lebih dahulu.
   - Ambil `$arkasYears = $this->detectArkasYears();`.
   - Gabungkan unik `$arkasYears` + `array_map('strval', array_keys($yearsCount))`, filter nilai numerik non-kosong, urutkan descending (`usort(..., fn ($a, $b) => (int) $b <=> (int) $a)`).
   - Fallback ke `[(string) date('Y')]` jika kosong.
   - Gunakan `$activeYears[0]` sebagai `defaultYear` bila `?year` belum diisi.
4. Perbarui timeout `runPythonQuery()` menjadi `15` detik ketika `$keyword === '__YEARS__'` dan `180` detik untuk query data.

## Tugas 3 — Penyesuaian Label & Test (`ArkasYearSelect.tsx` & `ArkasToolTest.php`)
1. Perbarui `noOptionsMessage` & komentar di `resources/js/Components/Arkas/ArkasYearSelect.tsx`.
2. Perbarui `tests/Unit/ArkasToolTest.php`:
   - Ganti test `Penganggaran` sebelumnya menjadi test deteksi tahun dari `arkas.db` (via partial mock `detectArkasYears()` pada `ArkasToolController` yang di-bind ke container agar deterministik) digabung dengan tahun di `RefBarang`, memverifikasi urutan descending dan `defaultYear`.

## Tugas 4 — Verifikasi & Commit
1. Jalankan `vendor/bin/pint` pada file PHP yang diubah.
2. Jalankan `php artisan test --filter=ArkasToolTest` dan `npm run build` (`tsc && vite build`).
3. Commit perubahan.

