# Implementation Plan: Pencarian RKAS Berdasarkan Bulan, Keamanan SQL Injection, dan Pembersihan Istilah Teknis

**Tanggal:** 19 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-19-copilot-rkas-bulan-security-clean-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-rkas-bulan-security-clean-design.md)  
**Status:** Siap Dieksekusi  

---

## Ringkasan Proyek
1. **Pencarian RKAS Berdasarkan Bulan**: Memperluas tool `search_rkas_activity` di `CopilotService.php` agar menerima parameter opsional `bulan` (Januari - Desember) dan menyaring kolom `bulan` pada model RKAS.
2. **Pencegahan SQL Injection**: Menerapkan sanitasi input ketat, escaping wildcard `%_\\`, whitelist validasi enum bulan, dan parameterized prepared statements murni.
3. **Pembersihan Nama Variabel & Kode**: Memperketat instruksi System Prompt AI untuk melarang kode/variabel internal dan mengimplementasikan sanitasi *post-processing* regex di backend sebelum konten dikirim ke frontend.

---

## Tahapan Implementasi Detail

### Tahap 1: Backend - Definisi Tool & Filter Bulan di `CopilotService.php`
- [ ] Buka `app/Services/Ai/CopilotService.php`.
- [ ] Perbarui definisi tool `search_rkas_activity` di `getAvailableTools()`:
  - Tambahkan properti `bulan` (enum: Januari s/d Desember).
  - Jadikan `query` opsional (tidak ada field `required` mutlak jika salah satu diisi).
- [ ] Perbarui method `searchRkasActivity(int $tahun, ?string $query, string $variant, ?string $bulan = null)`:
  - Whitelist validasi bulan resmi Indonesia: `Januari` s/d `Desember`.
  - Jika `bulan` diberikan atau terdeteksi di teks query, filter `where('bulan', $matchedMonth)`.
  - Jika `query` teks diberikan, sanitasi dengan `addcslashes($queryClean, '%_\\')` dan gunakan prepared statement `whereRaw('LOWER(...) LIKE ?', ["%{$escaped}%"])`.
  - Sertakan `'bulan' => $item->bulan ?? '-'` dalam array hasil `items`.
- [ ] Hubungkan parameter `bulan` dari dispatcher `executeTool()`.

### Tahap 2: Backend - Aturan System Prompt & Sanitasi Post-Processing
- [ ] Buka `app/Services/Ai/CopilotService.php`.
- [ ] Perbarui `$systemPrompt`:
  - Tegaskan panduan: *Jika pengguna mencari kegiatan RKAS pada bulan tertentu (misal: "awal bulan Maret", "kegiatan bulan Juni"), panggil `search_rkas_activity` dengan parameter `bulan` yang sesuai.*
  - Tambahkan pedoman anti-teknis: *JANGAN PERNAH menampilkan kode pemrograman, query SQL, atau nama variabel internal (seperti $rkas_id, rkas_id, $spent, kode_rekening_id). Gunakan bahasa Indonesia formal penatausahaan keuangan.*
- [ ] Tambahkan method `sanitizeResponseText(string $text): string` di `CopilotService.php` untuk menyaring variabel berawalan `$` dan menyamarkan technical keys.
- [ ] Terapkan `sanitizeResponseText()` pada respons assistant sebelum dikembalikan di method `chat()`.

### Tahap 3: Pengujian & Verifikasi
- [ ] Jalankan scratch test script lokal untuk memverifikasi `searchRkasActivity(2026, '', 'reguler', 'Maret')` berhasil mengambil kegiatan bulan Maret (seperti "Kok Bulu Tangkis" dan "Honor pembina pramuka").
- [ ] Uji input berbahaya (SQL injection payload) untuk memastikan tidak terjadi query error dan input ditangani secara literal.
- [ ] Verifikasi bahwa sanitasi variabel berfungsi dengan baik.
- [ ] Jalankan `npm run build` dan komit ke git.
