# Desain Teknis: Integrasi Data ARKAS Tools ke SIKAS AI Copilot

**Tanggal:** 2026-10-21  
**Status:** Approved by User  
**Topik:** Integrasi Data Master Acuan Barang / SSH ARKAS dan Diagnosa Sinkronisasi ARKAS Desktop ke dalam AI Copilot  

---

## 1. Latar Belakang & Tujuan

Aplikasi SIKAS telah memiliki fitur **Arkas Tools** yang memuat:
1. **Katalog Referensi Barang & Standar Satuan Harga (SSH) ARKAS**: Lebih dari 76.000 item acuan barang resmi dari aplikasi desktop ARKAS (`ref_acuan_barang` di SQLite terenkripsi SQLCipher atau tabel `ref_barangs` di PostgreSQL lokal).
2. **Diagnosa & Rekonsiliasi ARKAS Desktop (`ArkasDiagnosticService`)**: Pengecekan kesehatan koneksi `arkas.db`, perbandingan pagu RKAS Murni & Perubahan, serta audit rekonsiliasi Buku Kas Umum (BKU) bulanan antara SIKAS dan ARKAS desktop.

Sebelumnya, AI Copilot belum memiliki tools untuk membaca data acuan barang ARKAS dan status diagnosa ARKAS secara langsung. Dengan fitur baru ini:
- Bendahara dapat menanyakan harga acuan/batas atas (SSH) barang di ARKAS secara real (misal: "Berapa batas atas harga laptop Core i5 di ARKAS?", "Cek harga standar semen di ARKAS", atau "Saya ingin beli kertas HVS seharga Rp 60.000, apakah aman sesuai SSH ARKAS?").
- Bendahara dapat menanyakan kesehatan koneksi dan rekonsiliasi selisih data antara SIKAS dan ARKAS desktop secara real (misal: "Coba cek status koneksi ARKAS", "Apakah BKU SIKAS sudah klop sama ARKAS?", "Ada selisih apa di bulan Agustus?").

---

## 2. Arsitektur & Strategi Data

```
+-----------------------------------------------------------------------------------+
|                                 SIKAS AI Copilot                                  |
|                            (CopilotService.php)                                   |
+-----------------------------------------------------------------------------------+
           |                                                   |
           v [Tool 1]                                          v [Tool 2]
+--------------------------------------+      +-------------------------------------+
|   search_arkas_reference_item        |      |      diagnose_arkas_integration     |
+--------------------------------------+      +-------------------------------------+
     |                     |                                     |
     v                     v (Fallback jika kosong)              v
+---------------+     +------------------+            +-----------------------------+
|  PostgreSQL   |     | Python Engine    |            | ArkasDiagnosticService.php  |
| (ref_barangs) |     | (query.py)       |            +-----------------------------+
+---------------+     +------------------+                           |
                               |                                     v
                               v                              +---------------------+
                    +--------------------+                    | Python Engine       |
                    |      arkas.db      |<-------------------| (diagnose_arkas.py) |
                    | (SQLite SQLCipher) |                    +---------------------+
                    +--------------------+
```

### 2.1. Sinkronisasi Awal Data Acuan Barang ke PostgreSQL
- Dibuat Artisan Command `php artisan arkas:sync-catalog` untuk mengekstrak 76.168 item acuan barang dari `arkas.db` ke tabel `ref_barangs` dengan teknik *upsert* dan batch chunking (5.000 baris per batch).
- Ditambahkan index database pada `(tahun, nama_barang)` dan `nama_barang` untuk menjamin pencarian ILIKE di PostgreSQL berjalan di bawah 20 ms.

### 2.2. Strategi Dual Layer (Local DB + Live Fallback)
- **Primary Source**: Query PostgreSQL pada `ref_barangs` (kecepatan tinggi).
- **Secondary Fallback**: Jika tabel `ref_barangs` masih kosong atau belum disinkronkan, method otomatis memanggil Python script `storage/app/arkas_engine/query.py` secara langsung ke file `arkas.db`.

---

## 3. Spesifikasi Tools AI Copilot

### 3.1. Tool 1: `search_arkas_reference_item`
- **Fungsi:** Mencari standar satuan harga (SSH) dan katalog acuan barang resmi ARKAS.
- **Parameter Input:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `query` | string | Ya | Nama barang, jasa, atau spesifikasi acuan (contoh: "kursi", "laptop", "kertas hvs", "printer", "konsumsi"). |
  | `estimasi_harga` | number | Tidak | Perkiraan harga satuan perolehan dalam Rupiah untuk dievaluasi terhadap batas atas SSH resmi. |
  | `tahun` | integer | Tidak | Tahun anggaran acuan ARKAS (default: tahun aktif, misal 2026). |
  | `kode_rekening` | string | Tidak | Filter kode rekening belanja spesifik jika ingin mempersempit hasil. |
  | `limit` | integer | Tidak | Batas jumlah item teratas (default: 10, maksimal: 25). |

- **Output JSON Structure:**
  ```json
  {
    "query": "kursi",
    "tahun": 2026,
    "found_count": 35,
    "source": "local_database",
    "summary": {
      "harga_terendah": 350000,
      "harga_tertinggi": 37466000,
      "rata_rata": 4500000
    },
    "evaluasi_kewajaran": {
      "estimasi_harga": 750000,
      "status": "DI_BAWAH_BATAS_SSH_AMAN",
      "catatan": "Harga satuan berada di bawah pagu batas atas acuan ARKAS."
    },
    "items": [
      {
        "nama_barang": "Kursi guru",
        "kode_rekening": "5.2.02.05.02.0001",
        "rekening": "Belanja Modal Mebel",
        "satuan": "Unit",
        "batas_atas": 500000,
        "tahun": 2026
      }
    ]
  }
  ```

### 3.2. Tool 2: `diagnose_arkas_integration`
- **Fungsi:** Menjalankan audit dan diagnosa sistem komprehensif atau kontekstual antara SIKAS dan aplikasi desktop ARKAS.
- **Parameter Input:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `scope` | string | Ya | Cakupan diagnosa: `comprehensive` (seluruh sistem), `bku_month` (audit BKU bulan tertentu), atau `rkas` (audit pagu RKAS). Default: `comprehensive`. |
  | `bulan` | string | Tidak | Nama bulan (Januari s.d. Desember) jika `scope` adalah `bku_month`. |
  | `tahun` | integer | Tidak | Tahun anggaran diagnosa (default: tahun aktif). |

- **Output JSON Structure:**
  ```json
  {
    "scope": "comprehensive",
    "tahun": 2026,
    "variant": "reguler",
    "connection_health": {
      "status": "HEALTHY",
      "db_path": "C:/Users/.../AppData/Roaming/Arkas/arkas.db",
      "db_size_mb": 14.2,
      "last_modified": "2026-10-21 07:10:00",
      "cipher_unlocked": true
    },
    "rkas_comparison": {
      "is_balanced": true,
      "pagu_sikas": 250000000,
      "pagu_arkas": 250000000,
      "selisih": 0
    },
    "bku_comparison": {
      "is_all_synced": false,
      "months": [
        {
          "bulan": "Agustus",
          "sikas_pengeluaran": 29000000,
          "arkas_pengeluaran": 29000000,
          "selisih": 0,
          "status": "KLOP"
        }
      ],
      "unmatched_transactions_count": 0
    },
    "recommendations": [
      "Koneksi database ARKAS desktop terhubung dan sehat. Tidak ditemukan selisih pagu RKAS."
    ]
  }
  ```

---

## 4. Format Penyajian Respons AI Copilot (System Prompt Bagian 8 & 9)

### 4.1. Katalog & Standar Satuan Harga (SSH) ARKAS
- **Gaya Bahasa:** Santai, akrab ("Om", "Bos").
- **Tabel HTML:**
  - Header tabel: `No`, `Nama Barang Acuan ARKAS`, `Kode Rekening`, `Nama Akun Belanja`, `Satuan`, `Batas Atas Harga (SSH) (Rp)`, `Status Evaluasi`.
  - Nominal harga rata kanan (format Rupiah resmi).
- **Klausul Evaluasi Kewajaran:**
  - Jika estimasi harga di bawah batas atas SSH: Berikan catatan bahwa harga belanja aman dan sesuai standar satuan harga daerah/ARKAS.
  - Jika melebihi batas atas SSH: Berikan peringatan ramah bahwa harga yang direncanakan melampaui SSH resmi ARKAS sehingga berisiko ditolak sistem saat sinkronisasi SPJ.

### 4.2. Diagnosa Integrasi Sistem ARKAS
- **Header:** `### 🛡️ DIAGNOSA INTEGRASI SIKAS & APLIKASI DESKTOP ARKAS`
- **Badge Status:** `[STATUS KONEKSI: SEHAT & AKTIF]` atau `[STATUS: PERLU REKONSILIASI]`
- **Tabel Pagu RKAS:** Menampilkan Pagu SIKAS vs Pagu ARKAS beserta status seimbang.
- **Tabel Status BKU Bulanan:** Menampilkan perbandingan per bulan (Bulan, Belanja SIKAS, Belanja ARKAS, Selisih, Status Klop/Beda).
- **Daftar Kuitansi Selisih:** Jika ada transaksi yang belum ada di ARKAS atau sebaliknya.
- **Langkah Tindakan:** Rekomendasi solusi santai bagi bendahara untuk menarik data atau menutup BKU.

---

## 5. Rencana Pengujian
1. **Unit Test Backend**:
   - Uji Artisan Command `arkas:sync-catalog` untuk memastikan batch upsert berjalan tanpa error memori dan tabel `ref_barangs` terisi 76.168 baris.
   - Uji method `searchArkasReferenceItem()` dengan pencarian kata kunci "kursi", "laptop", dan evaluasi harga batas atas.
   - Uji method `diagnoseArkasIntegration()` dengan pemanggilan `ArkasDiagnosticService`.
2. **Live AI Test dengan DeepSeek**:
   - Prompt uji 1: *"Coba cek berapa batas atas harga laptop di ARKAS, apakah beli laptop 7 juta aman?"*
   - Prompt uji 2: *"Coba cek status koneksi ARKAS dan apakah BKU kita sudah klop dengan aplikasi ARKAS?"*
   - Memastikan AI memanggil tools yang tepat dan menyajikan tabel HTML yang rapi.
