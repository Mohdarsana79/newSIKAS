# Spesifikasi Desain: Penanganan Data Transaksi Berjumlah Besar (Payroll & Rincian Belanja) serta Container Overflow Scroll Tabel AI Copilot

- **Tanggal**: 2026-10-20
- **Status**: Disetujui Pengguna
- **Terkait**:
  - `resources/js/Components/Ai/CopilotDrawer.tsx`
  - `app/Services/Ai/CopilotService.php`
  - `app/Services/Ai/DeepSeekService.php`

---

## 1. Masalah & Latar Belakang

1. **Tabel Terpotong / Merusak Tampilan Chat**:
   - Pada `resources/js/Components/Ai/CopilotDrawer.tsx`, fungsi `sanitizeAndFormatHtml` memiliki bug logika:
     ```ts
     if (processed.includes('<table') && !processed.includes('overflow-x-auto')) { ... }
     ```
     Jika pesan AI memuat tabel markdown (misal tabel ringkasan) yang sudah dibungkus container `overflow-x-auto`, kondisi `!processed.includes('overflow-x-auto')` bernilai `false`. Akibatnya, tabel HTML mentah berikutnya (`<table>...</table>`) tidak dibungkus container scroll sama sekali, sehingga jika tabel sangat lebar atau memiliki banyak baris, tabel meluap atau terpotong tanpa bisa discroll.
2. **Keterbatasan Output Token DeepSeek (Teks Terputus di Tengah Jalan)**:
   - Ketika pengguna meminta "payroll", "honorarium", atau "rincian belanja" untuk cakupan yang luas (misalnya 1 tahun penuh atau 1 tahap dengan puluhan hingga ratusan item belanja):
     - AI mencoba merender ratusan tag `<tr><td>...</td></tr>`.
     - Output token DeepSeek API menabrak batas kapasitas default (4.096 token) dan terpotong di tengah kalimat/tabel (`<tr><td>60...`), menghasilkan format yang rusak.
3. **Ketiadaan Alur Konfirmasi Cerdas**:
   - Pengguna menginginkan agar saat data yang diminta terlalu banyak, AI tidak langsung memaksakan menampilkan ratusan baris data yang berisiko terpotong, melainkan memberikan respon yang sopan: menyajikan ringkasan eksekutif angka terlebih dahulu, lalu menawarkan opsi apakah ingin ditampilkan per bulan, dibuatkan poin-poin penting, atau jika pengguna mengonfirmasi "tampilkan semua", baru ditampilkan seluruh baris datanya.

---

## 2. Sasaran Desain (Goals)

1. **Container Overflow Scroll yang Andal (Horizontal & Vertikal dengan Sticky Header)**:
   - Setiap tabel yang dirender di jendela chat Copilot (baik hasil konversi markdown maupun tag `<table>` HTML mentah) wajib terbungkus di dalam container scroll:
     - `overflow-x-auto`: tabel bisa digeser ke samping untuk melihat kolom nama kegiatan, penerima, kwitansi, nominal, pajak, dll.
     - `overflow-y-auto max-h-80`: tinggi tabel dibatasi maksimal 20rem (320px) dengan scroll vertikal halus.
     - `thead sticky top-0`: kepala tabel tetap menempel di atas saat pengguna men-scroll baris transaksi ke bawah.
2. **Kapasitas Output Token Maksimal**:
   - Di `DeepSeekService::callChatWithTools`, set parameter `max_tokens` ke `8192` (kapasitas tertinggi resmi DeepSeek-V3), memberi ruang 2x lipat lebih lega.
3. **Aturan Kecerdasan AI untuk Data Berjumlah Besar (> 20 Transaksi)**:
   - **Batas Ambang (*Threshold*)**: **20 baris transaksi**.
   - Jika hasil data dari tool (misalnya `get_rincian_pencairan`, `get_lembar_kerja_221`, `search_rkas_activity`, atau daftar honor/payroll) memiliki **lebih dari 20 baris transaksi**, dan pengguna **belum secara tegas meminta "tampilkan semua"**:
     - AI menyajikan **Ringkasan Eksekutif Angka** (Total Bruto, Pajak, Neto, dan Sebaran per Bulan/Tahap).
     - AI memberikan pesan ramah:
       > *"Data yang diminta cukup banyak (total **{N} transaksi**). Agar nyaman dibaca di layar dan tidak terpotong, apakah Om mau:*
       > 1. *Ditampilkan per bulan tertentu (misal: Januari, September, dll.)?*
       > 2. *Dibuatkan ringkasan poin-poin penting per bulan/kategori?*
       > 3. *Atau tetap ingin saya tampilkan semua datanya sekaligus?*
       > 
       > *Silakan beri tahu saya ya, Om!"*
   - Jika pengguna membalas *"tampilkan semua"*, *"tampilkan semua data"*, *"lanjutkan semua"*, atau dari pertanyaan awal sudah meminta *"tampilkan semua data rincian belanja/payroll"*:
     - AI langsung menampilkan seluruh baris transaksi lengkap ke dalam tabel HTML yang terbungkus container scroll.

---

## 3. Komponen & Perubahan Teknis

### 3.1. Frontend: `resources/js/Components/Ai/CopilotDrawer.tsx`
1. **Perbaikan `sanitizeAndFormatHtml`**:
   - Ganti logika pembungkusan tabel agar membungkus **setiap tabel** yang belum berada di dalam container `overflow`:
     ```ts
     // Wrap any raw <table> that is not already enclosed in an overflow container
     processed = processed.replace(
         /(?<!<div class="[^"]*overflow[^"]*">[\s\S]*?)(<table[\s\S]*?<\/table>)/gi,
         '<div class="overflow-x-auto overflow-y-auto max-h-80 my-2.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs bg-white dark:bg-gray-800 scroll-smooth">$1</div>'
     );
     ```
   - Atau parsing tag `<table>` secara bersih: jika ada tag `<table>` yang tidak didahului pembungkus overflow, bungkus dengan container `max-h-80 overflow-x-auto overflow-y-auto`.
2. **Sticky Header CSS**:
   - Di blok `<style>` scoped CopilotDrawer:
     ```css
     .ai-html-content thead {
         position: sticky;
         top: 0;
         z-index: 10;
     }
     .ai-html-content th {
         position: sticky;
         top: 0;
         z-index: 10;
         background-color: rgba(241, 245, 249, 0.98);
         backdrop-filter: blur(4px);
     }
     .dark .ai-html-content th {
         background-color: rgba(30, 41, 59, 0.98);
         backdrop-filter: blur(4px);
     }
     ```

### 3.2. Backend: `app/Services/Ai/DeepSeekService.php`
- Di method `callChatWithTools`:
  Tambahkan `'max_tokens' => $options['max_tokens'] ?? 8192` pada `$payload` ke endpoint DeepSeek API.

### 3.3. Backend System Prompt: `app/Services/Ai/CopilotService.php`
- Perbarui pedoman umum penanganan output data banyak:
  - Definisikan aturan penanganan data > 20 item untuk Payroll, Rincian Belanja, RKAS, dan BKU.
  - Berikan instruksi eksplisit:
    - Jika data > 20 baris dan pengguna belum meminta "tampilkan semua", tampilkan ringkasan eksekutif angka + tawarkan opsi (per bulan / poin penting / tampilkan semua).
    - Jika pengguna merespons dengan "tampilkan semua" atau query awal memuat instruksi "tampilkan semua", sajikan seluruh data dalam tabel lengkap.

---

## 4. Kriteria Pengujian & Validasi

1. **Uji Frontend**:
   - Buka pesan Copilot yang memuat tabel.
   - Pastikan header tabel tetap menempel di atas saat baris tabel di-scroll ke bawah.
   - Pastikan tabel lebar bisa di-scroll ke samping dengan mulus tanpa memotong konten.
2. **Uji Kecerdasan AI (> 20 Transaksi)**:
   - Tanyakan: *"minta data payroll"* atau *"minta data rincian belanja tahun 2026"*.
   - Verifikasi AI menyajikan ringkasan eksekutif dan menanyakan opsi per bulan / poin penting / tampilkan semua.
   - Balas dengan: *"tampilkan semua"*.
   - Verifikasi AI menampilkan seluruh baris data dalam tabel lengkap tanpa terpotong.
3. **Uji Pint Code Styling & TypeScript**:
   - Jalankan `vendor/bin/pint` pada file PHP yang diubah.
   - Jalankan `npx tsc --noEmit` untuk memastikan tidak ada error tipe pada file TypeScript/TSX.
