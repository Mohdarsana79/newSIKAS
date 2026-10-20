# Spesifikasi Desain: Integrasi Data RKAS Perubahan pada SIKAS AI Copilot

Dokumen ini mendefinisikan rancangan desain komprehensif untuk mengintegrasikan data perencanaan **RKAS Perubahan (Rencana Kegiatan dan Anggaran Sekolah Perubahan)** ke dalam **SIKAS AI Copilot**. Dengan integrasi ini, bendahara dan kepala sekolah dapat menanyakan status perubahan anggaran, pergeseran pagu per tahapan (Tahap 1 & 2), perbandingan rencana belanja murni vs perubahan, evaluasi kepatuhan batas regulasi BOSP, serta histori log pergeseran anggaran secara real-time dari database.

---

## 1. Latar Belakang & Masalah

Pada siklus anggaran BOSP sekolah, dokumen penganggaran mengalami dua fase penting:
1. **RKAS Awal / Murni**: Disusun pada awal tahun anggaran.
2. **RKAS Perubahan**: Disusun menjelang Tahap 2 (biasanya sekitar Juli–September) untuk mengakomodasi penyesuaian kebutuhan riil sekolah, sisa kas, atau pergeseran mata anggaran belanja.

Saat ini, di aplikasi SIKAS:
- Tabel `rkas_perubahans` dan `rekaman_perubahans` sudah terisi lengkap (misalnya pada tahun anggaran 2025 terdapat 137 item perubahan dengan 34 log rekaman perubahan).
- Namun, AI Copilot belum memiliki alat (*tools*) khusus untuk menyajikan gambaran eksekutif mengenai apa saja yang berubah antara RKAS Murni dan RKAS Perubahan, apakah belanja buku perpustakaan sudah memenuhi batas minimal 10%, apakah belanja honor melebihi batas 20%/40%, serta rincian kegiatan mana saja yang bertambah atau berkurang.

---

## 2. Arsitektur Solusi: Dual-Tool Architecture

Untuk menjaga pemisahan tanggung jawab (*Separation of Concerns*) dan efisiensi konsumsi *context window*, arsitektur dibagi menjadi 2 tool terdedikasi pada `app/Services/Ai/CopilotService.php`:

```
                           [ Pengguna / Bendahara ]
                                      │
                                      ▼
                             [ SIKAS AI Copilot ]
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
  [ get_rkas_perubahan_summary ]               [ get_rkas_perubahan_activities ]
  - Status Dokumen Perubahan                   - Filter: Bulan, Tahap, Kata Kunci
  - Komparasi Pagu Tahap 1 & 2                 - Filter Jenis: Berubah/Semua/Baru/Hapus
  - Operasi vs Modal                           - Rincian Vol & Tarif Murni vs Perubahan
  - Kepatuhan Batas Regulasi BOSP              - Selisih (+/-) & Status Pergeseran
  - Statistik & 5 Log Aksi Perubahan
```

---

## 3. Spesifikasi Definisi Tool

### 3.1. Tool 1: `get_rkas_perubahan_summary`

#### Definisi Function Calling:
- **Nama:** `get_rkas_perubahan_summary`
- **Deskripsi:** Mengambil ringkasan eksekutif dokumen perencanaan RKAS Perubahan pada tahun anggaran aktif. Menyajikan status ketersediaan dokumen perubahan, perbandingan alokasi pagu total & tahapan (Tahap 1 vs Tahap 2: Murni vs Perubahan vs Selisih), pergeseran belanja operasi vs belanja modal, indikator kepatuhan regulasi BOSP (belanja buku min 10%, honor max 20%/40%, pemeliharaan sarpras max 20%), statistik jumlah item yang bergeser, serta histori log rekaman perubahan terbaru. Panggil tool ini saat pengguna bertanya tentang ringkasan RKAS Perubahan, pergeseran anggaran tahun ini, evaluasi pagu perubahan, atau perbandingan umum RKAS Murni vs Perubahan.
- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "tahun": {
        "type": "integer",
        "description": "Tahun anggaran RKAS Perubahan (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini."
      }
    }
  }
  ```

#### Struktur Payload Response:
```json
{
  "tahun": 2025,
  "status_perubahan": true,
  "keterangan_status": "Dokumen RKAS Perubahan telah ditetapkan dan aktif di sistem.",
  "pagu_anggaran": 31320000,
  "komparasi_tahapan": {
    "total_anggaran": {
      "murni": 31320000,
      "perubahan": 31320000,
      "selisih": 0
    },
    "tahap_1": {
      "murni": 15660000,
      "perubahan": 15660000,
      "selisih": 0
    },
    "tahap_2": {
      "murni": 15660000,
      "perubahan": 15660000,
      "selisih": 0
    }
  },
  "komparasi_kelompok_belanja": {
    "belanja_operasi": {
      "murni": 28837000,
      "perubahan": 28837000,
      "selisih": 0
    },
    "belanja_modal": {
      "murni": 2483000,
      "perubahan": 2483000,
      "selisih": 0
    }
  },
  "kepatuhan_regulasi_bosp": {
    "belanja_buku": {
      "anggaran": 3132000,
      "persentase": 10.0,
      "ambang_batas": "Minimal 10%",
      "status": "Memenuhi",
      "catatan": "Anggaran belanja buku perpustakaan telah memenuhi batas minimal 10% dari total pagu."
    },
    "honorarium": {
      "anggaran": 6000000,
      "persentase": 19.16,
      "ambang_batas": "Maksimal 20% (Sekolah Negeri)",
      "status": "Memenuhi",
      "catatan": "Porsi honorarium tidak melebihi ambang batas maksimal regulasi BOSP."
    },
    "pemeliharaan_sarpras": {
      "anggaran": 4500000,
      "persentase": 14.37,
      "ambang_batas": "Maksimal 20%",
      "status": "Memenuhi",
      "catatan": "Anggaran pemeliharaan sarana dan prasarana dalam batas aman."
    }
  },
  "statistik_pergeseran": {
    "total_item_murni": 140,
    "total_item_perubahan": 137,
    "item_tetap": 115,
    "item_bertambah": 2,
    "item_berkurang": 4,
    "item_baru": 16,
    "item_dihapus": 19
  },
  "log_rekaman_terbaru": [
    {
      "tanggal": "15-08-2025 10:20",
      "aksi": "update",
      "keterangan": "Mengupdate data RKAS Perubahan: Makan Kegiatan Mkks"
    }
  ],
  "sekolah": {
    "nama": "SMP Muhammadiyah Soni",
    "status_sekolah": "Swasta"
  }
}
```

---

### 3.2. Tool 2: `get_rkas_perubahan_activities`

#### Definisi Function Calling:
- **Nama:** `get_rkas_perubahan_activities`
- **Deskripsi:** Mengambil rincian komparasi kegiatan antar dokumen RKAS Murni dan RKAS Perubahan pada tahun anggaran aktif. Menyajikan perbandingan volume, satuan, harga satuan, total alokasi murni vs perubahan, selisih anggaran, dan status pergeseran per kegiatan. Mendukung filter bulan, tahap, filter jenis perubahan (hanya item yang berubah, bertambah, berkurang, item baru, atau dihapus), serta pencarian kata kunci kegiatan. Panggil tool ini saat pengguna bertanya tentang kegiatan yang berubah di RKAS Perubahan, item belanja apa saja yang ditambah/dikurangi, atau rincian kegiatan RKAS Perubahan pada bulan tertentu.
- **Parameters:**
  ```json
  {
    "type": "object",
    "properties": {
      "tahun": {
        "type": "integer",
        "description": "Tahun anggaran RKAS Perubahan (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini."
      },
      "bulan": {
        "type": "string",
        "description": "Filter nama bulan alokasi (misal: 'September', 'November'). Opsional."
      },
      "tahap": {
        "type": "string",
        "enum": ["Tahap 1", "Tahap 2"],
        "description": "Filter tahapan anggaran ('Tahap 1' untuk Januari–Juni, 'Tahap 2' untuk Juli–Desember). Opsional."
      },
      "filter_perubahan": {
        "type": "string",
        "enum": ["berubah", "semua", "bertambah", "berkurang", "baru", "dihapus"],
        "description": "Kategori filter pergeseran: 'berubah' (default: hanya item yang mengalami perubahan), 'semua' (seluruh item termasuk yang tetap), 'bertambah', 'berkurang', 'baru', atau 'dihapus'."
      },
      "query": {
        "type": "string",
        "description": "Kata kunci nama kegiatan, rekening belanja, atau uraian barang (contoh: 'buku', 'spidol', 'sarpras'). Opsional."
      }
    }
  }
  ```

#### Struktur Payload Response:
```json
{
  "tahun": 2025,
  "filter": {
    "bulan": "September",
    "tahap": "Tahap 2",
    "filter_perubahan": "berubah",
    "query": null
  },
  "total_item_ditemukan": 3,
  "items": [
    {
      "no": 1,
      "bulan": "September",
      "kode_kegiatan": "03.05.01",
      "nama_kegiatan": "Pelaksanaan Kegiatan Belajar Mengajar",
      "kode_rekening": "5.1.02.01.01.0024",
      "nama_rekening": "Belanja Alat Tulis Kantor",
      "uraian": "Spidol Whiteboard",
      "murni": {
        "volume": 8,
        "satuan": "buah",
        "harga_satuan": 13000,
        "total": 104000
      },
      "perubahan": {
        "volume": 7,
        "satuan": "buah",
        "harga_satuan": 13000,
        "total": 91000
      },
      "selisih": -13000,
      "status": "Berkurang"
    }
  ]
}
```

---

## 4. Logika Perhitungan & Matching

### 4.1. Algoritma Matching Item (Composite Signature)
Untuk memetakan apakah suatu item pada RKAS Murni bergeser ke RKAS Perubahan:
```php
$makeSig = function($item) {
    return $item->kode_id . '|' . $item->kode_rekening_id . '|' . strtolower(trim($item->uraian)) . '|' . $item->bulan;
};
```
- Jika signature ada di RKAS Perubahan namun tidak ada di RKAS Murni: status = **`Baru (Ditambahkan)`**.
- Jika signature ada di RKAS Murni namun tidak ada di RKAS Perubahan: status = **`Dihapus dari Perubahan`**.
- Jika signature ada di kedua tabel:
  - `Total Perubahan > Total Murni`: status = **`Bertambah`**.
  - `Total Perubahan < Total Murni`: status = **`Berkurang`**.
  - `Total Perubahan == Total Murni`: status = **`Tetap`**.

### 4.2. Evaluasi Ambang Batas Regulasi BOSP (Permendikbudristek)
1. **Belanja Buku Teks / Perpustakaan (Min 10% Total Pagu)**:
   - Filter kegiatan dengan kode `05.02.%`, `02.02.%`, `03.02.%` atau uraian bertema buku/perpustakaan.
   - Status: jika `persentase >= 10.0%` -> `Memenuhi`, jika tidak -> `Belum Memenuhi (Kurang dari batas minimal 10%)`.
2. **Pembayaran Honorarium (Maks 20% Negeri / 40% Swasta)**:
   - Filter kegiatan kode `07.12.%` (Pembayaran Honor).
   - Ambang batas: dicek dari status sekolah (`Negeri` -> 20%, `Swasta` -> 40%).
   - Status: jika `persentase <= batas` -> `Memenuhi`, jika tidak -> `Melebihi Batas Maksimal`.
3. **Pemeliharaan Sarana dan Prasarana (Maks 20% Total Pagu)**:
   - Filter kegiatan kode `05.08.%`.
   - Status: jika `persentase <= 20.0%` -> `Memenuhi`, jika tidak -> `Melebihi Batas Maksimal`.

---

## 5. Pedoman Respon AI Copilot (System Prompt)

### 5.1. Nada Bicara & Penyajian
- Nada bicara santai, bersahabat, memanggil pengguna dengan sebutan akrab ("Bro", "Om", "Bos").
- Menggunakan tabel HTML rapi dan terstruktur untuk menyajikan angka.
- Menyoroti kegiatan-kegiatan strategis yang mengalami pergeseran anggaran (misalnya pengalihan dana ATK ke pembelian buku perpustakaan atau penambahan kuantitas kegiatan).

### 5.2. Format Tampilan Executive Summary
1. Header: `### EXECUTIVE SUMMARY: RKAS PERUBAHAN TAHUN {tahun}` `[BADGE: RESMI DITETAPKAN]`
2. Tabel Ringkasan Pagu & Tahapan (Pagu Total, Tahap 1, Tahap 2, Selisih Murni vs Perubahan).
3. Tabel Evaluasi Batas Regulasi BOSP (Buku, Honor, Pemeliharaan) dengan status kepatuhan.
4. Ringkasan Statistik Pergeseran (Jumlah item tetap, bertambah, berkurang, baru, dihapus).
5. 3–5 Log Terakhir Rekaman Perubahan yang dilakukan bendahara.

### 5.3. Format Tampilan Komparasi Kegiatan
1. Header: `### KOMPARASI PERGESERAN KEGIATAN RKAS PERUBAHAN` `[FILTER: {keterangan_filter}]`
2. Tabel Rincian Kegiatan HTML:
   `No | Bulan | Kode Rekening | Uraian Kegiatan / Barang | Anggaran Murni (Rp) | Anggaran Perubahan (Rp) | Selisih (Rp) | Status Pergeseran`
3. Catatan Analisis Cerdas mengenai kegiatan yang bergeser.

### 5.4. Kasus Dokumen Perubahan Belum Dibuat (`status_perubahan: false`)
- Jika sekolah belum menyusun RKAS Perubahan pada tahun tersebut, AI menjelaskan secara ramah bahwa sekolah masih menjalankan RKAS Murni awal tahun dan belum ada pergeseran anggaran yang disahkan. AI dapat menawarkan untuk menampilkan rencana RKAS Murni atau mengecek data tahun 2025 yang sudah memiliki dokumen perubahan resmi.

---

## 6. Rencana Verifikasi & Pengujian
1. **Verifikasi Data Nyata 2025 & 2026**:
   - Uji pemanggilan langsung method `get_rkas_perubahan_summary` pada tahun 2025 (pagu Rp 31.320.000, 137 item perubahan, 34 log perubahan).
   - Uji `get_rkas_perubahan_activities` dengan filter `berubah`, filter bulan `September`, dan filter kata kunci `buku`.
2. **Uji Kasus Nihil**:
   - Uji respon sistem pada tahun tanpa RKAS Perubahan.
3. **Uji Percakapan Interaktif (Chat Simulation)**:
   - Uji respon prompt natural pengguna:
     * "Bagaimana ringkasan RKAS Perubahan kita di tahun 2025 om?"
     * "Kegiatan apa saja yang berubah di RKAS Perubahan bulan September 2025?"
     * "Apakah anggaran buku kita di RKAS Perubahan 2025 sudah memenuhi minimal 10%?"
4. **Validasi Kode**:
   - `php -l app/Services/Ai/CopilotService.php` (tanpa error sintaks).
   - `vendor/bin/pint app/Services/Ai/CopilotService.php` (kode rapi standar PSR-12/Laravel).
