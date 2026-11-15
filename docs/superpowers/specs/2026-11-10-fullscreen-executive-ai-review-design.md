# Design Spec: Fullscreen Executive AI Review & Comprehensive Narrative Report

- **Tanggal**: 10 November 2026
- **Status**: Menunggu Review & Persetujuan Pengguna
- **Target Komponen**:
  - `resources/js/Components/Rkas/RkasAiReviewModal.tsx`
  - `app/Http/Controllers/RkasAiReviewController.php`
  - `resources/js/Components/Rkas/ai-review-templates.ts`

---

## 1. Latar Belakang & Identifikasi Masalah
Berdasarkan pengujian nyata oleh pengguna dan tangkapan layar yang diunggah:
1. **Modal Terpotong oleh Batas Layar Browser**:
   - Modal berukuran `5xl` menggunakan flexbox centering bawaan (`items-center` di backdrop `Modal.tsx`) sehingga bagian atas dan bawah modal terpotong di luar viewport browser laptop/desktop standar.
   - Akibatnya, pengguna tidak dapat melihat bagian atas judul dan bagian bawah modal, serta tombol-tombol utama tidak dapat dijangkau dengan mudah.
2. **Teks Tidak Terbaca (*Low Contrast*)**:
   - AI menghasilkan teks dengan kelas warna pastel yang terlalu terang (misal: `text-emerald-200`, `text-emerald-100`) di atas latar belakang putih, sehingga teks menjadi hampir tidak terlihat (*unreadable*).
3. **Data Terputus / Tidak Tampil Lengkap (*Truncated Response*)**:
   - Batas `max_tokens` pada `RkasAiReviewController.php` sebelumnya diset pada angka 2000. Karena AI menghasilkan markup HTML yang kaya kelas Tailwind, respons AI terpotong di tengah pembuatan tabel belanja ("NO URAIAN BELANJA" lalu terputus). Tag HTML yang tidak tertutup merusak parsing browser dan menghilangkan seluruh konten di bawahnya.
4. **Kebutuhan Teks Narasi / Penjelasan Eksekutif**:
   - Laporan tidak boleh hanya berisi kartu angka dan tabel kosong, tetapi harus menyajikan **laporan narasi penjelasan mendalam** (Executive Narrative Report) yang mengulas kondisi keuangan sekolah secara rinci, analitis, dan solutif bagi Kepala Sekolah.

---

## 2. Tujuan & Sasaran Solusi
1. **Fullscreen Executive View (Modal Layar Penuh)**:
   - Mengganti modal mengambang dengan antarmuka layar penuh (*Fullscreen Overlay*):
     - Bilah navigasi atas (*Header Toolbar*) tetap diam (*sticky/fixed top*) lengkap dengan judul laporan, status dokumen, indikator AI, tombol Salin Ringkasan, Cetak/PDF, Analisis Ulang, dan Tutup.
     - Area konten terpusat (`max-w-6xl mx-auto w-full`) dengan scroll mandiri yang halus (*custom scrollbar*) sehingga seluruh laporan dapat dibaca dari atas hingga bawah tanpa terpotong batas browser.
2. **Kapasitas Token yang Luas (Anti-Truncation)**:
   - Menaikkan alokasi `max_tokens` dari 2000 menjadi **5000 tokens** pada controller DeepSeek, menjamin seluruh tabel, kartu, dan narasi penjelasan tuntas 100% tanpa risiko terpotong.
3. **Standar Kontras Tinggi (*High Contrast WCAG*)**:
   - Mempertegas aturan tipografi pada System Prompt AI:
     - Judul & Heading: `text-gray-900 dark:text-white font-extrabold`.
     - Teks Narasi & Paragraf: `text-gray-800 dark:text-gray-100 text-sm leading-relaxed`.
     - Melarang keras teks warna pucat (`text-emerald-100`, `text-gray-200` dsb.) pada latar terang.
     - Badge warna pekat dan jelas (`text-emerald-900 bg-emerald-100 border-emerald-300`, dsb.).
4. **Laporan Narasi Eksekutif Lengkap & Terstruktur**:
   - Struktur laporan komprehensif memuat 5 bagian:
     - **Bagian 1: Narasi Ringkasan Eksekutif & 4 Kartu KPI**: Paragraf evaluasi umum kondisi anggaran + kartu metrik.
     - **Bagian 2: Narasi Analisis Postur & Rasio Belanja**: Pembahasan rasio operasional vs modal, alokasi semester, dan dampaknya terhadap mutu sekolah.
     - **Bagian 3: Tabel 5 Belanja Terbesar & Ulasan Analitis per Belanja**: Tabel data lengkap disertai paragraf telaah per item belanja terbesar (kewajaran harga, urgensi, dan verifikasi volume).
     - **Bagian 4: Evaluasi Risiko, Kepatuhan Regulasi & Deteksi Anomali**: Analisis potensi temuan audit (BPK/Inspektorat), kewajaran belanja di SIPLAH, dan rambu-rambu Juknis BOSP.
     - **Bagian 5: Arahan & Rekomendasi Tertulis Kepala Sekolah**: Rekomendasi naratif dan instruksi tegas untuk Bendahara sebelum penandatanganan pengesahan.

---

## 3. Rencana Arsitektur & Implementasi

### A. Frontend: `RkasAiReviewModal.tsx`
- Tidak lagi dibungkus komponen `Modal` berukuran terbatas, melainkan menggunakan kontainer **Fullscreen Overlay**:
  ```tsx
  {show && (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col">
          {/* Sticky Header Bar */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              ...
          </div>
          {/* Full Height Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 dark:bg-gray-900 custom-scrollbar">
              <div className="max-w-6xl mx-auto w-full">
                  ...
              </div>
          </div>
      </div>
  )}
  ```
- Shortcut Keyboard: Menutup dengan tombol `Escape`.
- Body lock: Mengunci scroll latar belakang body saat modal layar penuh terbuka.

### B. Backend: `RkasAiReviewController.php`
- `max_tokens` diubah menjadi `5000`.
- System Prompt diperkaya secara tegas:
  - Mewajibkan teks narasi penjelasan di setiap bagian.
  - Standar warna kontras tinggi: wajib menggunakan warna gelap `text-gray-900` atau `text-gray-800` pada latar terang.
  - Memastikan tag HTML ditutup dengan sempurna.

### C. Safelist & Helper: `ai-review-templates.ts`
- Memastikan semua kelas kontras tinggi (`text-emerald-900`, `text-amber-900`, `text-red-900`, `text-indigo-900`, `bg-emerald-100`, dsb.) terdaftar agar tidak ter-purge oleh Tailwind.

---

## 4. Rencana Pengujian
1. **Verifikasi Visual**:
   - Membuka modal pada berbagai resolusi layar laptop/desktop untuk memastikan header selalu terlihat, isi laporan dapat di-scroll lancar sampai bawah, dan tidak ada elemen yang terpotong.
   - Memastikan teks terbaca dengan jelas (kontras tinggi, tidak ada teks pucat).
2. **Verifikasi Konten**:
   - Memastikan respons AI memuat teks narasi penjelasan di setiap bagian laporan.
   - Memastikan tabel 5 Belanja Terbesar tampil utuh dengan baris-baris datanya.
3. **Automated Testing & Build**:
   - `npx tsc --noEmit` lolos 0 error.
   - `vendor/bin/pint` bersih.
   - `php artisan test --filter=RoleKepalaSekolahTest` lolos 100%.
   - `npm run build` sukses.

