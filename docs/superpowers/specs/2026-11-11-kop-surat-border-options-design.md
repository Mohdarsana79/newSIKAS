# Dokumen Desain: Pilihan Gaya Garis Pembatas Kop Surat (Garis 2, Garis 1, dan Tanpa Garis)

**Tanggal:** 11 November 2026  
**Status:** Disetujui Pengguna (Drafting Spec)  
**Modul:** Profil Sekolah / Pembuat Kop Surat (`resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx`)

---

## 1. Latar Belakang & Kebutuhan Fitur

Pada format dokumen kedinasan dan surat resmi sekolah, terdapat beberapa standar bentuk garis pembatas kop surat:
1. **Garis Ganda (Garis 2 / Double):** Standar resmi tata naskah dinas pemerintah daerah (garis tebal 3px dan garis tipis 1px dengan jarak 2px).
2. **Garis Tunggal (Garis 1 / Single):** Garis pembatas solid tunggal tegas (2px) untuk format dokumen dinas modern / minimalis.
3. **Tanpa Garis (None / Polos):** Tidak ada garis pembatas sama sekali, cocok untuk format kop surat modern, sekolah swasta/yayasan yang menggunakan desain clean tanpa garis separator horizontal.

Sebelumnya, garis pembatas kop surat diatur permanen (hardcoded) menggunakan format garis ganda 2 garis. Fitur ini memungkinkan pengguna memilih salah satu dari 3 gaya garis pembatas tersebut, melihat pratinjau langsung secara real-time, dan menyimpannya secara permanen ke database serta ke file gambar PNG cetak kop surat.

---

## 2. Rincian Desain Antarmuka (UI/UX)

### 2.1 Tata Letak (Layout) Kartu Pengaturan
Mengubah susunan panel pengaturan di bawah pratinjau kop surat menjadi **2 Baris (Grid 2 Kolom)** agar lebih luas, proporsional, dan seimbang:
- **Baris 1 (Pengaturan Layout & Garis):**
  - **Kolom Kiri:** Kartu "Pilihan Susunan Logo" (1 Logo atau 2 Logo).
  - **Kolom Kanan:** Kartu "Pilihan Garis Pembatas" (Garis 2 / Ganda, Garis 1 / Tunggal, Tanpa Garis).
- **Baris 2 (Upload Logo):**
  - **Kolom Kiri:** Kartu "Upload Logo Daerah".
  - **Kolom Kanan:** Kartu "Upload Logo Sekolah".

### 2.2 Desain Kartu "Pilihan Garis Pembatas"
Kartu pengaturan garis pembatas dilengkapi dengan ikon `Minus` / `Split` / `Baseline`, judul, deskripsi singkat, dan 3 opsi radio interaktif dengan visual miniatur:
1. **Garis 2 (Ganda / Resmi Kedinasan):**
   - Miniatur preview: Dua garis horizontal hitam (tebal 3px dan tipis 1px).
   - Badge info: `Resmi Dinas`.
   - Deskripsi: *Garis ganda tebal-tipis standar resmi tata naskah dinas pemda.*
2. **Garis 1 (Tunggal / Solid Standar):**
   - Miniatur preview: Satu garis horizontal hitam tegas (tebal 2px).
   - Badge info: `Standar`.
   - Deskripsi: *Satu garis solid tegas dan proporsional untuk dokumen resmi.*
3. **Tanpa Garis (Polos / Clean):**
   - Miniatur preview: Garis putus-putus transparan abu-abu atau tanda kosong (Ø).
   - Badge info: `Polos`.
   - Deskripsi: *Kop surat bersih tanpa garis pembatas horizontal.*

---

## 3. Pratinjau Real-Time (Live Preview) & Canvas Render

Pada elemen kontainer Kop Surat (`previewRef.current`):
- Ketika `kopBorder === 'double'`:
  ```tsx
  <div className="w-full mt-3.5 pt-1">
      <div className="w-full border-t-[3px] border-black"></div>
      <div className="w-full border-t-[1px] border-black mt-[2px]"></div>
  </div>
  ```
- Ketika `kopBorder === 'single'`:
  ```tsx
  <div className="w-full mt-3.5 pt-1">
      <div className="w-full border-t-[2px] border-black"></div>
  </div>
  ```
- Ketika `kopBorder === 'none'`:
  ```tsx
  <div className="w-full mt-2"></div>
  ```

Hasil render pratinjau ini otomatis terkonversi secara identik ke gambar resolusi tinggi PNG (2480 × 588 px) saat pengguna mengunduh atau menyimpan kop surat.

---

## 4. Perubahan Database & Backend

1. **Database Migration:**
   - Tabel: `sekolahs`
   - Kolom baru: `kop_border VARCHAR(20) DEFAULT 'double' AFTER kop_mode`
2. **Model `SekolahProfile`:**
   - Tambahkan `'kop_border'` ke array `$fillable`.
3. **Controller `SekolahProfileController::saveBuilderKop`:**
   - Validasi: `'kop_border' => 'required|in:double,single,none'`
   - Simpan `$request->kop_border` ke kolom `kop_border` di database.
4. **TypeScript Interface & Props:**
   - Tambahkan `kop_border?: 'double' | 'single' | 'none'` pada `interface Sekolah` di `Index.tsx` dan `KopSuratBuilderProps`.

---

## 5. Rencana Pengujian & Verifikasi

1. **Uji UI Interaktif:** Mengganti opsi dari Garis 2 -> Garis 1 -> Tanpa Garis; memastikan tampilan live preview langsung berubah seketika.
2. **Uji Simpan Kop:** Mengklik tombol Simpan Kop dengan masing-masing opsi garis, memastikan nilai tersimpan di database dan gambar hasil render PNG mencerminkan garis yang dipilih.
3. **Uji Download PNG:** Mengunduh PNG dan memverifikasi ketepatan garis di file gambar lokal.
4. **Uji Kompilasi:** Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan tidak ada error TypeScript maupun bundling.
