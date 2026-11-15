# Addendum Resep W4 — Modul RKAS (halaman tabel & cetak)

Berlaku di atas `02-design-recipe-w2.md`. Baca keduanya.

## 1. Prioritas & batas

RKAS adalah modul paling padat tabel **dan** paling dekat dengan cetak/PDF.
Aturan tambahan:

1. **`print:` classes tidak boleh disentuh.** Jangan menghapus, menambah, atau mengubah
   `print:*` (mis. `print:hidden`, `print:border`, `print:shadow-none`, `print:p-0`).
   Jangan mengubah struktur pembungkus elemen yang dipakai saat mencetak.
2. **`window.open(...)`** untuk PDF/cetak: argumen, URL, dan urutan parameter
   (`paper_size`, `orientation`, `font_size`, `tahap`, `bulan`) wajib identik.
3. Halaman bertipe **print-report** (`Summary.tsx`, dan tab yang punya `print:`):
   - Restyle **hanya chrome layar**: header/toolbar, tombol aksi, filter, tab, pesan status.
   - Area laporan (tabel besar / kop / rekap) **jangan diubah layout-nya**; biarkan kelasnya
     apa adanya kecuali penggantian warna non-print yang aman (hindari).
   - Jika ragu, **jangan ubah** area tersebut — lebih baik konservatif.
4. Halaman bertipe **layar** (Index, TabRincian, TabGrafik, TabRkaRekap, TabRincianPencairan):
   terapkan pola §4 resep W2 (Surface toolbar, DataTable pembungkus tabel, pagination pill,
   modal chrome baru, EmptyState/Skeleton).

## 2. Khusus `Index.tsx` (halaman daftar RKAS)

- Pertahankan seluruh logika: state, `useEffect`, handler, `router.*`, `axios`, `route`.
- Struktur target: `PageHeader` (breadcrumb Dashboard/Penganggaran/RKAS, judul, badge varian,
  aksi tombol existing) → kartu ringkas dari data yang sudah ada di props/state → toolbar filter
  (kontrol existing) → daftar/detail RKAS → modal existing (chrome baru).
- Jangan mengubah cara data dikelompokkan/dihitung. Jangan menambah state filter baru.

## 3. Khusus `TabRincianPencairan.tsx` (2.103 baris)

- File terbesar & paling berisiko. Kerjakan konservatif:
  - Jangan menyentuh kode sebelum `return (` kecuali import.
  - Restyle bertahap: toolbar + kartu ringkasan + tabel + pagination + modal; jangan mengubah
    struktur logika perhitungan yang ada di JSX (mis. ekspresi reduce/map) — hanya kelas.
  - Jika ada bagian yang ragu, biarkan kelas legacy-nya; laporkan bagian yang belum di-restyle.
- Jangan pecah file menjadi komponen baru.

## 4. Khusus tab ber-`print:` (TabAlurKas, TabLembarKerja221, TabRkaBulanan, TabRkaTahapan, TabRkaTahapanV1)

- Fokus: toolbar/filter/penanda status di layar.
- Tabel/report yang dipakai cetak: cukup bersihkan warna legacy **hanya jika** tidak ada
  `print:` pada elemen yang sama; kalau ada, biarkan.
- `TabRkaRekap` & `TabRincian` & `TabGrafik` tidak punya `print:` → boleh pola penuh §4
  (tabel/chart dipadatkan visual, data tetap).

## 5. Verifikasi

- Grep legacy: `bg-gray-|text-gray-|border-gray-|indigo-|purple-` harus 0 **kecuali** baris yang
  mengandung `print:` (boleh tersisa, laporkan jumlahnya) dan area laporan yang sengaja dibiarkan.
- `print:` count per file harus **sama atau lebih** dari baseline (tidak boleh berkurang).
- Verifier token: Lead akan menjalankan `verify-w2.py` dengan baseline `.baseline-w4`.
- Jangan build/tsc/git. Lapor ke Lead: status, file, ringkasan, baseline print count vs new print
  count, grep legacy, risiko.
