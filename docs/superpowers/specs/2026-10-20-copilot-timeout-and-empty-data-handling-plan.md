# Rencana Implementasi: DeepSeek API Timeout & Universal "Data Tidak Ditemukan" Handling

- **Tanggal**: 2026-10-20
- **Spesifikasi**: [2026-10-20-copilot-timeout-and-empty-data-handling-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-copilot-timeout-and-empty-data-handling-design.md)
- **Status**: Siap Dikerjakan

---

## Task 1: Update Timeout & Exception Handling di `app/Services/Ai/DeepSeekService.php`
1. Pada method `callChatWithTools()`:
   - Naikkan default timeout dari 60 menjadi **120** detik:
     ```php
     $timeout = $options['timeout'] ?? 120;
     ```
   - Di dalam blok `catch (\Throwable $e)`:
     - Deteksi apakah pesan error mengandung `cURL error 28` atau `timed out`.
     - Jika ya, kembalikan pesan ramah bahasa Indonesia:
       ```php
       $isTimeout = str_contains($e->getMessage(), 'cURL error 28') || str_contains(strtolower($e->getMessage()), 'timed out');
       $errorMsg = $isTimeout
           ? 'Waduh, koneksi ke server DeepSeek sedang padat atau membutuhkan waktu berpikir lebih lama dari biasanya nih, Om. Coba ulangi pertanyaannya sebentar lagi ya, atau Om bisa memilih model deepseek-chat di menu Profil agar responsnya jauh lebih kilat!'
           : 'Gagal menghubungi DeepSeek API: ' . $e->getMessage();
       ```

## Task 2: Update Timeout di `app/Services/Ai/CopilotService.php`
1. Pada method `chat()`:
   - Ubah `'timeout' => 45` menjadi `'timeout' => 120`.

## Task 3: Optimasi Payload & Penanganan "Not Found" pada `getLembarKerja221()`
1. Ubah default `$limit = 50` menjadi `$limit = 25`.
2. Jika `$penganggaran` tidak ditemukan:
   - Kembalikan:
     ```php
     return [
         'status' => 'not_found',
         'data_ditemukan' => false,
         'message' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan di sistem.",
         'available_years' => $availableYears,
     ];
     ```
3. Jika `$allItems->isEmpty()`:
   - Kembalikan:
     ```php
     return [
         'status' => 'not_found',
         'data_ditemukan' => false,
         'message' => "Data Lembar Kerja 221 tahun {$tahun} belum memiliki rincian anggaran belanja yang diinput.",
         'available_years' => $availableYears,
     ];
     ```
4. Jika `$itemRows->isEmpty()` karena filter `$kodeRekening`:
   - Kembalikan:
     ```php
     return [
         'status' => 'not_found',
         'data_ditemukan' => false,
         'message' => "Data rincian belanja untuk kode rekening {$kodeRekening} pada Lembar Kerja 221 tahun {$tahun} tidak ditemukan.",
         'available_years' => $availableYears,
     ];
     ```

## Task 4: Standardisasi Penanganan "Not Found" pada Tool Perencanaan Lain
1. Pada `getRincianPencairan()`:
   - Jika `$penganggaran` tidak ditemukan atau `$sourceItems->isEmpty()` atau filtered items kosong:
     - Kembalikan `status => 'not_found'`, `data_ditemukan => false`, dan `message` yang jelas.
2. Pada `getAlurKas()`:
   - Jika `$penganggaran` tidak ditemukan atau `$sourceItems->isEmpty()`:
     - Kembalikan `status => 'not_found'`, `data_ditemukan => false`, dan `message` yang jelas.
3. Pada `getRkaRekapAnggaran()`:
   - Pastikan jika data penganggaran nihil, mengembalikan format not found yang konsisten.

## Task 5: Tambahkan Prompt Guidance untuk Lembar Kerja 221, RP, Alur Kas, dan Aturan Data Tidak Ditemukan
1. Di dalam `$systemPrompt` pada `CopilotService::chat()`:
   - Tambahkan pedoman penyajian Lembar Kerja 221 (tabel Ringkasan Hierarki Rekening + rincian item utama).
   - Tambahkan pedoman penyajian Rincian Pencairan (RP).
   - Tambahkan pedoman penyajian Alur Kas.
   - Tambahkan ATURAN KETAT DATA TIDAK DITEMUKAN:
     - Respon ramah santai ("Om/Bos").
     - Sebutkan kriteria yang dicari.
     - Sebutkan alternatif tahun/data yang tersedia.
     - Dilarang mengarang data palsu.

## Task 6: Verifikasi & Testing
1. Uji backend method langsung dengan parameter tahun valid (2026, 2025) dan tidak valid (2030) serta filter rekening.
2. Uji live chat copilot untuk Lembar Kerja 221 tahun 2026 dan Lembar Kerja 221 tahun 2030 (not found scenario).
3. Jalankan `vendor/bin/pint` pada file yang diubah.
4. Git commit perubahan.
