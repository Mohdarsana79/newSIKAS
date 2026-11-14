# Rencana Implementasi Penggantian DatePicker Surat Pesanan

> **For agentic workers:** Gunakan rencana langkah demi langkah ini untuk menerapkan perubahan di `ModalFormSuratPesanan.tsx` dan memverifikasi hasilnya melalui build TypeScript + Vite.

**Tujuan:** Mengganti input `<TextInput type="date" />` pada `Tanggal Surat Pesanan` menjadi komponen kalender `@/Components/DatePicker` dengan normalisasi tanggal `editData` yang aman.

**Arsitektur:** Perubahan terisolasi pada `resources/js/Pages/FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx`, memanfaatkan `@/Components/DatePicker` (portal + Floating UI `anchor`) dan `format` dari `date-fns` untuk konversi `Date` ↔ `yyyy-MM-dd`.

**Tech Stack:** React 18, TypeScript (strict), Headless UI Popover, `date-fns`, Tailwind 3, Vite 7.

---

### Task 1: Tambah helper normalisasi tanggal edit & import `DatePicker`

**File:**
- Modify: `resources/js/Pages/FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx:1-75`

- [ ] **Step 1: Tambahkan import `format` dan `DatePicker`**
  Di bagian atas `ModalFormSuratPesanan.tsx`, tambahkan:
  ```tsx
  import { format } from 'date-fns';
  import DatePicker from '@/Components/DatePicker';
  ```

- [ ] **Step 2: Tambahkan helper `normalizeInitialDate`**
  Tambahkan fungsi kecil di atas `ModalFormSuratPesanan`:
  ```tsx
  function normalizeInitialDate(editData: { tanggal_sp_raw?: string; tanggal?: string } | null): string {
      if (!editData) return '';
      if (editData.tanggal_sp_raw) {
          return editData.tanggal_sp_raw.split(/[ T]/)[0];
      }
      if (editData.tanggal && /^\d{2}\/\d{2}\/\d{4}$/.test(editData.tanggal)) {
          const [d, m, y] = editData.tanggal.split('/');
          return `${y}-${m}-${d}`;
      }
      return editData.tanggal || '';
  }
  ```

- [ ] **Step 3: Gunakan `normalizeInitialDate(editData)` pada `useEffect` inisialisasi `editData`**
  Ganti `tanggal_sp: editData.tanggal_sp_raw || editData.tanggal || ''` menjadi:
  ```tsx
  tanggal_sp: normalizeInitialDate(editData),
  ```

### Task 2: Ganti `<TextInput type="date" />` menjadi `<DatePicker />`

**File:**
- Modify: `resources/js/Pages/FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx:325-333`

- [ ] **Step 1: Ubah field `Tanggal Surat Pesanan`**
  Ganti blok `<InputLabel>Tanggal Surat Pesanan</InputLabel>` + `<TextInput type="date" ... />` menjadi:
  ```tsx
  <div>
      <InputLabel htmlFor="sp-tanggal">Tanggal Surat Pesanan</InputLabel>
      <DatePicker
          id="sp-tanggal"
          value={data.tanggal_sp}
          onChange={(date) =>
              setData((prev) => ({
                  ...prev,
                  tanggal_sp: date ? format(date, 'yyyy-MM-dd') : '',
              }))
          }
          placeholder="Pilih tanggal surat pesanan"
      />
  </div>
  ```

### Task 3: Verifikasi & Commit

- [ ] **Step 1: Jalankan `npm run build`**
  Pastikan `tsc && vite build` lulus dengan exit code `0` tanpa error TypeScript.
- [ ] **Step 2: Commit perubahan rencana & implementasi ke `main`**
