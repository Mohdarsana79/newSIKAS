# Implementation Plan: Edit Penganggaran Saat Sudah Ada RKAS Perubahan

- **Tanggal**: 24 Oktober 2026
- **Dokumen Desain**: [2026-10-24-edit-penganggaran-with-rkas-perubahan-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-24-edit-penganggaran-with-rkas-perubahan-design.md)
- **Target File**:
  - `resources/js/Pages/Penganggaran/Index.tsx`
  - `app/Http/Controllers/PenganggaranController.php`
- **Status**: Siap Dieksekusi

---

## 1. Rencana Perubahan Detail

### A. Frontend: `resources/js/Pages/Penganggaran/Index.tsx`

1. **State `isYearLocked`:**
   - Tambahkan state:
     ```tsx
     const [isYearLocked, setIsYearLocked] = useState(false);
     ```
2. **Fungsi `handleCreate`:**
   - Reset `setIsYearLocked(false)`.
3. **Fungsi `handleEdit`:**
   - Deteksi flag `has_perubahan` dari item yang bersangkutan:
     ```tsx
     const regularItem = items.find(i => i.id === id && i.status === 'regular');
     setIsYearLocked(Boolean(regularItem?.has_perubahan));
     ```
4. **Fungsi `submit` onSuccess:**
   - Reset `setIsYearLocked(false)`.
5. **Tombol Edit pada List Anggaran (Baris 363):**
   - Mengubah:
     ```tsx
     {item.status === 'regular' && !item.has_perubahan && (
     ```
     menjadi:
     ```tsx
     {item.status === 'regular' && (
     ```
6. **Input `tahun_anggaran` di Form Modal (Baris 514–522):**
   - Tambahkan atribut `disabled={editMode && isYearLocked}` dan kelas styling:
     ```tsx
     disabled={editMode && isYearLocked}
     className={`mt-1 block w-full bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
         editMode && isYearLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700/50 dark:text-gray-400' : ''
     }`}
     ```
   - Tambahkan keterangan di bawah input jika terkunci:
     ```tsx
     {editMode && isYearLocked && (
         <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
             Tahun anggaran tidak dapat diubah karena sudah memiliki RKAS Perubahan.
         </p>
     )}
     ```

---

### B. Backend: `app/Http/Controllers/PenganggaranController.php`

1. **Method `update(Request $request, $id)`:**
   - Cek keberadaan RKAS Perubahan untuk penganggaran yang sedang diedit:
     ```php
     $hasPerubahan = $this->RkasPerubahan
         ? ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)->exists()
         : false;
     ```
   - Tentukan nilai `$tahunAnggaran`:
     ```php
     $tahunAnggaran = $hasPerubahan ? $penganggaran->tahun_anggaran : $request->tahun_anggaran;
     ```
   - Gunakan `$tahunAnggaran` saat update array.

---

## 2. Rencana Verifikasi
1. Jalankan `npx tsc --noEmit` untuk verifikasi statis TypeScript.
2. Jalankan test PHP terkait jika ada (`php artisan test --filter=PenganggaranTest` atau unit test terkait).
3. Code review menyeluruh untuk memastikan tidak ada efek samping terhadap varian lain maupun RKAS/BKU yang berjalan.
