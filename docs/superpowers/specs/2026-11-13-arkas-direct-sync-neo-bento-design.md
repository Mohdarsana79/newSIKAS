# Desain Direct Sync Database ARKAS & Neo-Bento Sync Modal

Tanggal: 2026-11-13  
Status: Draft untuk Review User  
Ruang Lingkup: [ArkasTools/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/ArkasTools/Index.tsx) & Komponen Baru `resources/js/Components/Arkas/ArkasSyncModal.tsx`

---

## 1. Latar Belakang & Akar Masalah

1. **Browser Freeze ("Not Responding") saat Tarik Data Semua Tahun**:
   - Alur lama mewajibkan pengguna mengklik **Tarik Data** (`GET /arkas-tools/fetch-arkas?keyword=__ALL__&year=ALL`) sebelum tombol **Sync Database** aktif.
   - Pada mode `Semua Tahun` (2024–2026, ~76.000 baris), backend memasukkan seluruh baris `Data Baru` dan `Perlu Update` ke payload JSON sekaligus, lalu frontend menyimpannya di state `results` dan merender puluhan ribu `<tr>` ke DOM tanpa paginasi. Hal ini membekukan browser, dan proses pembacaan ARKAS masih harus diulang saat tombol **Sync Database** ditekan.
2. **Tampilan & UX Modal Lama**:
   - `showFetchModal` dan `showSyncModal` pada `ArkasTools/Index.tsx` memakai container `<div className="relative overflow-hidden bg-white dark:bg-[#15131F]">` **tanpa `rounded-[26px]`**, sehingga memunculkan sudut kotak tajam di luar shell modal.
   - Progress bar menggunakan `setInterval` simulasi yang macet di `95%`, serta menampilkan hasil akhir menggunakan `alert()` bawaan browser.

---

## 2. Solusi Arsitektur (Pendekatan A — Direct Sequential Sync)

### 2.1 Penghapusan Alur 2 Tahap ("Tarik Data" -> "Sync Database")
- Menghapus tombol **Tarik Data** beserta modal `showFetchModal`, state `fetchProgress`, `isFetchingAll`, `canSync`, serta handler `triggerFetchAll` dan `confirmFetchAll`.
- Tombol **Sync Database** dibuat **selalu aktif** (hanya disable ketika `loading || isSyncing`), sehingga pengguna bisa langsung menyinkronkan data dari SQLite ARKAS ke PostgreSQL lokal kapan saja tanpa pernah memuat puluhan ribu baris ke browser.
- Memperbarui teks banner info saat `isEmptyDb === true` agar langsung mengarahkan pengguna ke tombol **Sync Database**.

### 2.2 Sinkronisasi Bertahap Per Tahun (`Sequential Per-Year Sync`)
- Endpoint `POST /arkas-tools/sync` tetap digunakan per tahun dengan payload `{ year: targetYear }`.
- Saat target adalah `'ALL'` (`Semua Tahun`), frontend menjalankan antrean sinkronisasi secara berurutan:
  `['2024', '2025', '2026']`.
- Saat target adalah satu tahun (`'2026'`, `'2025'`, atau `'2024'`), frontend menjalankan 1 request saja untuk tahun tersebut.
- **Keuntungan**:
  - Setiap request hanya memproses ~1/3 beban data dibanding `ALL` sekaligus (lebih aman dari timeout PHP & batas memori).
  - Browser tidak pernah menerima ribuan baris referensi dari proses sync — hanya menerima ringkasan angka (`synced`, `updated`, `message`).
  - Progress bar dan status per tahun menampilkan progres nyata yang terukur (`1/3 = 33%`, `2/3 = 67%`, `3/3 = 100%`).
  - Selesai sync, halaman cukup me-refresh tabel paginasi lokal (`loadPage(1, targetYear === 'ALL' ? 'ALL' : targetYear, '', perPage)`) sebanyak `perPage` baris (default 50).

---

## 3. Desain UI Neo-Bento

### 3.1 Komponen Baru: `ArkasSyncModal` (`resources/js/Components/Arkas/ArkasSyncModal.tsx`)
Diekstrak dari `ArkasTools/Index.tsx` agar bersih dan konsisten dengan `ArkasDiagnosticModal` / `BkuAuditModal`.

- **Shell & Ambient Glow**:
  - `<Modal show={show} onClose={handleClose} maxWidth="md" closeable={!isSyncing}>`
  - Wrapper utama: `relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]`
  - Layer glow terisolasi: `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]` dengan ambient gradient lembut di kanan atas dan kiri bawah.
- **Header Neo-Bento**:
  - `IconTile` (`Database` pada mode konfirmasi, `RotateCw animate-spin` saat syncing, `CheckCircle2` saat sukses, `AlertTriangle` saat error).
  - Judul **Sinkronisasi Database ARKAS** + subtitle kontekstual sesuai fase + `StatusBadge` kondisi.
  - Tombol tutup `X` di kanan atas (disabled/tersembunyi selama fase `syncing` agar tidak memutus request di tengah jalan).

### 3.2 Tiga Fase Seamless di Dalam Modal (Tanpa `alert()`)

1. **Fase `'confirm'` (Konfirmasi & Pilih Target)**:
   - **Pill Selector Target Tahun** di dalam bento box `rounded-[20px]` (`bg-slate-50/90 dark:bg-white/[0.03]`): pilihan `2026`, `2025`, `2024`, dan `Semua Tahun (2024–2026)`, default mengikuti filter `year` yang sedang dipilih di halaman.
   - **Kartu Info Lokal**: menampilkan jumlah data lokal yang saat ini tersimpan di SIKAS (dari `localStats.total` dan rincian per tahun bila tersedia) serta penjelasan singkat bahwa data disinkronkan langsung dari database lokal ARKAS ke PostgreSQL.
   - Jika target adalah `Semua Tahun`, beri catatan kecil bahwa proses berjalan bertahap per tahun (`2024 -> 2025 -> 2026`) agar ringan.
   - Footer: tombol `SecondaryButton` **Batal** dan `PrimaryButton` **Mulai Sinkronisasi**.

2. **Fase `'syncing'` (Live Progress Per Tahun)**:
   - Progress bar gradient (`from-brand-500 to-brand-400`) dengan angka persentase `tabular-nums` nyata berdasarkan jumlah tahun yang sudah selesai + step aktif (misalnya untuk 3 tahun: saat tahun ke-1 mulai berjalan tampil progres aktif dengan animasi halus pada step tersebut, lalu melompat akurat ke `33%`, `67%`, `100%` setiap request selesai).
   - **Checklist Per Tahun** (`rounded-[20px]`): setiap tahun (`2024`, `2025`, `2026`) menampilkan badge status:
     - `Menunggu`: dot netral slate.
     - `Menyinkronkan...`: spinner + aksen `brand-500` / `pastel-lavender`.
     - `Selesai`: centang mint + ringkasan `+X baru • Y update`.
     - `Gagal`: ikon warning rose + pesan error ringkas.

3. **Fase `'result'` (Ringkasan Sukses atau Error Inline)**:
   - **Saat Sukses**:
     - Header/Banner status `pastel-mint` ("Sinkronisasi Selesai").
     - Grid Bento 2 kolom (`rounded-[20px]`):
       1. **Data Baru Ditambahkan** (`totalSynced.toLocaleString('id-ID')`, aksen `text-mint`)
       2. **Data Diperbarui** (`totalUpdated.toLocaleString('id-ID')`, aksen `text-amber-600 dark:text-amber-300`)
     - Ringkasan checklist per tahun tetap terlihat rapi di bawahnya jika target > 1 tahun.
     - Footer: tombol `PrimaryButton` **Tutup & Lihat Data**.
   - **Saat Error**:
     - Kartu error inline `pastel-rose` berisi pesan error dari backend/jaringan (mis. path DB ARKAS belum valid) + checklist tahun mana yang sempat berhasil/gagal.
     - Footer: `SecondaryButton` **Tutup** dan `PrimaryButton` **Coba Lagi**.

### 3.3 Pembaruan 4 Kartu Ringkas & Toolbar di `ArkasTools/Index.tsx`
- **Toolbar Filter & Aksi**: tetap memuat input Cari Keyword, select Tahun (`2026`, `2025`, `2024`, `Semua Tahun`), `Cari`, **`Sync Database`** (selalu aktif), dan `Export Excel (CSV)`. Tombol **Tarik Data** dihapus.
- **4 Kartu Ringkas**:
  - Kartu 1: **Total Referensi** (`totalItems.toLocaleString('id-ID')`, subtitle `Database lokal SIKAS`).
  - Kartu 2: **Data Baru** (`lastSyncResult ? lastSyncResult.synced : 0`, subtitle `Hasil sync terakhir`).
  - Kartu 3: **Diperbarui** (`lastSyncResult ? lastSyncResult.updated : 0`, subtitle `Hasil sync terakhir`).
  - Kartu 4: **Tersinkron Lokal** (`localTotalCount` / `totalItems`, subtitle `Siap digunakan di RKAS`).
- **Catatan**: Hapus logika/state `dataSource === 'arkas'` dan badge/label yang bergantung pada preview mentah ARKAS yang tidak dipakai lagi, atau pertahankan tampilan tabel bersih berbasis database lokal PostgreSQL terpaginasi.

---

## 4. Aturan Teknis & Token Styling
- Mematuhi konfigurasi Tailwind v3 SIKAS: tidak memakai token invalid (`brand-50`, `brand-100`, `sky-100..950`, `gray-850`, `gray-750`, `py-4.5`).
- Menggunakan komponen UI bersama (`Modal`, `IconTile`, `StatusBadge`, `PrimaryButton`, `SecondaryButton`) dan token Neo-Bento valid (`rounded-[26px]`, `rounded-[20px]`, `pastel-lavender`, `pastel-mint`, `pastel-amber`, `pastel-rose`, `text-mint`, `dark:bg-[#15131F]`).
- Verifikasi setelah implementasi: `npm run build` (`tsc && vite build`) harus lolos tanpa error TypeScript atau Vite.
