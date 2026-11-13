# Rencana Implementasi Revamp Modal Tarik Tunai & Setor Tunai BKU

**Tanggal:** 2026-11-13
**Spec:** `docs/superpowers/specs/2026-11-13-bku-tarik-setor-modal-design.md`

## Langkah-langkah Implementasi

### Tahap 1: Buat Komponen `KasBankTransferModal.tsx`
Buat file `resources/js/Pages/Penatausahaan/Partials/KasBankTransferModal.tsx` dengan struktur:
1. Mapping style `TONE_STYLES` untuk varian `'sky'` dan `'mint'` (glow header, bento info card, tombol "Isi Maksimal", dan badge langkah).
2. `Modal` dengan `maxWidth="2xl"`, wrapper `relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]`, dan container glow blob terpisah `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]`.
3. Header terang Neo-Bento (`px-6 py-5`, `IconTile`, judul, `StatusBadge`, subjudul, dan tombol tutup `X`).
4. Panel 1 (Kartu Bento Info Saldo + tombol cepat **"Isi Maksimal"**).
5. Panel 2 (Kartu Bento Form dengan `DatePicker` tanpa class `block` agar tidak menumpuk 2 baris, serta input nominal berprefix `Rp` dan `!pl-10`).
6. Footer dengan `SecondaryButton` ("Tutup") dan `PrimaryButton` ("Simpan" / "Menyimpan...").

### Tahap 2: Integrasikan ke `Bku.tsx`
Pada `resources/js/Pages/Penatausahaan/Bku.tsx`:
1. Impor `KasBankTransferModal` serta ikon `ArrowDownToLine` dan `ArrowUpFromLine` dari `lucide-react`.
2. Tambahkan helper kecil `formatNominalInput` agar pemformatan di `handleCurrencyChange` dan tombol "Isi Maksimal" tidak terduplikasi.
3. Ganti blok JSX Modal Tarik Tunai dan Modal Setor Tunai (baris 2992–3123) dengan dua pemanggilan `KasBankTransferModal` (`tone="sky"` untuk Penarikan Tunai, `tone="mint"` untuk Setor Tunai).

### Tahap 3: Verifikasi Build
1. Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error tipe TypeScript maupun build Vite.
2. Commit semua perubahan.
