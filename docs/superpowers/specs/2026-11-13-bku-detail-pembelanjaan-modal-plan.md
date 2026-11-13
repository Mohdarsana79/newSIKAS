# Rencana Implementasi Neo-Bento Modal Detail Pembelanjaan (BKU)

**Tanggal:** 2026-11-13  
**Spec Referensi:** `docs/superpowers/specs/2026-11-13-bku-detail-pembelanjaan-modal-design.md`

---

## Langkah Implementasi

### Task 1: Buat Komponen `DetailPembelanjaanModal.tsx`
- **File:** `resources/js/Pages/Penatausahaan/Partials/DetailPembelanjaanModal.tsx`
- **Detail:**
  - Definisikan interface TypeScript untuk `BkuDetailUraianItem`, `BkuDetailItem`, dan `DetailPembelanjaanModalProps` (`show`, `onClose`, `item`, `formatCurrency`).
  - Helper lokal:
    - `formatDetailDate(dateValue?: string | null)`: parsing aman dengan `date-fns` (`format(..., 'd MMM yyyy', { locale: id })`) dan fallback `-` bila kosong/tidak valid.
    - `getPenyediaName(item: BkuDetailItem)`: urutan fallback `nama_toko || nama_penyedia || nama_penyedia_barang_jasa || nama_penerima_pembayaran || nama_penerima || '-'`.
    - `getJenisTransaksiLabel(jenis?: string | null)` & tone badge (`success` untuk tunai, `info` untuk non tunai/transfer, `neutral` lainnya).
    - Perhitungan angka aman: `totalKotor = Number(item.total_transaksi_kotor) || 0`, `totalPajak = Number(item.total_pajak) || 0`, `totalPajakDaerah = Number(item.total_pajak_daerah) || 0`, `totalBersih = totalKotor - totalPajak`.
  - Struktur Neo-Bento sesuai spec:
    1. Panel `relative flex max-h-[88vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]` + glow terisolasi.
    2. Header `shrink-0`: `IconTile` (`violet`), judul + badge ID Transaksi & Jenis Transaksi, subjudul tanggal & nota, tombol `X`.
    3. Body `sikas-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5`:
       - KPI Summary Strip 3 kolom (`Total Transaksi Kotor`, `Total Pajak` + status NTPN, `Total Harga Bersih`).
       - Bento Grid Metadata 2×2 (`Informasi Transaksi`, `Penyedia / Penerima`, `Kegiatan`, `Rekening Belanja`).
       - Tabel Rincian Uraian Pembelanjaan (`NO`, `URAIAN`, `VOLUME`, `HARGA SATUAN`, `SUBTOTAL`) + fallback saat `uraian_details` kosong + `tfoot` ringkas total rincian.
    4. Footer `shrink-0`: `<SecondaryButton onClick={onClose}>Tutup</SecondaryButton>`.

### Task 2: Integrasikan ke `Bku.tsx`
- **File:** `resources/js/Pages/Penatausahaan/Bku.tsx`
- **Detail:**
  - Import `DetailPembelanjaanModal` dari `./Partials/DetailPembelanjaanModal`.
  - Ganti markup inline `{/* Modal Detail Pembelanjaan */}` (sekitar L3333–L3450) dengan:
    ```tsx
    <DetailPembelanjaanModal
        show={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedDetailItem}
        formatCurrency={formatCurrency}
    />
    ```

### Task 3: Verifikasi & Commit
- Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error TypeScript maupun Vite build.
- Verifikasi kelas CSS custom/Tailwind terkompilasi ke stylesheet output.
- Commit perubahan implementasi ke branch `main`.
