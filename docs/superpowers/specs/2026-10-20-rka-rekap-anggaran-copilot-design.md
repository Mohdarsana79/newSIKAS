# Design Spec: Integrasi RKA Rekapitulasi Anggaran (RKAS Awal & Perubahan) ke AI Copilot SIKAS

## 1. Pendahuluan & Latar Belakang

Di aplikasi SIKAS, pada modul **Penganggaran (RKAS & RKAS Perubahan)**, terdapat tab laporan resmi bertajuk **"Rka Rekap"**. Dokumen ini merupakan ringkasan baku tata kelola anggaran sekolah (Formulir RKA Rekapitulasi Anggaran Belanja Berdasarkan Akun Permendagri) yang membagi anggaran sekolah ke dalam 3 bagian pokok:
1. **Bagian A: Penerimaan** (Sumber Dana Akun `4.3.1.01`, Total Pagu Anggaran).
2. **Bagian B: Rekapitulasi Anggaran Belanja** berdasarkan hierarki kode rekening akun belanja (`5`, `5.1`, `5.1.01`, `5.1.02`, `5.1.02.01`, `5.1.02.02`, `5.1.02.03`, `5.1.02.04`, `5.2`, `5.2.02`, `5.2.04`, `5.2.05`, Jumlah Belanja, dan Saldo Defisit/Surplus Rp 0).
3. **Bagian C: Rencana Pelaksanaan Anggaran per Tahap** (Pendapatan, Belanja Operasi, dan Belanja Modal yang dibagi ke Tahap 1 dan Tahap 2).

Pengguna menginginkan agar **AI Copilot** mampu menyajikan data RKA Rekap secara real-time, akurat, dan transparan untuk **RKAS Awal (Murni)**, **RKAS Perubahan**, maupun **Komparasi Keduanya (Murni vs Perubahan beserta Selisih)** secara otomatis.

---

## 2. Arsitektur Solusi & Komponen

```
[ Pengguna Chat di AI Copilot ]
               │
               ▼
[ CopilotService::chat ] ──► System Prompt & Tool Definition
               │
               ▼
[ Tool: get_rka_rekap_anggaran ]
   ├── Parameter: tahun, tipe_dokumen ('komparasi'|'murni'|'perubahan')
   ├── Query Eloquent:
   │    ├── Rkas (Murni) ──► where penganggaran_id
   │    └── RkasPerubahan ──► where penganggaran_id
   ├── Perhitungan Hierarki Akun Belanja (5, 5.1, 5.2, dst.)
   ├── Perhitungan Rencana per Tahap (Semester 1 / Jan-Jun vs Semester 2 / Jul-Des)
   └── Validasi Keseimbangan Anggaran (Penerimaan - Belanja = 0)
               │
               ▼
[ Formatted HTML Presentation di Copilot ]
   ├── Bagian A: Penerimaan Sumber Dana
   ├── Bagian B: Tabel Rekapitulasi Hierarki Belanja (Semua akun standar termasuk Rp 0)
   ├── Bagian C: Tabel Rencana Pelaksanaan Anggaran per Tahap
   └── Ulasan Analisis Pergeseran Ramah & Santai
```

---

## 3. Spesifikasi Tool: `get_rka_rekap_anggaran`

### 3.1. Definisi Tool Schema
- **Nama:** `get_rka_rekap_anggaran`
- **Deskripsi:** Mendapatkan rekapitulasi anggaran resmi (Formulir RKA Rekap) tahunan untuk RKAS Awal, RKAS Perubahan, atau Komparasi Murni vs Perubahan. Menyajikan Bagian A (Penerimaan), Bagian B (Hierarki Akun Belanja 5/5.1/5.2), dan Bagian C (Rencana Anggaran per Tahap 1 & 2).
- **Parameters:**
  * `tahun` (integer, required): Tahun anggaran (contoh: 2025).
  * `tipe_dokumen` (string, optional): Pilihan dokumen `'komparasi'` (default jika ada perubahan), `'murni'`, atau `'perubahan'`.

### 3.2. Hierarki Akun Belanja Resmi (Standar SIKAS / Permendagri)
Akun belanja yang dievaluasi mencakup:
1. `5` — BELANJA
2. `5.1` — BELANJA OPERASI
3. `5.1.01` — Belanja Pegawai
4. `5.1.02` — Belanja Barang dan Jasa
5. `5.1.02.01` — Belanja Barang
6. `5.1.02.02` — Belanja Jasa
7. `5.1.02.03` — Belanja Pemeliharaan
8. `5.1.02.04` — Belanja Perjalanan Dinas
9. `5.2` — BELANJA MODAL
10. `5.2.02` — Belanja Modal Peralatan dan Mesin
11. `5.2.04` — Belanja Modal Jalan, Jaringan, dan Irigasi
12. `5.2.05` — Belanja Modal Aset Tetap Lainnya (Buku Perpustakaan)

*Catatan Kepatuhan:* Seluruh akun standar di atas tetap dicantumkan pada output meskipun bernilai Rp 0, agar strukturnya konsisten dengan cetakan formulir resmi sekolah.

### 3.3. Struktur Return Data (Payload JSON)
```php
[
    'tahun' => 2025,
    'status_perubahan' => true,
    'mode_tampilan' => 'komparasi', // 'komparasi' | 'murni' | 'perubahan'
    'sekolah' => [
        'nama_sekolah' => 'SMP MUHAMMADIYAH SONI',
        'npsn' => '40202255',
        'sumber_dana' => 'BOSP Reguler',
    ],
    'bagian_a_penerimaan' => [
        'kode_rekening' => '4.3.1.01',
        'uraian' => 'BOSP Reguler',
        'murni' => 31320000.0,
        'perubahan' => 31320000.0,
        'selisih' => 0.0,
    ],
    'bagian_b_rekapitulasi_belanja' => [
        [
            'kode_rekening' => '5',
            'uraian' => 'BELANJA',
            'murni' => 31320000.0,
            'perubahan' => 31320000.0,
            'selisih' => 0.0,
            'level' => 1,
        ],
        // ... baris hierarki akun belanja lainnya ...
        [
            'kode_rekening' => '',
            'uraian' => 'JUMLAH BELANJA',
            'murni' => 31320000.0,
            'perubahan' => 31320000.0,
            'selisih' => 0.0,
            'level' => 1,
        ],
        [
            'kode_rekening' => '',
            'uraian' => 'DEFISIT / SURPLUS',
            'murni' => 0.0,
            'perubahan' => 0.0,
            'selisih' => 0.0,
            'status' => 'Seimbang (Rp 0)',
        ],
    ],
    'bagian_c_rencana_per_tahap' => [
        [
            'no' => '1',
            'uraian' => 'Pendapatan',
            'murni' => ['tahap1' => 15660000.0, 'tahap2' => 15660000.0, 'total' => 31320000.0],
            'perubahan' => ['tahap1' => 15660000.0, 'tahap2' => 15660000.0, 'total' => 31320000.0],
            'selisih' => ['tahap1' => 0.0, 'tahap2' => 0.0, 'total' => 0.0],
        ],
        [
            'no' => '2.1',
            'uraian' => 'Belanja Operasi',
            'murni' => ['tahap1' => 14860000.0, 'tahap2' => 15660000.0, 'total' => 30520000.0],
            'perubahan' => ['tahap1' => 14860000.0, 'tahap2' => 13977000.0, 'total' => 28837000.0],
            'selisih' => ['tahap1' => 0.0, 'tahap2' => -1683000.0, 'total' => -1683000.0],
        ],
        [
            'no' => '2.2',
            'uraian' => 'Belanja Modal',
            'murni' => ['tahap1' => 800000.0, 'tahap2' => 0.0, 'total' => 800000.0],
            'perubahan' => ['tahap1' => 800000.0, 'tahap2' => 1683000.0, 'total' => 2483000.0],
            'selisih' => ['tahap1' => 0.0, 'tahap2' => 1683000.0, 'total' => 1683000.0],
        ],
        [
            'no' => '',
            'uraian' => 'Total Belanja',
            'murni' => ['tahap1' => 15660000.0, 'tahap2' => 15660000.0, 'total' => 31320000.0],
            'perubahan' => ['tahap1' => 15660000.0, 'tahap2' => 15660000.0, 'total' => 31320000.0],
            'selisih' => ['tahap1' => 0.0, 'tahap2' => 0.0, 'total' => 0.0],
        ],
    ],
    'ringkasan_analisis' => [
        'pagu_total' => 31320000.0,
        'pergeseran_operasi_ke_modal' => 1683000.0,
        'catatan' => 'Pagu anggaran tetap seimbang Rp 31.320.000. Terjadi pergeseran anggaran sebesar Rp 1.683.000 pada Tahap 2 dari Belanja Operasi ke Belanja Modal Aset Tetap Lainnya/Buku.',
    ],
]
```

---

## 4. Penyajian Format Respon AI Copilot

Ketika pengguna menanyakan:
- *"Tampilkan RKA Rekap tahun 2025"*
- *"Bagaimana rekapitulasi anggaran RKAS awal vs perubahan kita?"*
- *"Tampilkan rekapitulasi anggaran per tahapan dan per akun belanja"*

AI Copilot menyajikan response dengan format rapi:
1. **Header:** `### REKAPITULASI ANGGARAN (RKA REKAP) TAHUN {tahun}` dengan badge status `[MODE: KOMPARASI RKAS MURNI VS PERUBAHAN]` atau `[DOKUMEN: RKAS PERUBAHAN]`.
2. **Bagian A: Penerimaan (Sumber Dana):**
   Tabel ringkas: Kode Rekening, Sumber Dana, RKAS Murni, RKAS Perubahan, Selisih.
3. **Bagian B: Rekapitulasi Anggaran Belanja (Hierarki Akun):**
   Tabel HTML: Kode Rekening, Uraian, RKAS Murni (Rp), RKAS Perubahan (Rp), Selisih (Rp).
   Lengkap dengan baris JUMLAH BELANJA dan DEFISIT/SURPLUS (Rp 0 / Seimbang).
4. **Bagian C: Rencana Pelaksanaan Anggaran per Tahap:**
   Tabel HTML: No, Uraian, Tahap 1, Tahap 2, Total, dengan komparasi Murni vs Perubahan.
5. **Catatan Analisis:**
   Penjelasan santai yang mengulas titik pergeseran dana (misalnya pergeseran Rp 1.683.000 dari Belanja Jasa/Barang ke Belanja Modal Buku di Tahap 2).

---

## 5. Rencana Pengujian (Test Plan)

1. **Uji Unit Tool PHP:**
   - Memanggil `executeTool('get_rka_rekap_anggaran', ['tahun' => 2025, 'tipe_dokumen' => 'komparasi'], 'reguler', 2025)`.
   - Memastikan:
     * Bagian A: Penerimaan Rp 31.320.000 seimbang.
     * Bagian B: Belanja Operasi turun Rp 1.683.000 (dari Rp 30.520.000 menjadi Rp 28.837.000), Belanja Modal naik Rp 1.683.000 (dari Rp 800.000 menjadi Rp 2.483.000).
     * Bagian C: Tahap 1 tetap seimbang di Rp 15.660.000, Tahap 2 tetap seimbang di Rp 15.660.000.
2. **Uji Dokumen Tunggal (Murni & Perubahan):**
   - Memanggil dengan `tipe_dokumen = 'murni'` dan `tipe_dokumen = 'perubahan'`.
3. **Uji Live Chat dengan DeepSeek API:**
   - Menguji chat langsung pengguna bertanya *"Tampilkan RKA Rekapitulasi Anggaran 2025 kita om"* dan memvalidasi output HTML tabel.
