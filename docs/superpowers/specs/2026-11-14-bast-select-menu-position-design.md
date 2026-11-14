# Desain Perbaikan Posisi Dropdown Select Modal BAST

**Tanggal:** 2026-11-14  
**Target:** `resources/js/Pages/FiturPelengkap/Bast/ModalFormBast.tsx`  
**Verifikasi:** `resources/js/Pages/FiturPelengkap/Bast/ModalPrintSettings.tsx`

---

## 1. Masalah

Pada modal **Tambah BAST Baru** (`ModalFormBast.tsx`), saat dropdown `Tahun Anggaran` atau `Tahap` dibuka, daftar opsi bergeser ke kanan/bawah dari kontrol inputnya (`media_1794653889443_8453947b.jpg`).

**Penyebab:** `<DialogPanel>` pada `Modal.tsx` memakai CSS `transform`, yang dalam spesifikasi CSS menjadi containing block baru untuk elemen `position: fixed`. Karena `<Select>` di `ModalFormBast.tsx` menggunakan `menuPosition="fixed"`, koordinat viewport yang dihitung `react-select` menjadi tergeser oleh posisi modal.

---

## 2. Solusi

- Menghapus `menuPosition="fixed"` dari kedua `<Select>` (`bast-tahun` dan `bast-tahap`) di `ModalFormBast.tsx` agar kembali ke posisi `absolute` relatif terhadap kontainer `relative` milik kontrolnya masing-masing.
- Menggunakan `menuPlacement="bottom"` karena kedua field tersebut terletak di baris teratas body modal (`max-h-[64vh] overflow-y-auto`), sehingga dropdown selalu terbuka tepat di bawah input tanpa bergeser atau terpotong.
- Memastikan `ModalPrintSettings.tsx` tetap menggunakan posisi lokal (tanpa `menuPosition="fixed"`) agar dropdown `Ukuran Kertas` dan `Ukuran Font` juga tetap menempel di bawah input.

---

## 3. Verifikasi

- Jalankan `npm run build` (`tsc && vite build`) dengan hasil exit code 0.
