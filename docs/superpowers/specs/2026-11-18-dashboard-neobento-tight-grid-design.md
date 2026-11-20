# Desain Penyempurnaan UI Dashboard Neo-Bento (3 Baris Rapat & Tanpa Celah Kosong)

**Tanggal:** 2026-11-18
**Status:** Disetujui pengguna
**File Terkait:**
- `resources/js/Pages/Dashboard.tsx`
- `resources/js/Components/StatCard.tsx`
- `resources/js/Components/Bento/CalendarWidget.tsx`

---

## 1. Latar Belakang & Masalah

1. **Celah Kosong Vertikal di Baris 2 & Baris 3:**
   - Pada tata letak sebelumnya, `Realisasi Bulanan` (`lg:col-span-8`, tinggi ~370px) bersanding dengan `CalendarWidget` (`lg:col-span-4`, tinggi ~230px) tanpa `h-full` dan tanpa konten pengisi bawah, menyisakan celah kosong ~140px di bawah kalender.
   - `Program Terbesar & SNP` (`lg:col-span-7`, tinggi ~380px) bersanding dengan `Agenda Tahapan BOSP` (`lg:col-span-5`, tinggi ~230px), kembali menyisakan ruang kosong di kanan bawah.
2. **Spasi Grid Tidak Seragam:**
   - Jarak antar-baris (`space-y-5` / 20px) berbeda dengan jarak antar-kolom (`gap-4` / 16px).
3. **Deskripsi `StatCard` Tidak Tampil:**
   - Pada `StatCard.tsx`, prop `description` berada di cabang `else` dari `typeof progress === 'number'`, sehingga teks deskripsi tidak pernah muncul saat `progress` diberikan.
4. **Legend Donut Chart 8 SNP Terlalu Panjang:**
   - Legend bawaan ApexCharts dengan 8 nama standar yang panjang mengecilkan porsi visual donut chart dan membuat tinggi kolom tidak seimbang.

---

## 2. Keputusan Desain

1. **Bento Grid Terkunci 3 Baris Rapat (`gap-3.5` / 14px seragam):**
   - **Baris 1 (4 Kolom):** 4 `StatCard` utama (`Pagu Anggaran`, `Total Realisasi`, `Sisa Saldo Kas`, `Penerimaan BOSP`) dengan `description` + `progressLabel` tampil berdampingan di atas bar progres.
   - **Baris 2 (8 Kolom + 4 Kolom, `items-stretch`):**
     - Kiri (`lg:col-span-8`): Kartu `Realisasi Bulanan Tahun {year}` dilengkapi 3 mini-KPI bulanan (*Total Realisasi*, *Rata-rata Bulanan*, *Bulan Tertinggi*) di atas grafik batang.
     - Kanan (`lg:col-span-4`): Satu kartu Bento terpadu `Kalender & Tahapan BOSP` (`h-full`) yang menyatukan kalender bulan berjalan di bagian atas dan 3 pil `Agenda Tahapan BOSP` di bagian bawah (`footer` slot pada `CalendarWidget`).
   - **Baris 3 (7 Kolom + 5 Kolom, `items-stretch`):**
     - Kiri (`lg:col-span-7`): Kartu `Program Terbesar & SNP` (`h-full`) dengan Donut Chart bersih (tanpa legend bawaan panjang, diganti pil ringkasan 3 SNP teratas di bawah donut) di sisi kiri dan 4 Kartu Program Teratas di sisi kanan.
     - Kanan (`lg:col-span-5`): Kartu `Tren Realisasi 5 Tahun Terakhir` (`h-full`) dengan 3 mini-KPI (*Rata-rata 5 Tahun*, *Puncak Realisasi*, *Serapan TA {year}*) di bagian atas dan Area Chart gradien di bagian bawah.
2. **Kapsul Filter Header Neo-Bento (`PageHeader`):**
   - Menambahkan ikon penanda (`Layers` untuk varian anggaran, `CalendarDays` untuk tahun anggaran) di dalam kapsul filter dengan transisi dan kontras yang rapi pada mode terang maupun gelap.
3. **Nol Regresi Logika:**
   - Seluruh state, pemanggilan Axios `route('dashboard.data')`, parameter `tahun` & `variant`, serta perhitungan angka tetap 100% dipertahankan.
