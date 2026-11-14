# Rencana Implementasi Perbaikan Overflow Select pada Dokumen BKU

> **For agentic workers:** Terapkan perubahan `relative z-20` dan `overflowVisible` pada wrapper dan `<Surface>` filter di keempat komponen tab Dokumen BKU, lalu verifikasi melalui build Vite/TypeScript.

**Tujuan:** Memastikan panel dropdown `<SearchableSelect />` ("Pilih Tahun Anggaran") di keempat tab halaman Dokumen BKU tidak terpotong batas card filter maupun tertumpuk di belakang card tabel.

**Arsitektur:** Penambahan `relative z-20` pada div wrapper filter (`animationDelay: '60ms'`) dan prop `overflowVisible` pada `<Surface padding="sm">` di masing-masing tab (`TabReguler`, `TabSilpa`, `TabKinerja`, `TabKinerjaSilpa`).

**Tech Stack:** React 18, TypeScript (strict), Tailwind 3, Vite 7.

---

### Task 1: Perbarui wrapper filter dan `<Surface>` di keempat tab Dokumen

**Files:**
- Modify: `resources/js/Pages/Penatausahaan/Dokumen/components/TabReguler.tsx:163-166`
- Modify: `resources/js/Pages/Penatausahaan/Dokumen/components/TabSilpa.tsx:165-168`
- Modify: `resources/js/Pages/Penatausahaan/Dokumen/components/TabKinerja.tsx:163-166`
- Modify: `resources/js/Pages/Penatausahaan/Dokumen/components/TabKinerjaSilpa.tsx:163-166`

- [ ] **Step 1:** Pada setiap file di atas, ubah:
  ```tsx
  <div className="animate-rise" style={{ animationDelay: '60ms' }}>
      <Surface padding="sm">
  ```
  menjadi:
  ```tsx
  <div className="relative z-20 animate-rise" style={{ animationDelay: '60ms' }}>
      <Surface padding="sm" overflowVisible>
  ```

### Task 2: Verifikasi & Commit

- [ ] **Step 1:** Cek seluruh file `Tab*.tsx` di `Penatausahaan/Dokumen/components/` memastikan ke-4 tab memakai `relative z-20 animate-rise` + `overflowVisible`.
- [ ] **Step 2:** Jalankan `npm run build` (`tsc && vite build`) dan pastikan exit code `0`.
- [ ] **Step 3:** Commit rencana implementasi dan perubahan kode ke `main`.
