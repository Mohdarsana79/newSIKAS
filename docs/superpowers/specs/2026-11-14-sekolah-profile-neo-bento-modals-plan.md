# Rencana Implementasi: Redesign 4 Modal Profil Sekolah ke Gaya Neo-Bento

Acuan Desain: [2026-11-14-sekolah-profile-neo-bento-modals-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-14-sekolah-profile-neo-bento-modals-design.md)

## Tugas 1 — Buat Komponen `SekolahModals.tsx`
- **File Baru**: `resources/js/Pages/DataMaster/SekolahProfile/Partials/SekolahModals.tsx`
- **Komponen Internal & Helper**:
  1. `SekolahModalHeader`: Header Neo-Bento reusable (glow terisolasi, `IconTile`, judul, `StatusBadge`, subtitle, tombol tutup `X`).
  2. `buildSelectClassNames(hasError)`: Helper styling `react-select` Neo-Bento (identik dengan `StsModals.tsx`, mendukung error state & dark mode `#1A1728`, `menuPosition="fixed"`).
  3. **Modal 1 — `Update/Input Data Sekolah` (`maxWidth="2xl"`)**:
     - Shell `relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]` dengan body `sikas-scroll max-h-[72vh] overflow-y-auto`.
     - Grup Bento 1 (*Identitas Satuan Pendidikan*): `Nama Sekolah`, `NPSN` + `StatusBadge tone="success"` *"Lisensi Terverifikasi"*, `Status Sekolah` (`Negeri`/`Swasta`) & `Jenjang` (`SD`/`SMP`/`SMA`/`SMK`) via `react-select`.
     - Grup Bento 2 (*Lokasi & Alamat Sekolah*): `Provinsi`, `Kabupaten/Kota`, `Kecamatan`, `Kelurahan/Desa`, dan `Alamat Lengkap` (`rounded-2xl`).
  4. **Modal 2 — `Upload Kop Surat` (`maxWidth="md"`)**:
     - Shell `rounded-[26px]`, kartu spesifikasi (`JPG/PNG`, `Maks. 2MB`, `2480 × 588 px`), dropzone file interaktif dengan live preview (`URL.createObjectURL` + cleanup `useEffect`), tampilan nama/ukuran file, dan `InputError`.
  5. **Modal 3 — `Hapus Kop Surat` (`maxWidth="sm"`)**:
     - Shell `rounded-[26px]`, `IconTile tone="rose"`, kartu peringatan `pastel-rose`, tombol `Batal` & `DangerButton`.
  6. **Modal 4 — `Pratinjau Kop Surat` (`maxWidth="2xl"`)**:
     - Shell `rounded-[26px]`, header Neo-Bento ber-`StatusBadge tone="success"`, panggung pratinjau `rounded-[20px]` untuk gambar kop surat aktif.

## Tugas 2 — Integrasikan ke `SekolahProfile/Index.tsx`
- **File**: `resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`
- **Langkah**:
  1. Import `SekolahModals` dari `./Partials/SekolahModals`.
  2. Hapus import & markup ke-4 modal inline lama (termasuk `Modal`, `InputLabel`, `TextInput`, `InputError`, `DangerButton` jika tidak terpakai lagi di `Index.tsx`).
  3. Ambil juga `errors: kopErrors` dan `reset: resetKop` dari `useForm` kop surat untuk diteruskan ke `SekolahModals` (reset file pilihan saat upload sukses/ditutup).
  4. Render `<SekolahModals ... />` di bagian akhir `<AuthenticatedLayout>`.

## Tugas 3 — Verifikasi & Commit
1. Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error TypeScript maupun Vite.
2. Commit hasil implementasi ke git.

