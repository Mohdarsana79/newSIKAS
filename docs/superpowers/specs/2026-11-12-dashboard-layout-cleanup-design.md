# Design Spec: Penataan Ulang Layout Dashboard & Penghapusan Menu Sinkronisasi SIKAS Neo-Bento

**Tanggal**: 12 November 2026  
**Status**: Disetujui (Approved)  
**Terkait**: `Dashboard.tsx`, `PageHeader.tsx`

---

## 1. Konteks & Masalah

### 1.1 Masalah Utama
1. **Menu Sinkronisasi Berlebih**: Tombol aksi "Sinkronkan" di header dashboard dan kartu "Integrasi ARKAS" di kolom kanan samping tidak lagi diperlukan di tampilan muka dashboard utama. Dashboard perlu difokuskan murni sebagai pusat informasi (*executive monitoring board*) keuangan sekolah.
2. **Layout Kurang Berimbang & Rapi**:
   - Kolom kiri dashboard memuat 3 kartu grafik besar bertumpuk secara vertikal (Realisasi Bulanan, Program SNP, dan Tren 5 Tahun) dengan tinggi lebih dari 1100px.
   - Kolom kanan terasa tidak simetris dan menyisakan ruang kosong besar jika kartu integrasi ARKAS ditiadakan.
   - Perlu penataan modular berimbang agar dashboard rapi, proporsional, dan estetik secara vertikal maupun horizontal.

---

## 2. Sasaran Desain

1. **Header Kontrol Bersih**: Menghapus tombol aksi sinkronisasi di `PageHeader` dan menyisakan kapsul pilihan filter `[ Varian Anggaran | Tahun ]` yang otomatis memuat ulang data melalui AJAX.
2. **Penghapusan Kartu Sinkronisasi**: Mengeliminasi komponen `ArkasQuickSyncCard` dari tampilan dashboard.
3. **Susunan Bento 3 Tingkat Berimbang**:
   - **Tingkat 1 (Metrik Cepat)**: 4 `StatCard` (Pagu, Realisasi, Sisa Kas, Penerimaan) dalam grid 4 kolom.
   - **Tingkat 2 (Aktivitas Bulanan & Kalender)**: Realisasi Bulanan (8 Kolom) berdampingan sejajar dengan Kalender Keuangan (4 Kolom).
   - **Tingkat 3 (Distribusi Belanja & Agenda)**: Program Terbesar & SNP (7 Kolom) berdampingan sejajar dengan Agenda Tahapan BOSP (5 Kolom).
   - **Tingkat 4 (Tren Jangka Panjang)**: Tren Realisasi 5 Tahun Terakhir dalam bentang lebar penuh (12 Kolom).

---

## 3. Spesifikasi Perubahan JSX & Komponen (`Dashboard.tsx`)

### 3.1 Pembersihan State & Handler
- Hapus state `isSyncing` dan handler `handleSync` (beserta timeout terkait) yang sudah tidak digunakan.
- Pertahankan `loading` untuk indikator visual pemuatan data halus saat pengguna mengganti tahun atau varian anggaran.

### 3.2 Pembaruan `PageHeader.actions`
```tsx
actions={
    <>
        {loading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-2.5 py-1.5 text-[10px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Memuat data...</span>
            </span>
        )}

        <div className="flex items-center gap-1 rounded-2xl border border-white bg-white/80 p-1 shadow-pill dark:border-white/10 dark:bg-white/5">
            <select
                value={variant}
                onChange={handleVariantChange}
                className="h-8 cursor-pointer rounded-xl border-none bg-transparent px-3 py-0 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200"
            >
                <option value="reguler">BOSP Reguler</option>
                <option value="kinerja">BOSP Kinerja</option>
                <option value="silpa">SiLPA Reguler</option>
                <option value="kinerja_silpa">SiLPA Kinerja</option>
            </select>

            <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

            <select
                value={year}
                onChange={handleYearChange}
                className="h-8 cursor-pointer rounded-xl border-none bg-transparent px-3 py-0 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-0 dark:text-slate-200"
            >
                {availableYearsList && availableYearsList.length > 0 ? (
                    availableYearsList.map((y: any) => (
                        <option key={y} value={y}>Tahun {y}</option>
                    ))
                ) : (
                    <option value={year}>Tahun {year}</option>
                )}
            </select>
        </div>
    </>
}
```

### 3.3 Penataan Grid Konten Dashboard
```tsx
<div className="space-y-5">
    {/* 1. Baris 4 StatCard Utama */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Pagu Anggaran, Total Realisasi, Sisa Kas, Penerimaan BOSP */}
    </div>

    {/* 2. Baris Realisasi Bulanan (8 Kolom) + Kalender Keuangan (4 Kolom) */}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
            {/* Realisasi Bulanan Bar Chart */}
        </div>
        <div className="xl:col-span-4">
            {/* CalendarWidget */}
        </div>
    </div>

    {/* 3. Baris Program Terbesar SNP (7 Kolom) + Agenda Tahapan (5 Kolom) */}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
            {/* Program Terbesar & SNP (Donut + Top Programs) */}
        </div>
        <div className="xl:col-span-5">
            {/* Agenda Tahapan BOSP */}
        </div>
    </div>

    {/* 4. Baris Tren Realisasi 5 Tahun Terakhir (12 Kolom Penuh) */}
    <div className="w-full">
        {/* Tren Realisasi 5 Tahun Area Chart */}
    </div>
</div>
```

---

## 4. Rencana Pengujian (*Verification Plan*)

1. **Verifikasi Visual**:
   - Memastikan tombol "Sinkronkan" di header telah hilang, dan hanya terdapat kapsul filter yang rapi.
   - Memastikan kartu "Integrasi ARKAS" tidak lagi tampil di dashboard.
   - Memeriksa kerapian layout 4 baris:
     - Realisasi Bulanan sejajar dengan Kalender.
     - Program SNP sejajar dengan Agenda Tahapan.
     - Tren 5 Tahun tampil membentang penuh di baris paling bawah.
2. **Verifikasi Interaktivitas**:
   - Mengganti pilihan Varian Anggaran dan Tahun: data harus tetap ter-fetch secara benar melalui AJAX dan grafik ter-update.
3. **Verifikasi Build**:
   - Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error TypeScript maupun dependensi yang rusak.
