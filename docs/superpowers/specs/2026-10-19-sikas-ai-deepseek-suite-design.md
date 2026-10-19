# Rancangan Desain: SIKAS AI DeepSeek Suite (Kecerdasan Finansial BOSP Terpadu)

**Tanggal:** 2026-10-19  
**Status:** Disetujui (Approved)  
**Terkait:** Penatausahaan (BKU), Penutupan Kas, RKAS, ARKAS Sync, dan Profil Pengguna  

---

## 1. Ringkasan Eksekutif (Executive Summary)

**SIKAS AI DeepSeek Suite** adalah sistem kecerdasan finansial terpadu berbasis model AI **DeepSeek** (`deepseek-reasoner` / R1 dan `deepseek-chat` / V3) yang diintegrasikan langsung ke dalam alur kerja aplikasi **newSIKAS**. Sistem ini dirancang untuk menyelesaikan berbagai tantangan kritis bendahara sekolah dan kepala sekolah dalam pengelolaan dana BOSP (Bantuan Operasional Satuan Pendidikan), mulai dari pencegahan temuan audit BPK/Inspektorat, penyusunan draf transaksi BKU berbasis bahasa alami, pelaporan analitik eksekutif, hingga rekonsiliasi data dengan aplikasi desktop ARKAS Kemendikbud.

Sistem mengadopsi prinsip arsitektur **BYOK (Bring Your Own Key)**, di mana setiap pengguna/sekolah mengelola dan menyimpan kredensial API DeepSeek miliknya sendiri di dalam profil secara terenkripsi. Hal ini menjamin independensi pembiayaan API, privasi data sekolah, dan kontrol penuh pengguna.

---

## 2. Arsitektur Tingkat Tinggi (High-Level Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PROFIL PENGGUNA (BYOK)                           │
│   Input & Simpan Terenkripsi: DEEPSEEK_API_KEY & Pilihan Model AI      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   App\Services\Ai\DeepSeekService                      │
│   • Client HTTP Resmi (Timeout, Retry, Error Handling)                 │
│   • Routing Model: `deepseek-reasoner` (R1) & `deepseek-chat` (V3)      │
│   • Tool Calling & Function Execution Dispatcher                       │
│   • Token Caching & Hash Invalidation Guard                            │
└───────────┬───────────────────────┬───────────────────────┬────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────┐ ┌────────────────────────┐
│ PILAR 1: AUDIT        │ │ PILAR 2: AGENTIC  │ │ PILAR 3: TEXT-TO-      │
│ FORENSIK PENUTUPAN KAS│ │ COPILOT TRANSAKSI │ │ ANALYTICS & EKSEKUTIF  │
│ (DeepSeek-R1)         │ │ (DeepSeek-V3)     │ │ (DeepSeek-V3)          │
├───────────────────────┤ ├───────────────────┤ ├────────────────────────┤
│ • Pre-Closing Check   │ │ • Multi-step draft│ │ • Visualisasi Realisasi│
│ • Kas Minus/Kronologi │ │ • RKAS Balance Chk│ │ • Tanya-Jawab Keuangan │
│ • Pajak & NTPN Audit  │ │ • Dry-Run Preview │ │ • Narasi SPJ/LPJ       │
│ • Deteksi Split-Bill  │ │ • Auto-Tax Calc   │ └────────────────────────┘
│ • Cetak PDF Lembar RA │ └───────────────────┘
└───────────────────────┘           │
                                    ▼
                        ┌────────────────────────┐
                        │ PILAR 4: ARKAS SYNC    │
                        │ RECONCILIATION         │
                        ├────────────────────────┤
                        │ • Diagnosa Konflik DB  │
                        │ • Rekonsiliasi ID Pagu │
                        │ • Panduan Solusi Auto  │
                        └────────────────────────┘
```

---

## 3. Komponen & Pilar Fungsional

### Pilar 1: Mesin Audit Forensik & Kepatuhan Penutupan Kas (DeepSeek-R1)
* **Model:** `deepseek-reasoner` (R1 dengan *Chain-of-Thought* reasoning).
* **Lokasi Integrasi:** Tab Registrasi Penutupan Kas (`Rekapitulasi.tsx` tab `reg`).
* **Kebijakan Eksekusi:** *Advisori / Non-blocking* (menampilkan skor kepatuhan dan rekomendasi lengkap tanpa memblokir proses tutup kas).
* **5 Kategori Aturan Pemeriksaan:**
  1. **Keseimbangan Kas & Kronologi:** Deteksi saldo kas tunai/bank minus pada tanggal harian, pengeluaran mendahului penarikan bank, dan pelanggaran batas transaksi tunai non-tunai.
  2. **Kepatuhan Pajak:** Pajak terpotong tanpa nomor NTPN (belum disetor), transaksi belanja kena pajak yang luput dipungut, dan ketidaksesuaian tarif (PPN 11%, PPh 21/22/23).
  3. **Belanja Modal vs Habis Pakai:** Barang aset tetap (laptop, proyektor, mebel) yang keliru dicatat di Belanja Barang & Jasa Operasi, serta Belanja Modal yang belum dibuatkan dokumen BAST.
  4. **Indikasi Pemecahan Transaksi (*Split-Bill / Smurfing*):** Transaksi berulang ke rekanan yang sama pada tanggal berdekatan dengan nilai di bawah ambang batas lelang SIPLah atau batas potong pajak.
  5. **Kepatuhan Pagu RKAS:** Pengeluaran yang melampaui sisa pagu anggaran pada sub-rincian objek tahun berjalan.
* **Smart Caching:** Sistem memeriksa `updated_at` transaksi BKU terakhir pada bulan terkait. Jika belum ada revisi data sejak audit terakhir, sistem memuat langsung dari tabel `bku_audit_logs` (0 detik, tanpa memotong kuota API).
* **Output:** Modal interaktif dengan Gauge Skor (0-100), Ringkasan Eksekutif, Accordion Temuan per Kategori, tombol `[Unduh Lembar Kerja Audit (PDF)]`, dan tombol `[Audit Ulang]`.

### Pilar 2: Agentic Copilot Penatausahaan Transaksi (DeepSeek-V3)
* **Model:** `deepseek-chat` dengan kapabilitas *Tool Calling / Function Calling*.
* **Lokasi Integrasi:** Drawer / Floating Action Button di modul `Buku Kas Umum` dan `Kwitansi`.
* **Alur Eksekusi:**
  1. Pengguna memberikan instruksi bahasa alami (misal: *"Catat belanja konsumsi rapat evaluasi Rp 600.000 tunai ke Katering Berkah dari BOS Reguler"*).
  2. AI memanggil tools internal yang aman:
     * `lookup_rkas_balance(activity_name, variant)`
     * `check_cash_balance(variant)`
     * `calculate_tax(amount, item_type)`
  3. AI menyiapkan draf terstruktur (Kwitansi + Entri BKU + Uraian Detail).
  4. Menampilkan *Dry-Run Confirmation Dialog* di React UI. Transaksi hanya ditulis ke database setelah bendahara menekan tombol *"Konfirmasi & Simpan"*.

### Pilar 3: Text-to-Analytics & Tanya Jawab Keuangan Eksekutif (DeepSeek-V3)
* **Model:** `deepseek-chat` (analisis cepat dan terstruktur).
* **Lokasi Integrasi:** Halaman Dashboard Utama dan Tab Realisasi Anggaran.
* **Fungsi:**
  * Kepala Sekolah / Bendahara menanyakan performa keuangan (misal: perbandingan serapan belanja antar triwulan, pos belanja yang paling lambat terserap, sisa kas di rekening bank vs kas tunai).
  * AI mengeksekusi agregasi *read-only* pada skema realisasi keuangan SIKAS, kemudian merender ringkasan eksekutif dan komponen chart data visual.

### Pilar 4: Asisten Diagnosa & Rekonsiliasi ARKAS (DeepSeek-V3)
* **Model:** `deepseek-chat`.
* **Lokasi Integrasi:** Modul `ArkasToolController`.
* **Fungsi:**
  * Membaca log selisih sinkronisasi antara database SQLite ARKAS Kemendikbud dan PostgreSQL SIKAS.
  * Mendiagnosis penyebab perbedaan pagu, ID kegiatan yang tidak cocok di tahapan perubahan, atau item terhapus di tahapan v1/v2.
  * Memberikan saran perbaikan langkah-demi-langkah bagi operator sekolah.

---

## 4. Desain Skema Database & Migrasi

### 4.1. Perubahan Tabel `users`
Menambahkan kolom konfigurasi BYOK:
```sql
ALTER TABLE users ADD COLUMN deepseek_api_key TEXT NULL;
ALTER TABLE users ADD COLUMN deepseek_model_reasoner VARCHAR(50) DEFAULT 'deepseek-reasoner';
ALTER TABLE users ADD COLUMN deepseek_model_chat VARCHAR(50) DEFAULT 'deepseek-chat';
```
*Di Eloquent Model (`App\Models\User`), atribut `deepseek_api_key` menggunakan cast `'encrypted'` untuk enkripsi simetris bawaan Laravel.*

### 4.2. Tabel Baru: `bku_audit_logs`
Menyimpan riwayat hasil audit untuk jejak pemeriksaan (*audit trail*) dan mekanisme *caching*:
```sql
CREATE TABLE bku_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sekolah_id BIGINT NULL REFERENCES sekolahs(id) ON DELETE SET NULL,
    variant VARCHAR(30) NOT NULL DEFAULT 'reguler', -- reguler, kinerja, silpa, kinerja_silpa
    tahun INTEGER NOT NULL,
    bulan VARCHAR(20) NOT NULL,
    bulan_angka SMALLINT NOT NULL,
    penganggaran_id BIGINT NOT NULL,
    compliance_score SMALLINT NOT NULL DEFAULT 100, -- 0 s/d 100
    executive_summary TEXT NULL,
    findings JSONB NOT NULL DEFAULT '[]',
    rules_checked JSONB NOT NULL DEFAULT '[]',
    last_bku_updated_at TIMESTAMP NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bku_audit_logs_lookup ON bku_audit_logs(variant, tahun, bulan_angka, penganggaran_id);
```

**Struktur JSON Kolom `findings`:**
```json
[
  {
    "id": "FINDING-001",
    "category": "pajak",
    "severity": "warning",
    "title": "Pungutan Pajak Belum Disetor (Tanpa NTPN)",
    "description": "Terdapat pungutan PPh 22 sebesar Rp 45.000 pada transaksi Kuitansi No. 012 tanggal 14 Maret yang belum memiliki nomor NTPN.",
    "recommendation": "Segera lakukan penyetoran via e-Billing dan catat nomor NTPN sebelum tutup buku kas.",
    "transaction_ids": [142],
    "amount": 45000
  }
]
```

---

## 5. Rute & Endpoint API

### 5.1. Profil & BYOK API Key (`routes/web.php`)
* `POST /profile/deepseek-key` (`ProfileController@updateDeepSeekKey`): Menyimpan kunci API terenkripsi.
* `POST /profile/deepseek-test` (`ProfileController@testDeepSeekConnection`): Menguji validitas kunci API ke endpoint `/models` DeepSeek.

### 5.2. Audit Forensik Penutupan Kas (`routes/variant.php` - Multi-Variant Aware)
* `GET /api/bku-audit/status` (`BkuAuditController@getStatus`): Mengambil hasil audit tersimpan (cache) untuk bulan & tahun aktif.
* `POST /api/bku-audit/run` (`BkuAuditController@runAudit`): Menjalankan pemindaian hybrid (Pre-scan PHP + DeepSeek-R1 API) dan menyimpan ke database.
* `GET /bku-audit/pdf/{id}` (`BkuAuditController@exportPdf`): Mengunduh Lembar Kerja Hasil Audit AI dalam format PDF resmi.

### 5.3. Copilot & Analitik (`routes/variant.php`)
* `POST /api/ai/copilot/chat` (`AiCopilotController@chat`): Endpoint percakapan agentic untuk drafting transaksi dan query analitik keuangan.

---

## 6. Desain Layanan Backend (Service Layer)

### 6.1. `App\Services\Ai\DeepSeekService`
* Mengelola panggilan HTTP ke API DeepSeek (`https://api.deepseek.com`).
* Otentikasi dinamis menggunakan kunci API milik `Auth::user()`.
* Dukungan streaming dan non-streaming.
* Penanganan *rate limit*, *timeout* (hingga 60 detik untuk model reasoner), dan pesan kesalahan yang ramah pengguna jika kuota habis.

### 6.2. `App\Services\Ai\BkuAuditScanner`
* **Tahap 1 (Deterministic SQL Pre-Scan):**
  * Mengambil transaksi BKU bulan terkait via `BukuKasService` sesuai varian aktif (`reguler`, `kinerja`, dll).
  * Menghitung saldo harian running balance untuk mendeteksi kas minus.
  * Mengumpulkan transaksi dengan pajak terisi namun kolom NTPN kosong.
  * Mengelompokkan transaksi per nama rekanan yang frekuensinya berdekatan dengan nilai belanja < Rp 2.000.000.
  * Mengambil perbandingan realisasi vs sisa pagu RKAS sub-rincian objek.
* **Tahap 2 (Cognitive Reasoning Prompting):**
  * Mengirimkan data ringkas terstruktur (< 3.000 token) ke `deepseek-reasoner`.
  * Meminta model R1 melakukan evaluasi kewajaran uraian, belanja modal vs habis pakai, dan indikasi smurfing.
  * Memaksa model merespons dalam format JSON terstruktur yang divalidasi dengan skema ketat.

---

## 7. Desain Antarmuka Pengguna (UI/UX)

### 7.1. Pengaturan Profil (`resources/js/Pages/Profile/Partials/DeepSeekApiForm.tsx`)
* Input Password-Masking untuk DeepSeek API Key dengan toggle tampil/sembunyi.
* Dropdown pemilihan model default.
* Tombol *"Uji Koneksi"* dengan indikator status hijau/merah.

### 7.2. Tombol & Modal Pra-Audit di Tab Registrasi Penutupan Kas (`Rekapitulasi.tsx`)
* Tombol `[🔍 Pra-Audit AI (DeepSeek-R1)]` diletakkan di samping tombol Cetak Berita Acara.
* Badge status audit: Menampilkan skor kepatuhan terakhir (misal: *"Skor Audit: 94/100"*).
* Modal Interaktif Pra-Audit:
  * **Stepper Loading Visual:** 
    1. *Memindai data pembukuan & kas...*
    2. *Menganalisis regulasi & perpajakan...*
    3. *Penalaran audit mendalam DeepSeek-R1...*
  * **Gauge Skor Kepatuhan:** Lingkaran persentase berwarna (Hijau: 85-100, Kuning: 60-84, Merah: <60).
  * **Ringkasan Eksekutif:** Narasi formal ramah bendahara & auditor.
  * **Accordion Temuan:** Dikelompokkan per kategori dengan penanda badge *Bahaya (Merah)*, *Peringatan (Kuning)*, dan *Rekomendasi (Biru)*.
  * **Tombol Aksi:**
    * `[🔄 Audit Ulang]` (memaksa pemindaian baru jika data BKU baru saja diedit).
    * `[📄 Unduh Lembar Kerja Audit (PDF)]`.
    * `[Tutup & Lanjutkan Penutupan Kas]`.

### 7.3. Template PDF Lembar Kerja Pra-Audit (`resources/views/pdf/bku-audit-report.blade.php`)
* Format dokumen resmi A4:
  * Kop Surat Sekolah (NPSN, Alamat, Nama Sekolah).
  * Informasi Periode (Tahun Anggaran, Bulan, Varian Dana).
  * Kotak Skor Kepatuhan & Ringkasan Eksekutif.
  * Tabel Rincian Temuan & Rekomendasi Tindakan.
  * Kolom Tanda Tangan: Bendahara Pengeluaran BOSP dan Kepala Sekolah.

---

## 8. Penanganan Keamanan, Privasi, & Edge Cases

1. **Privasi Data Finansial:**
   * Informasi sensitif seperti nomor rekening bank atau NIK guru disanitasi/dimasking sebelum dikirim ke API AI.
2. **Ketiadaan API Key:**
   * Jika pengguna belum memasukkan API Key di profilnya, sistem menampilkan dialog panduan ramah yang mengarahkan bendahara ke menu profil untuk memasukkan API key DeepSeek mereka.
3. **Penanganan Batas Kuota & Timeout:**
   * Timeout disetel 60 detik. Jika koneksi API gagal atau kuota DeepSeek pengguna habis, sistem menampilkan pesan spesifik (*"Saldo kuota API DeepSeek Anda tidak mencukupi atau koneksi terputus. Silakan periksa saldo API di konsol DeepSeek Anda."*) tanpa merusak data aplikasi.
4. **Prinsip Non-Destruktif:**
   * Mesin audit berstatus *Read-Only* terhadap buku kas; tidak melakukan modifikasi atau penghapusan data transaksi secara otomatis tanpa persetujuan eksplisit bendahara.

---

## 9. Pentahapan Implementasi (Implementation Roadmap)

* **Fase 1 (Fondasi & Mesin Audit Forensik Penutupan Kas):**
  1. Migrasi database (`users.deepseek_api_key` & tabel `bku_audit_logs`).
  2. Implementasi UI Pengaturan Kunci API di `Profile/Edit.tsx`.
  3. Pembuatan `DeepSeekService` dan `BkuAuditScanner`.
  4. Pembuatan Controller `BkuAuditController` dan rute terkait.
  5. Pembangunan Modal Interaktif Pra-Audit di `Rekapitulasi.tsx`.
  6. Pembuatan Template PDF Lembar Kerja Audit.
* **Fase 2 (Agentic Copilot Transaksi & Text-to-Analytics):**
  7. Penyusunan Tool Calling Engine untuk pencatatan transaksi BKU/Kwitansi.
  8. Pembangunan antarmuka Copilot floating modal di Penatausahaan.
  9. Penyusunan query analitik eksekutif dan visualisasi di Dashboard.
* **Fase 3 (Asisten Diagnosa Rekonsiliasi ARKAS):**
  10. Integrasi diagnostik selisih sinkronisasi di `ArkasToolController`.
