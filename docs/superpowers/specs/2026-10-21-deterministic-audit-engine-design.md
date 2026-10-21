# Desain Sistem Audit Finansial BOSP: Hybrid Deterministic Engine & AI Narrator

**Tanggal:** 21 Oktober 2026  
**Status:** Approved  
**Topik:** Stabilisasi Konsistensi Hasil Audit Multi-Tab & Penghapusan Halusinasi AI  

---

## 1. Latar Belakang & Masalah
Pada implementasi sebelumnya, penentuan skor kepatuhan (`compliance_score`) dan daftar temuan diserahkan sepenuhnya kepada interpretasi Large Language Model (LLM DeepSeek Reasoner). Hal ini menyebabkan beberapa masalah kritis dalam aplikasi tata kelola keuangan sekolah:
1. **Fluktuasi Skor (Stochastic Inconsistency):** Data pembukuan yang sama dapat menghasilkan skor 0, lalu saat diaudit ulang menjadi 100, kemudian berubah lagi menjadi 80.
2. **Halusinasi Temuan:** AI terkadang mengarang temuan yang tidak ada di database atau sebaliknya menghapus pelanggaran riil yang telah terbukti secara matematis.
3. **Ketidaksesuaian Konteks Regulasi:** AI menafsirkan saldo kas bank Rp 0 akibat penarikan tunai yang sah sebagai defisit kejahatan, sehingga memberi skor 0 tanpa dasar yang benar.

Audit finansial dan akuntansi pemerintahan (BPK RI, BPKP, Inspektorat Daerah) menuntut sifat yang **objektif, deterministik, dapat direproduksi (reproducible), dan berbasis bukti fisik pembukuan**.

---

## 2. Arsitektur Solusi: Hybrid Deterministic Engine + AI Narrator

Arsitektur baru memisahkan tanggung jawab secara tegas antara **Mesin Evaluasi Sistem (PHP)** dan **Penyusun Narasi Opini (AI)**:

```
+-------------------------------------------------------------+
|                     1. DATABASE SIKAS                       |
|   (Buku Kas Umum, Pembantu Bank, Kas Tunai, Pajak, RKAS)    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|        2. MESIN DETERMINISTIK SISTEM PHP (HAKIM AUDIT)       |
|  - Rekonsiliasi mutasi & saldo fisik                        |
|  - Validasi batas regulasi (honor 50%, simpan tunai 10jt)   |
|  - Deteksi anomali (over-budget, tanpa BAST, tanpa NTPN)    |
|  - Hitung Skor Kepatuhan Pasti (100 - Penalti Baku)          |
|  - Generate Temuan Pasti (ID, Kategori, Bukti, Nominal)     |
+-------------------------------------------------------------+
                              |
       +----------------------+----------------------+
       | (Hasil Deterministik Pasti)                 |
       v                                             v
+-----------------------------+       +-----------------------------+
|   3. JIKA API KEY TERSEDIA  |       |   4. FALLBACK / TANPA API   |
|  AI DeepSeek Narrator:      |       |  Sistem Menggunakan         |
|  - Tulis Executive Summary  |       |  Narasi & Rekomendasi Baku  |
|  - Perkaya Deskripsi Kasus  |       |  (100% Siap Saji)           |
|  - Perkaya Rekomendasi Solusi|      +-----------------------------+
+-----------------------------+                      |
       |                                             |
       +----------------------+----------------------+
                              |
                              v
+-------------------------------------------------------------+
|               5. PENGUNCIAN HASIL & PENYIMPANAN             |
|  - Skor kepatuhan KUNCi dari hasil PHP                      |
|  - Jumlah & ID temuan 100% konsisten                        |
|  - Disimpan di tabel `bku_audit_logs` & Tampil di Modal/PDF |
+-------------------------------------------------------------+
```

---

## 3. Spesifikasi Komponen

### A. Mesin Deterministik (PHP System Engine)
1. **Perhitungan Skor Kepatuhan Baku:**
   - Skor Awal: `100`
   - Penalti:
     - `danger` (Risiko Temuan BPK Berat / Ketidakpatuhan Material): **-20 poin**  
       *Contoh: Selisih kas fisik vs buku > 0, Belanja over-budget, Belanja modal tanpa BAST, Potongan pajak tanpa NTPN, Saldo kas harian minus/defisit.*
     - `warning` (Peringatan Administrasi / Indikasi Pelanggaran Juknis): **-10 poin**  
       *Contoh: Belanja honor > 50%, Uang tunai brankas mengendap > 10jt, Belanja tunai > 10jt, Jasa giro bank belum dicatat.*
     - `info` (Catatan Pembinaan / Potensi Optimalisasi): **-2 poin**  
       *Contoh: Saldo bank mengendap besar, Sisa pagu anggaran menjelang tutup tahun.*
   - Formula:
     $$\text{compliance\_score} = \max(0, \min(100, 100 - \sum \text{penalti}))$$
   - **Karakteristik:** Jika data buku kas tidak mengalami perubahan, skor kepatuhan dijamin **100% identik dan tidak pernah berubah**.

2. **Daftar Temuan Baku (Deterministic Findings):**
   - Setiap scanner menghasilkan daftar temuan lengkap dengan:
     - `id`: Kode unik deterministik (contoh: `BANK-SALDO-MINUS`, `ROB-OVER-BUDGET`, `PAJAK-NO-NTPN`).
     - `category`: Klasifikasi akun/regulasi.
     - `severity`: `danger` | `warning` | `info`.
     - `title`: Judul temuan standar audit.
     - `description`: Deskripsi fakta kasus baku berbasis data.
     - `recommendation`: Rekomendasi konkrit operasional bawaan sistem.
     - `transaction_ref`: Rujukan tanggal, no bukti, rekening, atau uraian transaksi (bebas ID database).
     - `amount`: Nominal terkait (jika ada).

### B. Peran AI Narrator (DeepSeek Reasoner)
1. **Instruksi Prompt Baru:**
   - AI diberitahu bahwa:
     - Audit kepatuhan telah dinilai secara deterministik oleh sistem dengan skor $X/100$.
     - Temuan sebanyak $N$ butir telah dipastikan keabsahannya.
   - Tugas AI:
     - Menyusun **`executive_summary`** bergaya auditor BPK / Inspektorat Daerah dengan bahasa formal, objektif, dan proporsional terhadap skor $X$.
     - Memperkaya **`description`** dan **`recommendation`** untuk masing-masing temuan yang ada (1-to-1 match berdasarkan ID temuan).
   - AI **TIDAK DIIZINKAN**:
     - Mengubah atau meredesain `compliance_score`.
     - Menghapus temuan riil dari sistem.
     - Menambahkan temuan fiktif di luar data sistem.

### C. Penggabungan Respon (Merge Guard) di `BkuAuditOrchestrator`
```php
// Skor selalu dikunci dari kalkulasi deterministik
$finalScore = $preScan['compliance_score'];

// Temuan awal diperkaya teksnya jika AI merespons dengan baik
$finalFindings = [];
foreach ($preScan['pre_findings'] as $systemFinding) {
    $matchedAiFinding = $aiFindingsById[$systemFinding['id']] ?? null;
    $finalFindings[] = [
        'id' => $systemFinding['id'],
        'category' => $systemFinding['category'],
        'severity' => $systemFinding['severity'],
        'title' => $systemFinding['title'],
        'description' => $matchedAiFinding['description'] ?? $systemFinding['description'],
        'recommendation' => $matchedAiFinding['recommendation'] ?? $systemFinding['recommendation'],
        'transaction_ref' => $systemFinding['transaction_ref'] ?? null,
        'amount' => $systemFinding['amount'] ?? 0,
    ];
}
```

---

## 4. Keunggulan Arsitektur Baru
1. **100% Konsistensi Hasil:** Berapa kali pun tombol audit ditekan, skor kepatuhan dan daftar temuan tidak akan bergeser selama data pembukuan tidak diubah.
2. **Bebas Halusinasi (Zero Hallucination):** AI tidak bisa menuduh transaksi bodong atau membuat skor 0 tanpa ada pelanggaran di database.
3. **Resilience & Kecepatan:** Laporan audit langsung memiliki konten lengkap dan bermutu tinggi bahkan saat server AI lambat atau tanpa kuota API.
4. **Kepatuhan Terhadap Standar Pemeriksaan:** Bahasa yang dihasilkan AI tetap berbobot dan persuasif untuk membantu bendahara memahami risiko pemeriksaan.
