# Desain Revamp Modal Tarik Tunai & Setor Tunai BKU (Neo-Bento)

**Tanggal:** 2026-11-13
**Target File:**
- `resources/js/Pages/Penatausahaan/Partials/KasBankTransferModal.tsx` *(baru)*
- `resources/js/Pages/Penatausahaan/Bku.tsx`

## 1. Latar Belakang & Masalah yang Diselesaikan
Modal **Penarikan Tunai** dan **Setor Tunai** pada `resources/js/Pages/Penatausahaan/Bku.tsx` (baris 2993–3123) masih menggunakan tampilan lama yang belum sesuai dengan sistem desain Neo-Bento SIKAS:
1. Header memakai latar gelap lama (`bg-gradient-to-br from-[#2B2940] ...`) tanpa ikon pastel, badge status, dan tombol tutup `X`, sedangkan body memakai `rounded-lg` sehingga sudut bawah atau elemen atas kurang konsisten.
2. Ukuran modal `maxWidth="5xl"` terlalu lebar untuk form 2 input sehingga area modal tampak renggang.
3. Input `DatePicker` diberi class `block` (`mt-1 block w-full ...`), yang menimpa `flex` bawaan `DatePicker` sehingga ikon kalender dan teks `"Pilih tanggal"` menumpuk dua baris.
4. Wrapper modal perlu `overflow-visible` dengan isolasi glow blob agar popover kalender tidak berisiko terpotong oleh kontainer kartu.

## 2. Arsitektur & Desain Komponen

### 2.1 Ekstraksi Komponen Shared `KasBankTransferModal`
Daripada menduplikasi markup modal untuk Tarik Tunai dan Setor Tunai di dalam `Bku.tsx`, dibuat satu komponen reusable `KasBankTransferModal.tsx` di `resources/js/Pages/Penatausahaan/Partials/KasBankTransferModal.tsx` dengan props berbasis varian visual:
- `tone: 'sky' | 'mint'`
  - **Tarik Tunai**: `tone="sky"`, badge `"Bank → Kas Tunai"`, label saldo `"Saldo Non-Tunai Tersedia"`.
  - **Setor Tunai**: `tone="mint"`, badge `"Kas Tunai → Bank"`, label saldo `"Saldo Tunai Tersedia"`.
- Data & callback form (`show`, `onClose`, `onSubmit`, `processing`, `dateValue`, `onDateChange`, `dateError`, `amountValue`, `onAmountChange`, `amountError`, `availableBalance`, `onFillMax`, `startMonth`, `endMonth`, `disabledDates`, `formatCurrency`) tetap dikelola sepenuhnya oleh `Bku.tsx`.

### 2.2 Struktur Visual Neo-Bento (`maxWidth="2xl"`)
1. **Wrapper & Layering**:
   - `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]`
   - Glow blob dekoratif (`bg-sky/10` atau `bg-mint/10`) diisolasi dalam `<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">`.
2. **Header Modal Terang (`px-6 py-5`)**:
   - `relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/5`
   - `IconTile` (`size="lg"`, tone `'sky'` / `'mint'`) + judul `text-[15px] font-extrabold` + `StatusBadge` (`dot={false}`) + subjudul `text-[11px]`.
   - Tombol tutup `X` di kanan atas.
3. **Panel 1 — Kartu Bento Info Saldo & Tombol Cepat "Isi Maksimal"**:
   - Kartu beraksen pastel (`bg-pastel-sky/60 border-sky/20` untuk Tarik Tunai, `bg-pastel-mint/60 border-mint/20` untuk Setor Tunai).
   - Menampilkan label saldo tersedia dan nilai nominal dengan `text-sikas-num text-[16px] font-extrabold`.
   - Tombol sekunder ringkas **"Isi Maksimal"** di sisi kanan kartu (nonaktif bila `availableBalance <= 0`) untuk mengisi input nominal penuh dengan satu klik.
4. **Panel 2 — Kartu Bento Form Transaksi**:
   - Container `rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]`.
   - Grid `grid-cols-1 gap-4 sm:grid-cols-2`:
     - **Tanggal**: `InputLabel` + `DatePicker` tanpa class `block` agar ikon dan teks sejajar horizontal satu baris.
     - **Nominal**: `InputLabel` + input dengan prefix `Rp`, `text-sikas-num text-[13px] font-bold`, serta teks bantu `Maksimal: {formatCurrency(availableBalance)}`.
5. **Footer Aksi**:
   - `border-t border-slate-100 pt-4 dark:border-white/5` dengan `SecondaryButton` (`Tutup`) dan `PrimaryButton` (`Simpan` / `Menyimpan...`).

## 3. Batasan (*Scope*)
- Tidak mengubah endpoint API, logika validasi, maupun transformasi payload `submitTarikTunai` dan `submitSetorTunai` pada `Bku.tsx`.
- Perubahan terfokus pada modal Tarik Tunai dan Setor Tunai.

## 4. Verifikasi
- Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan tipe TypeScript dan kompilasi CSS Tailwind berjalan tanpa error.

