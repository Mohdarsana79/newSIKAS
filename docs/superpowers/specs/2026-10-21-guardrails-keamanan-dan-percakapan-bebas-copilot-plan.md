# Rencana Implementasi: Guardrails Keamanan, Percakapan Bebas, dan Kejujuran Data pada SIKAS AI Copilot

- **Tanggal**: 21 Oktober 2026
- **Status**: Ready for Implementation
- **Dokumen Desain Referensi**: `docs/superpowers/specs/2026-10-21-guardrails-keamanan-dan-percakapan-bebas-copilot-design.md`

---

## 1. Ikhtisar & Sasaran

Mengimplementasikan tiga kemampuan kunci pada SIKAS AI Copilot:
1. **Percakapan Bebas Multitopik (Conversational Freedom)**: Memungkinkan pengguna mengajak AI berdiskusi santai, bertanya pengetahuan umum, regulasi juknis BOSP, rumus akuntansi, tips perpajakan, maupun obrolan sehari-hari dengan gaya bahasa santai dan bersahabat khas rekan kerja (*"Om"* / *"Pak Bendahara"*).
2. **Batasan Keamanan Ketat (Strict Security Guardrails)**: Memastikan AI menolak dengan ramah namun tegas segala upaya permintaan kode sumber aplikasi, pembocoran stack teknologi, SQL injection, permintaan membuatkan koding/software, serta trik prompt injection / jailbreak.
3. **Kejujuran Data & Penanganan Data Tidak Ditemukan (Data Honesty & Graceful Apology)**: Memastikan AI meminta maaf secara tulus dan jujur apabila data yang dicari tidak ditemukan di sistem SIKAS, tidak pernah mengarang data palsu, serta memberikan rekomendasi solusi yang membantu bendahara.
4. **Proteksi Berlapis Backend (Defense-in-Depth Sanitizer)**: Memperkuat method `sanitizeResponseText()` di `CopilotService.php` agar secara proaktif membersihkan potensi kebocoran blok kode atau query database mentah.

---

## 2. Tahapan Eksekusi

### Langkah 1: Pembaruan `buildSystemPrompt()` pada `CopilotService.php`
- **File**: `app/Services/Ai/CopilotService.php`
- Perbarui Bagian 1 (Karakter & Gaya Bicara):
  - Tambahkan pedoman bahwa AI bisa diajak bicara bebas tentang apapun (pengetahuan umum, akuntansi, juknis, sapaan santai, diskusi sehari-hari) tanpa harus selalu memanggil tool jika tidak memerlukan data database.
- Perbarui Bagian 4 (Batasan Keamanan & Guardrails):
  - Larangan pembocoran kode sumber aplikasi (PHP, Blade, TypeScript, React, SQL, controller, model).
  - Larangan pembocoran stack internal (versi framework, kredensial DB, path direktori server, file environment).
  - Larangan melayani SQL injection, pengujian penetrasi, peretasan, atau aktivitas bermaksud jahat.
  - Larangan diminta membuatkan koding / program software eksternal (menolak sopan bahwa peran utamanya adalah asisten keuangan BOSP).
  - Sertakan template penolakan ramah dan santai khas sahabat kerja bendahara.
- Tambahkan Bagian 13 (Kejujuran Data & Penanganan Data Tidak Ditemukan):
  - Kewajiban meminta maaf secara jujur dan transparan jika data tidak tercatat di sistem.
  - Larangan keras mengarang angka, kuitansi, atau transaksi fiktif.
  - Kewajiban menyajikan rekomendasi/alternatif solutif bagi bendahara.

### Langkah 2: Penguatan Sanitizer Backend pada `CopilotService.php`
- **File**: `app/Services/Ai/CopilotService.php`
- Tingkatkan fungsi `sanitizeResponseText()` untuk:
  - Menyensor blok kode pemrograman (misalnya pembuka tag `<?php`, `namespace App\`, `class ... extends`).
  - Menyensor sintaks SQL query destruktif atau eksekusi database mentah.
  - Mencegah kebocoran struktur data teknis internal.

### Langkah 3: Pembuatan Unit Test
- **File**: `tests/Unit/CopilotGuardrailsAndFreedomTest.php`
- Buat rangkaian pengujian yang memverifikasi:
  - System prompt memuat instruksi percakapan bebas dan multitopik.
  - System prompt memuat larangan pembocoran kode sumber, stack aplikasi, SQL injection, dan pembuatan koding.
  - System prompt memuat pedoman kejujuran data dan permintaan maaf saat data nihil.
  - Sanitizer `sanitizeResponseText()` membersihkan tag `<?php`, blok kode, dan variabel internal.

### Langkah 4: Pengujian & Linter
- Jalankan unit test: `php artisan test --filter=CopilotGuardrailsAndFreedomTest`.
- Jalankan seluruh unit test suite: `php artisan test tests/Unit`.
- Format kode menggunakan `vendor/bin/pint`.

### Langkah 5: Commit & Code Review
- Commit perubahan ke Git.
- Lakukan peninjauan dua arah (Standards & Spec).
