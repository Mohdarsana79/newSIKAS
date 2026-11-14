# Desain Penggantian Input Tanggal Surat Pesanan dengan DatePicker

**Tanggal:** 2026-11-14
**Status:** Disetujui untuk peninjauan spec
**Ruang Lingkup:** `resources/js/Pages/FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx`

---

## 1. Latar Belakang & Tujuan

Field **Tanggal Surat Pesanan** pada `ModalFormSuratPesanan.tsx` saat ini masih memakai `<TextInput type="date" />` bawaan browser. Hal ini tidak konsisten dengan fitur pelengkap lain (seperti `Kwitansi` dan `BAST`) yang sudah menggunakan komponen kalender `@/Components/DatePicker`.

Tujuan perubahan ini adalah mengganti input `type="date"` tersebut menjadi `<DatePicker />` agar tampilan, format tampilan tanggal Indonesia (`dd MMMM yyyy`), dan pengalaman pemilihan tanggal seragam dengan `ModalFormBast.tsx`, tanpa mengubah field atau tab lain di `ModalFormSuratPesanan.tsx`.

---

## 2. Desain Komponen & UI

### File yang Diubah
- `resources/js/Pages/FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx`

### Perubahan UI
1. **Import baru:**
   - `import { format } from 'date-fns';`
   - `import DatePicker from '@/Components/DatePicker';`
2. **Bagian Identitas Surat Pesanan (tab `umum`):**
   - Ganti `<InputLabel>Tanggal Surat Pesanan</InputLabel>` menjadi `<InputLabel htmlFor="sp-tanggal">Tanggal Surat Pesanan</InputLabel>`.
   - Ganti `<TextInput type="date" ... />` dengan `<DatePicker />`:
     - `id="sp-tanggal"`
     - `value={data.tanggal_sp}`
     - `onChange={(date) => setData((prev) => ({ ...prev, tanggal_sp: date ? format(date, 'yyyy-MM-dd') : '' }))}`
     - `placeholder="Pilih tanggal surat pesanan"`
3. **Rentang Tanggal & Overlay:**
   - Tidak ada `minDate` maupun `maxDate` — pengguna bebas memilih tanggal kapan saja (konsisten dengan `ModalFormBast.tsx`).
   - `DatePicker` merender `PopoverPanel` dengan prop `portal` + Floating UI `anchor` di `z-[9999]`, sehingga popup kalender tidak terpotong oleh `overflow-hidden` milik modal dan tetap sejajar terhadap tombol pemicu.

---

## 3. Alur Data & Normalisasi Tanggal

1. **Mode Tambah (`handleBkuChange`):**
   - Ketika transaksi BKU dipilih, `tanggal_sp` otomatis terisi `selected.tanggal` (yang sudah dikirim `SuratPesananController` dalam format `Y-m-d`).
   - Pengguna dapat mengubahnya kapan saja melalui `<DatePicker />`; nilai disimpan kembali ke state `data.tanggal_sp` dalam format `yyyy-MM-dd` via `format(date, 'yyyy-MM-dd')`.
2. **Mode Edit (`editData`):**
   - `SuratPesananController` menyediakan `tanggal_sp_raw` (`Y-m-d`) dan `tanggal` (`d/m/Y`).
   - Tambahkan helper kecil lokal `normalizeInitialDate(editData)` pada `ModalFormSuratPesanan.tsx`:
     - Utamakan `editData.tanggal_sp_raw` bila tersedia.
     - Jika hanya ada `editData.tanggal` berformat `dd/mm/yyyy`, konversi menjadi `yyyy-MM-dd`.
     - Jika kosong atau tidak valid, kembalikan `''`.
   - Ini mencegah `Invalid Date` di `DatePicker` apabila `tanggal_sp_raw` tidak ada.
3. **Pengiriman Form (`handleSubmit`):**
   - Payload `POST` (`surat-pesanan.store`) dan `PUT` (`surat-pesanan.update`) tetap mengirim `tanggal_sp` sebagai string `yyyy-MM-dd` atau `''` (sesuai aturan validasi Laravel `'tanggal_sp' => 'nullable|date'`).

---

## 4. Rencana Verifikasi

1. Jalankan `npm run build` (`tsc && vite build`) setelah implementasi untuk memastikan tidak ada error TypeScript maupun bundling Vite.
2. Pastikan tidak ada `<TextInput type="date"` tersisa di `ModalFormSuratPesanan.tsx`.
