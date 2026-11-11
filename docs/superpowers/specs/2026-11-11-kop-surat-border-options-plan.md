# Implementation Plan: Pilihan Gaya Garis Pembatas Kop Surat (Garis 2, Garis 1, dan Tanpa Garis)

**Tanggal Rencana:** 11 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-11-kop-surat-border-options-design.md`](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-11-11-kop-surat-border-options-design.md)

---

## 1. Ringkasan Tugas & Tujuan

Menyediakan opsi pilihan garis pembatas kop surat pada antarmuka pembuat kop surat (`KopSuratBuilder.tsx`):
1. **Garis 2 (Ganda):** Garis atas 3px solid, spasi 2px, garis bawah 1px solid (standar resmi dinas pemda).
2. **Garis 1 (Tunggal):** Garis solid 2px hitam tegas dan proporsional.
3. **Tanpa Garis:** Tanpa garis pembatas (clean / polos).

Pilihan garis ini disimpan permanen ke database pada tabel `sekolahs` (kolom `kop_border`) dan otomatis dicerminkan pada pratinjau live serta render gambar cetak PNG resolusi tinggi.

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Migration Database & Model Backend
1. **Migration Baru:** `database/migrations/2026_11_11_150000_add_kop_border_to_sekolahs_table.php`
   - Menambahkan kolom `kop_border VARCHAR(20) DEFAULT 'double' AFTER kop_mode` pada tabel `sekolahs`.
2. **Model:** `app/Models/SekolahProfile.php`
   - Menambahkan `'kop_border'` ke array `$fillable`.
3. **Controller:** `app/Http/Controllers/SekolahProfileController.php`
   - Pada method `saveBuilderKop`:
     - Tambahkan validasi: `'kop_border' => 'required|in:double,single,none'`.
     - Simpan ke array `$updateData['kop_border'] = $request->kop_border`.
4. Jalankan `php artisan migrate --force`.

### Tahap 2: Update TypeScript Interface di `Index.tsx` & `KopSuratBuilder.tsx`
1. Di `resources/js/Pages/DataMaster/SekolahProfile/Index.tsx`:
   - Update `interface Sekolah` untuk menyertakan `kop_border?: 'double' | 'single' | 'none'`.
2. Di `resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx`:
   - Update `interface Sekolah` dan `KopSuratBuilderProps` untuk menyertakan `kop_border?: 'double' | 'single' | 'none'`.

### Tahap 3: Update State & Live Preview di `KopSuratBuilder.tsx`
1. Deklarasikan state:
   ```tsx
   const [kopBorder, setKopBorder] = useState<'double' | 'single' | 'none'>(
       sekolah?.kop_border || 'double'
   );
   ```
2. Pada bagian pratinjau elemen kop (`previewRef.current`):
   Ganti pembatas statis dengan rendering kondisional:
   ```tsx
   {/* Garis Pembatas Kop Surat */}
   {kopBorder === 'double' && (
       <div className="w-full mt-3.5 pt-1">
           <div className="w-full border-t-[3px] border-black"></div>
           <div className="w-full border-t-[1px] border-black mt-[2px]"></div>
       </div>
   )}
   {kopBorder === 'single' && (
       <div className="w-full mt-3.5 pt-1">
           <div className="w-full border-t-[2px] border-black"></div>
       </div>
   )}
   {kopBorder === 'none' && (
       <div className="w-full mt-2"></div>
   )}
   ```
3. Pada `executeSaveKop`:
   Tambahkan `formData.append('kop_border', kopBorder)`.

### Tahap 4: Restrukturisasi Layout & Tambah Kartu "Pilihan Garis Pembatas"
1. Ubah grid pengaturan logo lama (`grid-cols-1 lg:grid-cols-3`) menjadi 2 baris terpisah dengan `grid-cols-1 md:grid-cols-2 gap-6`:
   - **Baris 1:**
     - Kartu 1: `Pilihan Susunan Logo` (1 Logo / 2 Logo).
     - Kartu 2: `Pilihan Garis Pembatas` (Garis 2, Garis 1, Tanpa Garis) dengan radio input interaktif dan visual miniature strip.
   - **Baris 2:**
     - Kartu 3: `Upload Logo Daerah`.
     - Kartu 4: `Upload Logo Sekolah`.

### Tahap 5: Verifikasi & Build
1. Jalankan `npm run build` (`tsc && vite build`) untuk memastikan tipe TypeScript valid dan bundling Vite sukses.
2. Lakukan commit git untuk seluruh perubahan.
