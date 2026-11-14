# Spec Desain: Tombol Kembali pada Halaman Folder & Modal Kelola Master Template SK & Surat

**Tanggal:** 2026-11-14  
**Topik:** Penambahan tombol kembali di `SkSurat/Show.tsx` dan `SkSurat/Partials/ManageTemplatesModal.tsx`  
**Status:** Disetujui untuk penulisan spec

---

## 1. Latar Belakang & Tujuan

Saat berada di halaman detail folder SK & Surat (`/sk-surat/folder/{id}`) maupun saat membuka modal **Kelola Master Template Word (.docx)**:
1. Pada `Show.tsx`, navigasi kembali ke daftar seluruh folder (`/sk-surat`) saat ini hanya berupa teks breadcrumb kecil di atas judul halaman (`SK & Surat`), meskipun ikon `ArrowLeft` dan `Link` sebenarnya sudah diimpor di file tersebut.
2. Pada `ManageTemplatesModal.tsx`, modal berukuran tinggi (`max-h-[85vh]`) dengan daftar template yang dapat di-scroll, namun header modal belum memiliki tombol tutup `X`, dan tombol footer hanya bertuliskan `Tutup` sehingga kurang eksplisit mengarahkan pengguna kembali ke tampilan isi folder.

Tujuan perubahan ini adalah menyediakan tombol kembali yang jelas dan mudah diakses baik untuk kembali ke daftar folder (`/sk-surat`) dari `Show.tsx`, maupun menutup modal kembali ke isi folder saat ini dari `ManageTemplatesModal.tsx`.

---

## 2. Ruang Lingkup Perubahan

Perubahan hanya menyentuh dua berkas frontend tanpa perubahan backend maupun skema database:
- `resources/js/Pages/SkSurat/Show.tsx`
- `resources/js/Pages/SkSurat/Partials/ManageTemplatesModal.tsx`

Komponen bersama `resources/js/Components/ui/PageHeader.tsx` tidak diubah agar tidak menambah kompleksitas API halaman lain.

---

## 3. Rincian Desain

### 3.1 `resources/js/Pages/SkSurat/Show.tsx`

- Memanfaatkan `Link` (`@inertiajs/react`) dan `ArrowLeft` (`lucide-react`) yang sudah diimpor di file ini.
- Pada `PageHeader` prop `actions`, tambahkan elemen pertama (sebelum tombol `Kelola Master Template` dan **di luar** blok `{!isKepalaSekolah && ...}` agar tersedia untuk role `bendahara` maupun `kepala_sekolah`):
  ```tsx
  <Link
      href={route('sk-surat.index')}
      className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-extrabold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
  >
      <ArrowLeft className="h-4 w-4" />
      Kembali
  </Link>
  ```
- Klik tombol menavigasikan pengguna ke daftar folder SK & Surat (`route('sk-surat.index')`).

### 3.2 `resources/js/Pages/SkSurat/Partials/ManageTemplatesModal.tsx`

- Tambahkan import `ArrowLeft` dan `X` dari `lucide-react`.
- **Header modal**:
  - Ubah wrapper header menjadi `flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5`.
  - Bungkus `IconTile` + judul/subjudul dalam container `flex min-w-0 items-center gap-3`.
  - Tambahkan tombol ikon tutup di sisi kanan atas header:
    ```tsx
    <button
        type="button"
        onClick={onClose}
        aria-label="Tutup modal"
        title="Kembali ke Folder"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
    >
        <X className="h-4 w-4" />
    </button>
    ```
- **Footer modal**:
  - Perbarui `SecondaryButton` di footer menjadi `type="button"`, `onClick={onClose}`, `disabled={loading}`, dengan konten `<ArrowLeft className="h-4 w-4" />` dan teks **`Kembali ke Folder`**.
  - Kontrak props `ManageTemplatesModal` (`show`, `onClose`, `folderId`, `templates`, `isKepalaSekolah`) tidak berubah.

---

## 4. Rencana Verifikasi

1. Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error TypeScript (termasuk kepastian tidak ada import tidak terpakai seperti `ArrowLeft` / `X`) dan bundle production terbangun sukses.
2. Jalankan `php artisan test --filter=SkSuratTest` untuk memastikan rute serta render halaman `SkSurat/Show` tetap berfungsi normal.
