# Design Spec: DeepSeek API Timeout & Universal "Data Tidak Ditemukan" Handling pada AI Copilot

**Tanggal**: 2026-10-20  
**Status**: Approved by User  
**Terkait**: `app/Services/Ai/CopilotService.php`, `app/Services/Ai/DeepSeekService.php`

---

## 1. Masalah & Latar Belakang

1. **cURL Timeout 45 Detik**:
   Saat pengguna meminta data Lembar Kerja 221 pada AI Copilot, muncul error:
   ```text
   Gagal menghubungi DeepSeek API: cURL error 28: Operation timed out after 45015 milliseconds with 0 bytes received for https://api.deepseek.com/chat/completions
   ```
   Penyebab utama:
   - Batas waktu request di `CopilotService::chat()` disetel hanya 45 detik (`'timeout' => 45`).
   - Profil pengguna menggunakan model `deepseek-reasoner` (DeepSeek-R1) yang memiliki fase pemikiran (*chain-of-thought*) intensif sebelum menghasilkan output teks.
   - Ukuran data Lembar Kerja 221 mengembalikan 50 baris item sekaligus (~11 KB payload) dan belum memiliki instruksi penataan tabel hierarki yang ringkas di system prompt, sehingga model AI memproses dan merender data dalam waktu yang melampaui 45 detik.
   - Pesan error teknis cURL mentah terekspos langsung ke pengguna tanpa saran alternatif yang bersahabat.

2. **Penanganan Data Tidak Ditemukan**:
   Ketika pengguna mencari data pada kriteria yang belum ada (misalnya tahun anggaran yang belum dibuat, kode rekening yang tidak memiliki rincian belanja, atau bulan yang belum memiliki transaksi):
   - Beberapa tool hanya mengembalikan array kosong `[]` atau `['error' => ...]`.
   - AI Copilot tidak memiliki instruksi tegas untuk menyampaikan pesan santai dan bersahabat bahwa data tersebut tidak ditemukan, menyebutkan kriteria pencariannya, serta memberikan informasi tahun/data apa saja yang tersedia di sistem.

---

## 2. Sasaran Desain (Goals)

1. **API Resilience & Timeout 120s**:
   - Naikkan timeout HTTP request ke DeepSeek API menjadi **120 detik** di `CopilotService` dan `DeepSeekService`.
   - Tangkap exception timeout / cURL error 28 secara elegan dan ubah menjadi pesan ramah bahasa Indonesia dengan tips menggunakan `deepseek-chat` jika butuh waktu lebih singkat.
2. **Optimasi Payload Lembar Kerja 221**:
   - Kurangi batas default baris item dari 50 menjadi **25 baris**, sambil mempertahankan `hierarki_summary` lengkap untuk seluruh kelompok rekening belanja (5, 5.1, 5.1.02, 5.2, dst.).
   - Tambahkan instruksi panduan penyajian Lembar Kerja 221, Rincian Pencairan, dan Alur Kas di System Prompt Copilot.
3. **Standarisasi Respon Data Tidak Ditemukan**:
   - Seluruh tool mengembalikan struktur standar:
     ```php
     [
         'status' => 'not_found',
         'data_ditemukan' => false,
         'message' => 'Data ... tidak ditemukan untuk kriteria tersebut.',
         'available_years' => [...],
     ]
     ```
   - System prompt menginstruksikan AI Copilot untuk merespons dengan gaya santai & bersahabat ("Om / Bos"), menjelaskan kriteria yang tidak ditemukan, menginfokan data tahun yang tersedia di database, dan menawarkan bantuan terkait lainnya tanpa mengarang data palsu.

---

## 3. Komponen & Perubahan Arsitektur

### 3.1. `app/Services/Ai/DeepSeekService.php`
- Ubah default timeout di `callChatWithTools`:
  ```php
  $timeout = $options['timeout'] ?? 120;
  ```
- Tambahkan penanganan error khusus untuk timeout pada blok `catch (\Throwable $e)`:
  - Jika pesan error memuat `cURL error 28` atau `timed out`:
    ```php
    $friendlyMsg = 'Waduh, koneksi ke server DeepSeek sedang padat atau membutuhkan waktu berpikir lebih lama dari biasanya nih, Om. Coba ulangi pertanyaannya sebentar lagi ya, atau Om bisa memilih model deepseek-chat di menu Profil agar responsnya jauh lebih kilat!';
    ```

### 3.2. `app/Services/Ai/CopilotService.php`
1. **Loop Chat Call Timeout**:
   - Ubah parameter timeout dari 45 menjadi 120:
     ```php
     $response = $this->deepSeekService->callChatWithTools($apiKey, $conversation, $tools, [
         'model' => $model,
         'timeout' => 120,
     ]);
     ```
2. **Optimasi `getLembarKerja221`**:
   - Default `$limit` diubah menjadi `25`.
   - Cek jika `$penganggaran` tidak ada atau `$allItems->isEmpty()`:
     - Kembalikan `status => 'not_found'`, `data_ditemukan => false`, dan daftar `available_years`.
   - Cek jika filter `$kodeRekening` menghasilkan 0 item belanja:
     - Kembalikan status `'not_found'` dengan pesan spesifik kode rekening tersebut.
3. **Standardisasi `getRincianPencairan` & `getAlurKas`**:
   - Tambahkan pengecekan konsisten untuk mengembalikan `status => 'not_found'` dan `data_ditemukan => false` jika data tidak ditemukan.
4. **Pengkayaan System Prompt**:
   - Tambahkan panduan modul Lembar Kerja 221, Rincian Pencairan, dan Alur Kas di `$systemPrompt`.
   - Tambahkan aturan baku penanganan data kosong/tidak ditemukan:
     ```text
     ATURAN DATA TIDAK DITEMUKAN:
     Jika hasil pemanggilan tool mengembalikan status 'not_found', data_ditemukan = false, atau data kosong:
     - Sampaikan secara ramah dan santai bahwa data yang dicari tidak ditemukan di sistem.
     - Sebutkan kriteria yang dicari (tahun, bulan, rekening, atau tahap).
     - Berikan informasi opsi yang tersedia di database (misalnya: tahun anggaran yang tersedia: 2025 dan 2026).
     - JANGAN PERNAH mengarang data palsu.
     ```

---

## 4. Kriteria Pengujian & Keberhasilan (Acceptance Criteria)

1. **Uji Timeout & Model**:
   - Pemanggilan chat untuk pertanyaan "minta lembar kerja 221" baik dengan model `deepseek-chat` maupun `deepseek-reasoner` berjalan sukses tanpa terputus cURL error 28.
   - Jika jaringan sengaja diputus atau time out, pesan yang muncul adalah pesan bersahabat bahasa Indonesia, bukan cURL dump.
2. **Uji Data Lembar Kerja 221**:
   - Menghasilkan ringkasan hierarki rekening (5, 5.1, 5.1.02, 5.2) dan daftar rincian 25 item belanja yang presisi.
3. **Uji Data Tidak Ditemukan**:
   - Pengujian kriteria tahun tidak valid (misal: "minta lembar kerja 221 tahun 2030") dijawab ramah bahwa data tahun 2030 belum ada, disertai info bahwa data yang tersedia adalah 2025 dan 2026.
   - Pengujian kode rekening yang tidak ada (misal: "tampilkan lembar kerja 221 untuk akun 5.3") dijawab bahwa tidak ada rincian belanja untuk akun tersebut.
