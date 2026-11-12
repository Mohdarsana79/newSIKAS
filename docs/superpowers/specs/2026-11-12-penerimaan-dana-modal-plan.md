# Implementation Plan: Revamp Modal Penerimaan Dana & Perbaikan Kalender Terpotong SIKAS Neo-Bento

**Tanggal Rencana:** 12 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-12-penerimaan-dana-modal-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-12-penerimaan-dana-modal-design.md)  
**Tujuan:** Memperbaiki clipping kalender DatePicker agar tidak terpotong oleh batas modal, dan memodernisasi tata letak modal penerimaan dana ke format Bento terkelompok.

---

## 1. Rincian File & Tahapan Eksekusi

### Tahap 1: Perbaikan Clipping Kontainer Modal (`Penatausahaan/Index.tsx`)
**File:** `resources/js/Pages/Penatausahaan/Index.tsx`
- Ubah pembungkus modal dari `overflow-hidden` menjadi `overflow-visible`.
- Bungkus elemen dekoratif blur blob ke dalam kontainer tersendiri berkelas `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]` agar efek visual tetap rapi tanpa memotong komponen melayang.

### Tahap 2: Restrukturisasi Form & Riwayat Penerimaan ke Gaya Neo-Bento
**File:** `resources/js/Pages/Penatausahaan/Index.tsx`
1. **Header Modal**:
   - IconTile, badge status ("Buku Kas Umum"), judul tajam, subtitle, dan tombol tutup modern.
2. **Kelompok Panel Form**:
   - **Panel 1: Sumber & Waktu**: Grid 2 kolom rapi untuk Sumber Dana dan Tanggal Terima.
   - **Panel 2: Nilai Nominal**: Input Jumlah Dana dengan tipografi angka yang tegas dan catatan instruksi.
   - **Panel 3: Saldo Awal (Khusus Tahap 1)**: Panel beraksen lembut untuk Tanggal Saldo Awal dan Jumlah Saldo Awal.
3. **Penyempurnaan History View**:
   - Kartu-kartu riwayat bento dengan status badge dan format rupiah yang konsisten.
4. **Footer Aksi**:
   - Tombol "Kembali" / "Tutup" dan "Simpan" dengan indikator loading (`processing ? 'Menyimpan...' : 'Simpan'`).

### Tahap 3: Verifikasi Build & Tampilan
- Jalankan `npm run build` (`tsc && vite build`).
- Pastikan tidak ada error kompilasi dan kalender tidak lagi terpotong.

