# Rencana Implementasi: Penanganan Data Transaksi Berjumlah Besar (Payroll & Rincian Belanja) serta Container Overflow Scroll Tabel AI Copilot

- **Tanggal**: 2026-10-20
- **Status**: Siap Dijalankan
- **Dokumen Desain**: `docs/superpowers/specs/2026-10-20-copilot-large-data-pagination-and-table-overflow-design.md`

---

## Tahapan Pekerjaan

### Langkah 1: Frontend Table Overflow Container & Sticky Header (`CopilotDrawer.tsx`)
1. **Perbaiki Sanitizer & Table Wrapper**:
   - Di `resources/js/Components/Ai/CopilotDrawer.tsx`:
   - Ganti logika regex wrapper tabel pada `sanitizeAndFormatHtml`.
   - Pastikan **setiap tag `<table>`** yang belum terbungkus container overflow dibungkus dengan:
     ```html
     <div class="overflow-x-auto overflow-y-auto max-h-80 my-2.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs bg-white dark:bg-gray-800 scroll-smooth">
         ...
     </div>
     ```
   - Samakan batas tinggi `renderParsedTable` dari `max-h-72` menjadi `max-h-80`.
2. **Sticky Table Header Styling**:
   - Tambahkan styling sticky untuk `thead` dan `th`:
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
3. **Validasi TypeScript**:
   - Jalankan `npx tsc --noEmit` untuk memastikan tidak ada kesalahan kompilasi frontend.

---

### Langkah 2: Backend DeepSeekService Max Tokens (`DeepSeekService.php`)
1. **Tambahkan parameter `max_tokens` ke payload `callChatWithTools`**:
   - Set default `'max_tokens' => $options['max_tokens'] ?? 8192` pada `$payload` ke endpoint `/chat/completions`.
   - Ini memperbesar kapasitas output token dari default 4.096 menjadi 8.192 token.
2. **Penyempurnaan Penanganan Status Error**:
   - Pastikan penanganan status 401, 402, 429 konsisten dan ramah pengguna.

---

### Langkah 3: Backend System Prompt Guidelines di CopilotService (`CopilotService.php`)
1. **Tambahkan Pedoman Penanganan Data Besar (> 20 Transaksi)**:
   - Pada bagian awal instruksi format dan aturan penyajian data di `buildSystemPrompt()`:
   - Tambahkan pedoman:
     * Jika transaksi yang dihasilkan dari tool (misalnya `get_rincian_pencairan`, `get_lembar_kerja_221`, `search_rkas_activity`, atau daftar honorarium/payroll) berjumlah **lebih dari 20 transaksi**, dan pengguna **belum meminta "tampilkan semua"**:
       - AI **DILARANG** merender tabel ratusan baris secara langsung.
       - AI wajib menyajikan:
         1. Ringkasan Eksekutif Angka (Total Bruto, Pajak, Neto, Jumlah Transaksi).
         2. Pesan penawaran sopan:
            > *"Data yang diminta cukup banyak (total **{N} transaksi**). Supaya nyaman dibaca di layar dan tidak terpotong, apakah Om mau:*
            > 1. *Ditampilkan per bulan tertentu (misal: Januari, September, dll.)?*
            > 2. *Dibuatkan ringkasan poin-poin penting per bulan/kategori?*
            > 3. *Atau tetap ingin saya tampilkan semua datanya sekaligus?*
            > 
            > *Silakan beri tahu saya ya, Om!"*
     * Jika pengguna membalas *"tampilkan semua"*, *"tampilkan semua data"*, *"lanjutkan semua"*, atau dari pertanyaan awal sudah meminta *"tampilkan semua data..."*:
       - AI langsung menyajikan seluruh baris data transaksi ke dalam tabel HTML terstruktur rapi.

---

### Langkah 4: Pengujian & Validasi
1. **Uji Frontend Wrapper**:
   - Buat skrip verifikasi parsing HTML `scratch/test_table_overflow_sanitizer.php` untuk memastikan pesan HTML dengan multiple table terbungkus `max-h-80` dan `overflow-x-auto`.
2. **Uji Live Chat DeepSeek**:
   - Buat skrip simulasi `scratch/test_live_chat_large_data.php`:
     - Tes 1: Query *"minta rincian belanja tahap 2 tahun 2026"* (76 transaksi) -> verifikasi respon berupa ringkasan + penawaran opsi.
     - Tes 2: Query lanjutan *"tampilkan semua"* -> verifikasi AI merender seluruh 76 baris data dalam tabel lengkap tanpa terpotong.
3. **Code Style & Git Commit**:
   - Jalankan `vendor/bin/pint` pada `DeepSeekService.php` dan `CopilotService.php`.
   - Jalankan `git add` dan `git commit` untuk mendokumentasikan perubahan.
