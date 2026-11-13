# Desain Neo-Bento Modal Pra-Audit Forensik AI (`BkuAuditModal`)

**Tanggal:** 2026-11-13  
**Komponen Target:** `resources/js/Components/Ai/BkuAuditModal.tsx`  
**Tujuan:** Merombak **Modal Pra-Audit Forensik AI** agar selaras dengan sistem desain **Neo-Bento** SIKAS, memperbaiki bug kontras mode gelap (`bg-emerald-50` + teks terang, kelas invalid `gray-850`/`gray-750`/`sky-*`), memakai shell `<Modal>` terstandar, dan meningkatkan keterbacaan hasil audit serta daftar temuan.

---

## 1. Kompatibilitas & Shell Komponen

- **Interface Props Tidak Berubah**: Mempertahankan seluruh props existing (`isOpen`, `onClose`, `tahun`, `bulan`, `tabType`, `tabTitle`, `initialPeriodeType`, `initialPeriodeKey`, `hasApiKey`, `initialAuditData`, `onAuditCompleted`) agar seluruh pemanggil (seperti `Rekapitulasi.tsx`) tetap kompatibel 100%.
- **Shell `<Modal>` SIKAS**:
  - Mengganti backdrop manual `fixed inset-0` dengan `<Modal show={isOpen} onClose={onClose} maxWidth="4xl">`.
  - Panel utama: `relative flex max-h-[88vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]`.
  - Dekorasi glow terisolasi di dalam `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]` (`bg-pastel-lavender/65` dan `bg-pastel-mint/45`, versi transparan di dark mode).
  - Menjaga seluruh hook (`useState`, `useEffect`) sebelum render tanpa early `return null`, sehingga animasi buka/tutup `HeadlessUI Dialog` berjalan mulus dan tombol `Escape` berfungsi otomatis.

---

## 2. Tata Letak & Komponen Neo-Bento

### 2.1 Header Neo-Bento (`shrink-0`)
- Sisi kiri: `IconTile` `tone="violet"` `size="md"` dengan ikon `Brain`.
- Baris judul: **"Pra-Audit Forensik AI"** + `StatusBadge` `tone="violet"` bertuliskan `DEEPSEEK-R1`.
- Subjudul: Ikon `BookOpen` + `{tabTitle}`.
- Sisi kanan: Tombol tutup `X` bersih (`h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10`).

### 2.2 Bar Cakupan Audit (`shrink-0`)
- Bar pemilih periode berada tepat di bawah header (`border-b border-slate-100 bg-slate-50/90 px-6 py-3 dark:border-white/10 dark:bg-white/[0.03]`).
- Label `Cakupan Audit` dengan ikon `Layers`.
- Segmented pill switcher: `Bulanan`, `Tahap 1`, `Tahap 2`, `Tahunan (1 Tahun)`.
  - Tab aktif: `bg-white text-brand-700 shadow-sm dark:bg-brand-500/20 dark:text-brand-200`.
  - Tab tidak aktif: `text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white`.
- Dropdown pilih bulan (tampil saat `periodeType === 'bulanan'`): `<select>` bersih `rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-[#1E1B2E] dark:text-white`.

### 2.3 Body Scrollable (`sikas-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5`)
1. **Banner Peringatan API Key & Error**:
   - Non-API key: kartu `rounded-[20px] border border-amber-200/80 bg-pastel-amber/75 dark:border-amber-500/25 dark:bg-amber-500/[0.08]`.
   - Error message: kartu `rounded-[20px] border border-rose-200/80 bg-pastel-rose/75 dark:border-rose-500/25 dark:bg-rose-500/[0.08]`.
2. **State Loading, Fetching & Empty**:
   - *Loading*: Spinner ring Neo-Bento + `Sparkles` + teks langkah aktif + progress bar gradien `from-brand-500 to-lime-400`.
   - *Fetching Status*: Indikator ringkas di tengah dengan `RotateCw`.
   - *Empty State (Belum Ada Audit)*: Kartu lembut `rounded-[24px]` dengan `IconTile` `violet` `lg` (`ShieldCheck`), judul & deskripsi `{periodeLabel}`, dan tombol CTA `<PrimaryButton>` (**Mulai Pra-Audit Forensik Sekarang**).
3. **Hasil Audit — Bento Grid 2-Bagian (`grid-cols-1 lg:grid-cols-12 gap-4`)**:
   - **Kartu Skor Kepatuhan (`lg:col-span-4`)**:
     - SVG radial progress gauge (`0–100`, `strokeDashoffset` proporsional terhadap skor) dengan warna adaptif (`>= 85`: mint/emerald, `>= 60`: amber, `< 60`: rose).
     - Angka skor besar (`text-sikas-num font-black`) di tengah gauge, label `"Skor Kepatuhan"`, dan `StatusBadge` predikat (`tone="success" | "warning" | "danger"`).
     - Stat pill mini **Bahaya** (`dangerCount`) dan **Peringatan** (`warningCount`) bila jumlahnya > 0 (atau badge `"Nihil Temuan"` bila keduanya `0`).
   - **Kartu Ringkasan Eksekutif (`lg:col-span-8`)**:
     - Header kartu: ikon `Sparkles` + **"Ringkasan Eksekutif Auditor"** + chip tanggal/periode bila relevan.
     - Isi ringkasan dengan warna teks kontras penuh di kedua mode (`text-slate-700 dark:text-slate-200`), `leading-relaxed`.
     - Jika `rules_checked` tersedia dan tidak kosong: daftar pill ringkas aturan yang diperiksa di bagian bawah kartu.
4. **Filter Kategori & Accordion Temuan**:
   - Pill filter kategori (`Semua (N)` + kategori dinamis), aktif menggunakan `bg-slate-900 text-white dark:bg-white dark:text-slate-900`.
   - Kondisi `filteredFindings.length === 0`: kartu success `bg-pastel-mint/55 dark:bg-mint/[0.08]` dengan `IconTile` `mint` (`CheckCircle2`).
   - Setiap kartu temuan (`rounded-[20px] border bg-white dark:bg-white/[0.03]`):
     - Header dapat diklik (`hover:bg-slate-50/80 dark:hover:bg-white/[0.04]` — menggantikan `dark:hover:bg-gray-750` yang tidak valid).
     - `StatusBadge` tingkat keparahan (`BAHAYA` -> `danger`, `PERINGATAN` -> `warning`, `INFO` -> `info`).
     - Meta pill kategori, nominal (`Rp ...` dalam `text-sikas-num`), dan rujukan transaksi (`bg-pastel-lavender/60 dark:bg-brand-500/15`).
     - Konten expand: Rujukan transaksi/kegiatan lengkap, Uraian Fakta Kasus, dan Saran Rekomendasi Tindak Lanjut.

### 2.4 Footer Aksi (`shrink-0`)
- Border atas `border-t border-slate-100 px-6 py-4 dark:border-white/10`.
- Kiri: `<SecondaryButton>` **Audit Ulang (Paksa Cek Baru)** saat `auditData && !loading`.
- Kanan:
  - Tombol **Unduh Lembar Kerja Audit (PDF)** (`bg-pastel-lavender/80 text-brand-700 border-brand-200 hover:bg-pastel-lavender dark:bg-brand-500/15 dark:text-brand-200 dark:border-brand-500/30`).
  - `<SecondaryButton>` **Tutup**.

---

## 3. Keamanan Token Tailwind & Verifikasi

- Seluruh kelas warna/utilitas hanya menggunakan token valid `tailwind.config.js`:
  - Tidak ada `bg-gray-850`, `hover:bg-gray-750`, `bg-sky-100`, `border-sky-200`, `text-sky-800`, atau `brand-50`/`brand-100`.
  - Menggunakan `bg-pastel-sky`, `text-blue-700`, `dark:bg-sky/10`, `dark:text-blue-300`, `bg-pastel-mint`, `bg-pastel-amber`, `bg-pastel-rose`, `bg-pastel-lavender`.
- Verifikasi dijalankan dengan `npm run build` (`tsc && vite build`).

