# Desain Neo-Bento Modal Detail Pembelanjaan (BKU)

**Tanggal:** 2026-11-13  
**Komponen Target:** `resources/js/Pages/Penatausahaan/Partials/DetailPembelanjaanModal.tsx` (komponen baru) & `resources/js/Pages/Penatausahaan/Bku.tsx`  
**Tujuan:** Merombak tampilan **Modal Detail Pembelanjaan** di halaman Penatausahaan BKU agar selaras dengan sistem desain **Neo-Bento** SIKAS, responsif terhadap tinggi viewport (`max-h-[88vh]`), informatif, dan nyaman dibaca di mode terang maupun gelap.

---

## 1. Keputusan Arsitektur & Komponen

- **Ekstraksi Partial (`DetailPembelanjaanModal.tsx`)**:
  Memisahkan UI modal detail dari [Bku.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Bku.tsx) ke komponen `resources/js/Pages/Penatausahaan/Partials/DetailPembelanjaanModal.tsx` (sepola dengan `KasBankTransferModal.tsx`).
- **Props Komponen**:
  - `show: boolean`
  - `onClose: () => void`
  - `item: BkuDetailItem | null` (mengakomodasi seluruh field record `BukuKasUmum` termasuk relasi `kode_kegiatan`, `rekening_belanja`, dan `uraian_details`)
  - `formatCurrency: (val: number | string | undefined | null) => string`
- **Aksen Warna & Mode Baca**:
  - Menggunakan aksen **Violet/Brand** yang konsisten dengan modul Pembelanjaan di BKU.
  - Footer bersih hanya berisi tombol **`Tutup`** (`SecondaryButton`) sesuai karakter modal mode baca (read-only).

---

## 2. Tata Letak & Struktur Visual Neo-Bento

### 2.1 Shell Modal & Clamp Tinggi Viewport
- `<Modal show={show} onClose={onClose} maxWidth="4xl">`
- Panel root: `relative flex max-h-[88vh] flex-col overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]`
- Dekorasi glow lembut terisolasi di dalam `pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]` (`bg-pastel-lavender/60` di kanan atas + `bg-pastel-mint/35` di kiri bawah, versi halus di dark mode).
- Struktur 3 bagian fleksibel:
  1. **Header (`shrink-0`)** — tidak ikut ter-scroll.
  2. **Body (`sikas-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5`)** — area konten utama dengan scrollbar halus.
  3. **Footer (`shrink-0`)** — tetap terlihat di bawah modal.

### 2.2 Header Neo-Bento
- Sisi kiri: `IconTile` tone `violet` ukuran `md` dengan ikon `ReceiptText` / `FileText` (`lucide-react`).
- Baris judul: `"Detail Pembelanjaan"` + `StatusBadge` ID Transaksi (`tone="violet"`, teks `font-mono`, tampil jika `id_transaksi` ada) + `StatusBadge` Jenis Transaksi (`Tunai` -> `tone="success"`, `Non Tunai` -> `tone="info"`, tampil jika `jenis_transaksi` ada).
- Subjudul: Tanggal transaksi terformat (lokal `id`, mis. `3 Mar 2027`) + Nomor Nota bila tersedia dan berbeda dari `id_transaksi`.
- Sisi kanan: Tombol tutup `X` berbingkai bulat/halus (`hover:bg-slate-100 dark:hover:bg-white/10`).

### 2.3 KPI Summary Strip (3 Kartu Bento)
Grid 3 kolom (`grid-cols-1 sm:grid-cols-3 gap-3.5`):
1. **Total Transaksi Kotor**:
   - Latar `bg-slate-50/90 border-slate-200/80 dark:bg-white/[0.03] dark:border-white/10`.
   - Menampilkan label uppercase kecil + nominal `total_transaksi_kotor` dalam `text-sikas-num` (`tabular-nums`).
2. **Total Pajak**:
   - Status ringkas menggunakan `StatusBadge`:
     - Jika `totalPajak > 0 && item.ntpn`: `StatusBadge` `tone="success"` bertuliskan `"Lapor · NTPN"` (plus kode NTPN singkat).
     - Jika `totalPajak > 0 && !item.ntpn`: `StatusBadge` `tone="warning"` bertuliskan `"Belum Lapor"`.
     - Jika `totalPajak <= 0`: `StatusBadge` `tone="neutral"` bertuliskan `"Tanpa Pajak"`.
   - Nominal pajak (`total_pajak`) + label jenis pajak bila tersedia (mis. `pajak` / `pajak_daerah`).
3. **Total Harga Bersih**:
   - Kartu highlight bernuansa lembut `border-brand-200/80 bg-pastel-lavender/45 dark:border-brand-500/20 dark:bg-brand-500/[0.08]`.
   - Menampilkan `total_transaksi_kotor - (total_pajak || 0)` sebagai nominal bersih yang dibayarkan.

### 2.4 Bento Grid Metadata (2×2 Kartu)
Grid 2 kolom pada layar `md+` (`grid-cols-1 md:grid-cols-2 gap-4`):
1. **Kartu Informasi Transaksi**:
   - Header kecil dengan ikon `CalendarDays` / `Hash`.
   - Isi: Tanggal Transaksi, ID Transaksi (`font-mono`), Nomor Nota (jika ada, fallback `-`), Jenis Pembayaran (`Tunai` / `Non Tunai` / kapitalisasi aman).
2. **Kartu Penyedia / Penerima**:
   - Header kecil dengan ikon `Store` / `UserCheck`.
   - Isi: Nama Penyedia / Penerima (`nama_toko || nama_penyedia || nama_penyedia_barang_jasa || nama_penerima_pembayaran || nama_penerima || '-'`), NPWP (`font-mono`, fallback `-`), Alamat (`alamat_toko || alamat || '-'`).
3. **Kartu Kegiatan**:
   - Latar lembut `rounded-[20px] border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]`.
   - Badge kode kegiatan (`kode_kegiatan.kode`) + teks uraian kegiatan (`kode_kegiatan.uraian`, fallback `-`).
4. **Kartu Rekening Belanja**:
   - Gaya seimbang dengan Kartu Kegiatan.
   - Badge kode rekening (`rekening_belanja.kode_rekening`) + nama rincian objek (`rekening_belanja.rincian_objek`, fallback `-`).

### 2.5 Tabel Rincian Uraian Pembelanjaan
- Header bagian: judul **"Detail Uraian Pembelanjaan"** + badge jumlah item (`N Item`).
- Pembungkus tabel: `overflow-hidden rounded-[20px] border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.02]`.
- `overflow-x-auto` untuk keamanan di layar sempit.
- Kolom:
  - `NO` (lebar kecil, center)
  - `URAIAN` (kiri)
  - `VOLUME` (center — `detail.volume` + `detail.satuan`, fallback `-`)
  - `HARGA SATUAN` (kanan, `text-sikas-num`)
  - `SUBTOTAL` (kanan, `text-sikas-num font-bold`)
- Fallback bila `uraian_details` kosong: menampilkan 1 baris dari `item.uraian` (atau `item.uraian_opsional`) dengan volume `-`, harga satuan `-`, dan subtotal `item.total_transaksi_kotor` — identik dengan logika existing agar data lama tetap tampil.
- Baris `tfoot` ringkas di dasar tabel menampilkan **Total Rincian** sejajar kolom Subtotal.

### 2.6 Footer
- Border atas halus `border-t border-slate-100 dark:border-white/5`, padding `px-6 py-4`.
- Tombol tunggal di kanan: `<SecondaryButton onClick={onClose}>Tutup</SecondaryButton>`.

---

## 3. Aturan Keamanan Token Tailwind & Edge Cases

- **Token Tailwind v3 yang Valid**:
  - `brand` dimulai dari `brand-200` (tidak menggunakan `brand-50` atau `brand-100`).
  - `sky` di `tailwind.config.js` adalah warna tunggal (`#3B82F6`), sehingga tidak menggunakan `text-sky-600` atau `bg-sky-50`; gunakan `bg-pastel-sky`, `text-blue-600`, `text-blue-700`, atau `text-sky`.
  - Tidak menggunakan spacing non-standar `py-4.5` / `p-4.5` (gunakan `py-4`, `p-4`, `p-5`).
- **Safe Date & Number Handling**:
  - Pemformatan `tanggal_transaksi` dicek validitasnya terlebih dahulu (`new Date(...)` non-Invalid) agar tidak pernah memicu runtime error jika field kosong.
  - Perhitungan numerik `total_transaksi_kotor` dan `total_pajak` dikonversi via `Number(...) || 0` untuk menghindari `NaN`.

---

## 4. Verifikasi

- Menjalankan `npm run build` (`tsc && vite build`) dan memastikan TypeScript strict serta bundling Vite sukses tanpa error.
- Memeriksa bahwa semua token kelas baru pada komponen terkompilasi ke output CSS Vite.
