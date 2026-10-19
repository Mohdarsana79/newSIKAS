# SIKAS AI DeepSeek Suite — Fase 3: Asisten Diagnosa & Rekonsiliasi Sinkronisasi ARKAS (Desain Teknis)

**Status:** APPROVED  
**Tanggal:** 19 Oktober 2026  
**Penulis:** Tim Pengembang newSIKAS & Antigravity  
**Model AI:** DeepSeek-V3 (`deepseek-chat`)  

---

## 1. Latar Belakang & Problem Statement

Aplikasi `newSIKAS` terhubung erat dengan aplikasi desktop resmi Kementerian Pendidikan: **ARKAS** (Aplikasi Rencana Kegiatan dan Anggaran Sekolah). Database desktop ARKAS berupa file SQLite terenkripsi SQLCipher (`arkas.db`).

Dalam operasional harian bendahara sekolah, sering timbul friksi dan kendala rekonsiliasi data antara ARKAS dan newSIKAS, antara lain:
1. **Kegagalan Akses & Konektivitas File:** File `arkas.db` terkunci (file lock) karena aplikasi ARKAS desktop masih terbuka, file berada di path berbeda, atau kunci dekripsi tidak cocok.
2. **Perbedaan Pagu & Alokasi RKAS:** Jumlah pagu tahunan atau rincian kegiatan di RKAS ARKAS mengalami pergeseran/perubahan yang belum ditarik ke newSIKAS, atau SIKAS menolak penarikan karena sudah memiliki transaksi belanja BKU.
3. **Risiko Timpa Ulang (Overwrite) Transaksi BKU:** Saat bendahara ingin menarik BKU bulanan dari ARKAS, newSIKAS menerapkan *destructive overwrite* pada bulan yang ditarik. Bendahara sering ragu apakah data lokal akan hilang atau apakah angka di ARKAS sudah benar dan ditutup buku (`is_closed`).
4. **Selisih Angka & Belanja Belum Tercatat:** Terjadi selisih saldo tunai/bank atau nominal belanja antara ARKAS dan buku kas newSIKAS tanpa penjelasan yang mudah dipahami oleh bendahara.

**Fase 3** menghadirkan **Asisten Diagnosa & Rekonsiliasi Sinkronisasi ARKAS** bertenaga DeepSeek-V3 untuk menginspeksi diff data kedua sistem secara otomatis dan memberikan rekomendasi tindakan remediasi yang aman bagi bendahara.

---

## 2. Arsitektur Solusi & Komponen

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ANTARMUKA PENGGUNA (REACT)                    │
│                                                                        │
│  [Tab: Pusat Diagnosa AI]             [Modal: Tarik BKU / RKAS ARKAS]  │
│  di Halaman ArkasTools/Index.tsx      di Penatausahaan/Bku.tsx         │
│               │                                     │                  │
│               └──────────────────┬──────────────────┘                  │
│                                  │                                     │
│                     [ArkasDiagnosticModal.tsx]                         │
│                     - Status Banner (Healthy/Warning/Conflict)         │
│                     - Visual Diff Matrix (ARKAS vs SIKAS)              │
│                     - AI Reasoning & Overwrite Risk Analysis           │
│                     - Step-by-Step Remediation Checklist               │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ HTTP POST JSON
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (LARAVEL 13)                            │
│                                                                        │
│ [ArkasAiDiagnosticController]                                          │
│ └── api.arkas-ai.diagnose (Full System Audit)                          │
│ └── api.arkas-ai.diagnose-context (Contextual Month/RKAS Audit)        │
│                                                                        │
│ [ArkasDiagnosticService]                                               │
│ ├── 1. Health & Connection Scanner (Path, SQLite Decrypt, NPSN Match)  │
│ ├── 2. Cross-System Diff Extractor                                     │
│ │    ├── RKAS Diff (Pagu, Kegiatan, Alokasi Rp, Status Approve)        │
│ │    ├── BKU Diff (Bulan 1-12: Total Belanja, Nota, Is_Closed, Selisih)│
│ │    └── RefBarang Parity (Barang Baru, Perlu Update, Total)           │
│ └── 3. DeepSeek-V3 Cognitive Prompting                                 │
│      ├── Mengirim ringkasan diff terstruktur                           │
│      └── Menerima JSON: Status, Risk, Cause, Action Items              │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       [storage/app/arkas_engine]          [PostgreSQL SIKAS]
       - python.exe & dump_*.py            - penganggarans / rkas
       - SQLCipher query ke arkas.db       - buku_kas_umums / penerimaans
```

---

## 3. Spesifikasi Fungsional

### 3.1 Mode Diagnosa
Asisten mendukung 2 mode diagnosa:
1. **Comprehensive System Audit (Pusat Diagnosa):** Memeriksa seluruh spektrum data untuk tahun anggaran aktif (Koneksi arkas.db, Pagu RKAS Murni & Perubahan, Perbandingan BKU 12 Bulan, serta Paritas RefBarang).
2. **Contextual In-Modal Audit (Tarik Data):** Memeriksa secara instan saat bendahara membuka modal "Tarik BKU dari ARKAS" atau "Tarik RKAS", menganalisis selisih spesifik bulan atau anggaran tersebut sebelum bendahara mengambil keputusan timpa ulang.

### 3.2 Kategori Status Diagnosa
- `HEALTHY` (Hijau): Semua data sinkron, tidak ada risiko timpa data kritis, integritas file prima.
- `WARNING_DIFFERENCE` (Kuning): Terdapat selisih wajar (misal: ada 2 transaksi baru di ARKAS yang belum masuk ke SIKAS, atau bulan di ARKAS belum ditutup buku).
- `BLOCKED_CONFLICT` (Merah Muda/Rose): Penarikan berisiko tinggi menghapus transaksi lokal SIKAS yang belum ada di ARKAS, atau RKAS terkunci karena BKU sudah berjalan.
- `ERROR_CONNECTIVITY` (Merah): File `arkas.db` tidak ditemukan, terkunci oleh proses lain, atau korup.

### 3.3 Format Output AI (DeepSeek-V3)
Prompt AI mengharuskan DeepSeek-V3 mengembalikan format JSON yang ketat:
```json
{
  "overall_status": "WARNING_DIFFERENCE",
  "headline": "Terdapat Selisih Rp 4.500.000 pada BKU Bulan Maret & Status ARKAS Masih Draft",
  "connection_health": {
    "is_connected": true,
    "db_path": "C:/Users/.../AppData/Roaming/Arkas/arkas.db",
    "notes": "Database terbaca normal dan terdekripsi dengan kunci SQLCipher resmi."
  },
  "metrics_comparison": {
    "rkas": {
      "arkas_pagu": 120000000,
      "sikas_pagu": 120000000,
      "diff": 0,
      "status": "MATCH"
    },
    "bku_summary": {
      "total_arkas_belanja": 45000000,
      "total_sikas_belanja": 40500000,
      "diff": 4500000,
      "differing_months": ["Maret"]
    }
  },
  "overwrite_risks": [
    "Jika Anda menarik BKU Bulan Maret saat ini, 3 transaksi lokal SIKAS senilai Rp 1.200.000 akan dihapus permanen.",
    "Bulan Maret di ARKAS belum 'Tutup Buku' (status masih draft), sehingga angka di ARKAS masih berpotensi berubah."
  ],
  "root_causes": [
    "ARKAS memiliki 2 nota belanja tambahan pada tanggal 28 Maret yang belum dicatat di SIKAS.",
    "Terdapat pemotongan PPh 21 di SIKAS yang belum dibukukan pada ARKAS."
  ],
  "action_checklist": [
    {
      "step": 1,
      "system": "ARKAS",
      "action": "Buka aplikasi ARKAS desktop dan lakukan Tutup Buku untuk Bulan Maret jika seluruh SPJ sudah lengkap."
    },
    {
      "step": 2,
      "system": "SIKAS",
      "action": "Cadangkan catatan 3 nota lokal bulan Maret sebelum melakukan tarik ulang."
    },
    {
      "step": 3,
      "system": "SIKAS",
      "action": "Setelah ARKAS ditutup buku, jalankan tombol 'Tarik BKU dari ARKAS' dengan centang konfirmasi timpa ulang."
    }
  ]
}
```

---

## 4. Keamanan & Kebijakan Data (BYOK)
- Menggunakan API Key DeepSeek milik pengguna yang terenkripsi (`users.deepseek_api_key`).
- Hanya data ringkasan agregat, status, dan judul belanja yang dikirimkan ke model AI untuk diagnosa; kredensial dan data sensitif rekening bank sekolah tidak dikirim.
- Operasi rekonsiliasi bersifat **advisory** — AI tidak mengeksekusi penghapusan atau penimpaan database tanpa tindakan sadar dari bendahara.
