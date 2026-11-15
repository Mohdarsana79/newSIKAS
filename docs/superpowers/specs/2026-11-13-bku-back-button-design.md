# Desain Tombol Kembali ke Penatausahaan di Halaman BKU

**Tanggal:** 2026-11-13  
**File Target:** `resources/js/Pages/Penatausahaan/Bku.tsx`  
**Tujuan:** Menambahkan tombol navigasi kembali ke halaman indeks Penatausahaan (`vroute('penatausahaan.index')`) di sebelah kiri judul halaman BKU dengan gaya Neo-Bento yang ringkas dan aksesibel.

---

## 1. Desain Komponen & Penempatan

- **Lokasi**: Prop `icon` pada `<PageHeader>` di [Bku.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Bku.tsx#L2362-L2368).
- **Komponen Navigasi**: Menggunakan Inertia `<Link href={vroute('penatausahaan.index')}>` agar perpindahan halaman berjalan sebagai SPA navigation dan otomatis mengikuti variant aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
- **Tampilan Neo-Bento**:
  - Ukuran `h-10 w-10` berbentuk kotak-membulat `rounded-2xl` agar sejajar secara visual dengan tinggi judul `BKU {bulan} {tahun}`.
  - Border & latar terang: `border border-slate-200/90 bg-white text-slate-600 shadow-sm`, efek hover `hover:-translate-y-0.5 hover:border-brand-300 hover:bg-pastel-lavender/50 hover:text-brand-700`.
  - Mode gelap: `dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/15 dark:hover:text-brand-300`.
  - Ikon: `<ArrowLeft className="h-4 w-4" />` dari `lucide-react`.
  - Aksesibilitas & Tooltip: `title="Kembali ke Penatausahaan"` dan `aria-label="Kembali ke Penatausahaan"`.
- **Breadcrumb**: Breadcrumb yang sudah ada (`Dashboard / Penatausahaan / BKU`) tetap dipertahankan.

---

## 2. Verifikasi

- Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan TypeScript dan bundling Vite berhasil tanpa error.

