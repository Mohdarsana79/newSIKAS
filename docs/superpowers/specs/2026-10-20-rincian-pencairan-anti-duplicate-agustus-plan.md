# Rencana Implementasi: Pencegahan Duplikasi Transaksi Rincian Pencairan Bulanan (Bulan Agustus Tepat 5 Transaksi Rp 1.286.000)

- **Tanggal**: 2026-10-20
- **Status**: Siap Dijalankan
- **Dokumen Desain**: `docs/superpowers/specs/2026-10-20-rincian-pencairan-anti-duplicate-agustus-design.md`

---

## Tahapan Pekerjaan

### Langkah 1: Pengurutan Kronologis & Pengelompokan Data Bulanan di `CopilotService.php`
1. **Pengurutan Kronologis Bulan Resmi**:
   - Di method `getRincianPencairan()`, urutkan koleksi transaksi `$filtered` secara kronologis berdasarkan indeks 12 bulan resmi BOSP: `Januari` (1) s.d. `Desember` (12), lalu berdasarkan `id`.
2. **Penomoran Urut Lokal per Bulan (`no_bulan`)**:
   - Saat membentuk array `$mappedItems`, tambahkan field `'no_bulan'` (urutan 1..N di bulan tersebut, contoh: 1..5 untuk bulan Agustus).
3. **Pengelompokan `items_per_bulan`**:
   - Bentuk array asosiatif `$itemsPerBulan` yang mengelompokkan baris transaksi per nama bulan (`'Agustus' => [...]`, `'September' => [...]`).
   - Sertakan `'items_per_bulan' => $itemsPerBulan` dalam return payload tool `get_rincian_pencairan`.

---

### Langkah 2: Penguncian Instruksi Anti-Duplikasi pada System Prompt AI (`CopilotService.php`)
1. **Aturan Tegas Pemanggilan Filter Bulan**:
   - Di `buildSystemPrompt()`, perjelas instruksi:
     - Jika pengguna meminta rincian transaksi pencairan/belanja pada bulan tertentu (seperti Agustus):
       - AI **WAJIB** memanggil `get_rincian_pencairan(bulan: '{nama_bulan}')`.
       - Jumlah baris pada tabel rincian transaksi **WAJIB SAMA PERSIS** dengan `jumlah_transaksi` (khusus Agustus: tepat 5 transaksi dengan total bruto Rp 1.286.000).
       - AI **DILARANG KERAS** menduplikasi kegiatan yang memiliki kesamaan nomor kuitansi atau uraian (seperti Insentif Pembina Ekstrakurikuler Pramuka) dan dilarang menyisipkan data dari bulan lain.

---

### Langkah 3: Pengujian & Validasi
1. **Unit Test Backend**:
   - Buat skrip pengujian untuk memverifikasi:
     - `getRincianPencairan(bulan: 'Agustus')` menghasilkan tepat 5 items.
     - Pramuka hanya muncul tepat 1 kali.
     - Penomoran `no_bulan` terisi 1 sampai 5.
     - Total bruto klop Rp 1.286.000.
2. **Live Test Multi-Turn DeepSeek API**:
   - Uji skenario interaksi:
     - Query langsung: *"rincian transaksi pencairan belanja bulan agustus"*
     - Query multi-turn: *"minta rincian pencairan perbulan"* dilanjutkan *"coba tampilkan rincian transaksi pencairan bulan agustus"*
     - Verifikasi tabel Agustus memiliki tepat 5 baris, tanpa duplikasi Pramuka.
3. **Pint Code Style Check & Git Commit**:
   - Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php`.
   - Lakukan git commit.
