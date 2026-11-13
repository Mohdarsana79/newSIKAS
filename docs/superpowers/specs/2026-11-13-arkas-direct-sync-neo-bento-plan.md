# Rencana Implementasi: Direct Sequential Sync & Neo-Bento Sync Modal (`ArkasTools`)

Acuan Desain: [2026-11-13-arkas-direct-sync-neo-bento-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-13-arkas-direct-sync-neo-bento-design.md)

## Tugas 1 — Buat Komponen `ArkasSyncModal`
- **File Baru**: `resources/js/Components/Arkas/ArkasSyncModal.tsx`
- **Props**:
  - `show: boolean`
  - `onClose: () => void`
  - `defaultYear: string` (`'2026' | '2025' | '2024' | 'ALL'`)
  - `localStats?: { total: number; perYear: Record<string, number> }`
  - `onSyncComplete: (result: { synced: number; updated: number; targetYear: string }) => void`
- **Implementasi**:
  1. Kelola state internal modal: `selectedTargetYear` (sinkron ke `defaultYear` saat modal dibuka), `phase: 'confirm' | 'syncing' | 'result'`, `yearSteps` (daftar step `['2024', '2025', '2026']` atau `[selectedTargetYear]`, status `waiting | running | done | error`, `synced`, `updated`, `errorMessage`), `totalSynced`, `totalUpdated`, `overallError`.
  2. Eksekusi `handleStartSync`:
     - Reset step sesuai `selectedTargetYear` (`ALL` -> `['2024', '2025', '2026']`, tunggal -> `[selectedTargetYear]`).
     - Jalankan loop sekuensial `for (let i = 0; i < years.length; i++)`:
       - Tandai step `i` menjadi `'running'`.
       - Panggil `axios.post('/arkas-tools/sync', { year: years[i] })`.
       - Bila `status === 'success'`, akumulasi `synced` dan `updated`, tandai step `'done'`.
       - Bila gagal / throw exception, tandai step `'error'`, isi `overallError`, hentikan loop, dan masuk ke fase `'result'`.
     - Jika semua selesai tanpa error: hitung ringkasan total, masuk ke fase `'result'`, panggil `onSyncComplete({ synced, updated, targetYear: selectedTargetYear })` agar tabel di halaman induk langsung di-refresh.
  3. UI Neo-Bento:
     - Shell `<Modal show={show} onClose={handleSafeClose} maxWidth="md" closeable={phase !== 'syncing'}>`
     - Container `<div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">` + ambient glow terisolasi `rounded-[26px]`.
     - Fase `confirm`: Pill selector tahun (`2026`, `2025`, `2024`, `Semua Tahun`), info `localStats`, catatan sequential sync untuk `ALL`, tombol `Batal` & `Mulai Sinkronisasi`.
     - Fase `syncing`: Progress bar gradient (`from-brand-500 to-brand-400`), persentase `tabular-nums`, checklist status per tahun.
     - Fase `result`: Kartu ringkas 2 kolom (`Data Baru` & `Diperbarui`) atau kartu error inline `pastel-rose`, daftar hasil per tahun, tombol `Tutup & Lihat Data` / `Coba Lagi`.

## Tugas 2 — Refactor `ArkasTools/Index.tsx`
- **File**: `resources/js/Pages/ArkasTools/Index.tsx`
- **Perubahan**:
  1. Import `ArkasSyncModal` dari `@/Components/Arkas/ArkasSyncModal`.
  2. Hapus state & handler terkait `Tarik Data` (`showFetchModal`, `fetchProgress`, `isFetchingAll`, `triggerFetchAll`, `confirmFetchAll`, `canSync`, `summary`, `dataSource === 'arkas'`).
  3. Tambahkan state ringan `lastSyncResult: { synced: number; updated: number; targetYear: string } | null` untuk mengisi kartu ringkas `Data Baru` dan `Diperbarui` setelah sinkronisasi selesai.
  4. Perbarui `exportToCSV` agar selalu mengekspor dari `/arkas-tools/search?export=1` (database lokal terindeks) tanpa cabang `dataSource === 'arkas'`.
  5. Perbarui teks subtitle `PageHeader` dan banner `isEmptyDb` agar langsung mengarahkan pengguna ke tombol **Sync Database**.
  6. Perbarui 4 kartu ringkas agar merefleksikan **Total Ditemukan**, **Data Baru (Sync Terakhir)**, **Diperbarui (Sync Terakhir)**, dan **Tersinkron Lokal**.
  7. Hapus tombol **Tarik Data** di form filter, buat tombol **Sync Database** selalu aktif (`disabled={loading}` saja), dan tampilkan `<ArkasSyncModal ... />` menggantikan `showFetchModal` + `showSyncModal` lama (serta menghapus seluruh `alert()` dari alur sync).

## Tugas 3 — Verifikasi Build & Git Commit
1. Jalankan `npm run build` (`tsc && vite build`) untuk memastikan TypeScript strict & Vite bundling bersih tanpa error/warning baru.
2. Commit hasil implementasi dengan pesan commit terstruktur.
