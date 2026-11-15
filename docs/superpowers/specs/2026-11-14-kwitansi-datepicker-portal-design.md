# Desain Perbaikan Popover DatePicker Tertutup Card (Kwitansi & Global)

**Tanggal:** 2026-11-14  
**Komponen inti:**
- `resources/js/Components/DatePicker.tsx`
- `resources/js/Components/ui/Surface.tsx`  
**Halaman terkait (Kwitansi):**
- `resources/js/Pages/FiturPelengkap/Kwitansi/TabReguler.tsx`
- `resources/js/Pages/FiturPelengkap/Kwitansi/TabKinerja.tsx`
- `resources/js/Pages/FiturPelengkap/Kwitansi/TabSilpa.tsx`
- `resources/js/Pages/FiturPelengkap/Kwitansi/TabKinerjaSilpa.tsx`

---

## 1. Latar Belakang & Akar Masalah

Saat pengguna menekan input tanggal **Mulai** atau **Akhir** di kartu filter fitur Kwitansi, popup kalender terpotong pada tepi bawah kartu filter sehingga hanya terlihat bagian teratasnya.

Terdapat dua penyebab teknis di kode saat ini:
1. **`Surface.tsx` (`L45`) memaksa `overflow-hidden`**: `<section className={cn('sikas-card relative flex flex-col overflow-hidden', ...)}>` memotong seluruh elemen floating di dalam kartu filter Kwitansi.
2. **`DatePicker.tsx` (`L59`) merender `<PopoverPanel>` secara inline**: `<PopoverPanel className="absolute z-50 mt-1 ...">` tidak menggunakan `portal` maupun `anchor`, sehingga:
   - Terpotong oleh container induk yang memiliki `overflow-hidden` (seperti `<Surface>` atau modal).
   - Terjebak dalam stacking context container pembungkus (`animate-rise`) terhadap kartu tabel di bawahnya.

---

## 2. Solusi Desain

### 2.1 Portal + Floating UI Anchor pada `DatePicker.tsx`
Memanfaatkan dukungan bawaan `@headlessui/react` (`^2.0.0`) pada `<PopoverPanel>`:
- Mengubah `<PopoverPanel>` di `resources/js/Components/DatePicker.tsx` menjadi:
  ```tsx
  <PopoverPanel
      portal
      anchor={{ to: 'bottom start', gap: 6, padding: 12 }}
      className="z-[9999] w-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#15131F]"
  >
  ```
- **Manfaat teknis**:
  - Prop `anchor` otomatis memakai Floating UI (`position: fixed`, auto-flip bila mendekati tepi bawah viewport) dengan jarak `gap: 6` dan ruang aman layar `padding: 12`.
  - Prop `portal` merender kalender keluar dari `<Surface>` dan keluar dari stacking context `animate-rise`.
  - Kelas `z-[9999]` memastikan kalender tampil di atas seluruh kartu halaman maupun `<Modal>` (`z-50`).
  - Tetap kompatibel 100% di dalam `<Modal>` (`Dialog` Headless UI), karena `Dialog` membungkus child-nya dengan `<PortalGroup target={T}>` dan `useNestedPortals()`, sehingga popover portal yang dibuka dari dalam modal tetap interaktif (tidak terkena `inert` atau dianggap klik luar modal).
  - Border light mode diperjelas dari `border-white` menjadi `border-slate-200/90` agar popup kalender tetap kontras saat berada di atas kartu putih.

### 2.2 Opsi `overflowVisible` pada `Surface.tsx`
- Menambahkan prop opsional `overflowVisible?: boolean` (default `false`) di `resources/js/Components/ui/Surface.tsx`.
- Bila `overflowVisible` bernilai `true`, `<section>` memakai `overflow-visible` alih-alih `overflow-hidden`. Perilaku default semua `<Surface>` lain di aplikasi tetap `overflow-hidden` agar tidak mengubah layout kartu yang sudah ada.

### 2.3 Pembaruan Kartu Filter pada 4 Tab Kwitansi
- Pada `TabReguler.tsx`, `TabKinerja.tsx`, `TabSilpa.tsx`, dan `TabKinerjaSilpa.tsx`, kartu filter `<Surface padding="sm">` diberi prop `overflowVisible` (serta pembungkus animasinya menjaga `relative z-20`) agar kontrol `DatePicker` dan focus ring-nya tidak terpotong pada seluruh varian BOSP Kwitansi (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).

---

## 3. Cakupan & Keamanan

- Tidak mengubah payload filter (`start_date`, `end_date`), format tanggal `yyyy-MM-dd`, maupun route Inertia mana pun.
- Menjaga backward compatibility seluruh pemakai `<DatePicker />` di halaman lain (`Tanda Terima`, `Penatausahaan`, `Penganggaran`, dan modal transaksi BKU/STS).

---

## 4. Verifikasi

- Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan kompilasi TypeScript strict dan production bundle Vite berjalan tanpa error.
- Memverifikasi penggunaan kelas Tailwind tetap valid sesuai konfigurasi tema project.

