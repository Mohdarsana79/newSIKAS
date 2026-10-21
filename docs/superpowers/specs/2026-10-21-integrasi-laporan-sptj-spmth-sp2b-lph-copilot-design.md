# Spesifikasi Desain: Integrasi Data Laporan SPTJ, SPMTH, SP2B, dan LPH pada SIKAS AI Copilot

- **Tanggal**: 21 Oktober 2026
- **Status**: Disetujui
- **Topik**: Penyiapan Data & Integrasi Laporan Resmi Pertanggungjawaban BOSP (SPTJ, SPMTH, SP2B, LPH) ke SIKAS AI Copilot

---

## 1. Latar Belakang & Masalah

Pengguna (Om Moh Gian Darsana / Bendahara BOSP) membutuhkan kemampuan bagi SIKAS AI Copilot untuk menyajikan data laporan pertanggungjawaban resmi sekolah:
1. **SPTJ** (Surat Pernyataan Tanggung Jawab Belanja / Mutlak).
2. **SPMTH** (Surat Pernyataan Mutlak Tanggung Jawab Hibah / Penerimaan).
3. **SP2B** (Surat Permintaan Pengesahan Belanja / Pendapatan dan Belanja).
4. **LPH** (Laporan Penggunaan Hibah BOSP).

Saat ini, Copilot telah memiliki integrasi untuk Buku Kas Umum (BKU), Buku Pembantu (Bank, Tunai, Pajak, ROB, Register Penutupan Kas, Berita Acara), RKAS (Murni & Perubahan, 221, BOS-K3), Dokumen SPJ fisik (Kwitansi, Tanda Terima, BAST, SP), dan ARKAS. Namun, dokumen laporan berkala semesteran/bulanan dinas pendidikan (SPTJ, SPMTH, SP2B, dan LPH) belum terhubung ke OpenAI-compatible function calling Copilot.

---

## 2. Sasaran Desain

1. **Dua Mode Fleksibel (Arsip Tersimpan & Live Simulation)**:
   - Jika dokumen telah diinput dan disimpan oleh bendahara di tabel database (`sptjs`, `spmths`, `sp2bs`, `lphs`), Copilot menyajikan data resmi arsip: nomor surat resmi, tanggal dokumen, rincian nominal riil, dan pejabat penandatangan.
   - Jika dokumen belum dibuat di sistem (misal Tahap 2 yang belum ditutup), Copilot secara otomatis melakukan kalkulasi real-time bersumber dari transaksi BKU dan Penerimaan Dana dengan formula resmi yang persis sama dengan controller aplikasi SIKAS.
2. **Cakupan Periode Lengkap**:
   - SPTJ, SPMTH, dan LPH: Mendukung periode semesteran/tahap (Tahap 1 / Semester 1, Tahap 2 / Semester 2).
   - SP2B: Mendukung periode Tahapan (1 dan 2) serta Bulanan (Januari s.d. Desember).
3. **Penyajian Berformat Resmi (HTML Table & Badges)**:
   - Menampilkan status dokumen dengan jelas: `[STATUS: DOKUMEN RESMI TERSIMPAN]` atau `[STATUS: SIMULASI LIVE BKU (BELUM DISIMPAN)]`.
   - Menampilkan tabel HTML terstruktur rapi dengan nominal Rupiah resmi (rata kanan), terbilang Rupiah, serta lembar pengesahan tanda tangan (Kepala Sekolah & Bendahara).
4. **Dashboard Rekapitulasi Ke-4 Laporan**:
   - Jika pengguna meminta audit atau ringkasan status ke-4 laporan sekaligus (contoh: *"cek status laporan SPTJ, SPMTH, SP2B, dan LPH 2026"*), Copilot menyajikan matriks kepatuhan dokumen untuk Tahap 1 dan Tahap 2.

---

## 3. Arsitektur Komponen & Alur Data

```
Pengguna (Chat Copilot): "Tampilkan laporan SPTJ Tahap 1 2026" / "SP2B bulan September"
   │
   ▼
Copilot System Prompt (Pedoman Bagian 11: Laporan Pertanggungjawaban Hibah)
   │
   ▼
Function Calling: `get_official_laporan_data(jenis_laporan: 'sptj', tahap: 1, tahun: 2026)`
   │
   ▼
Backend `CopilotService::getOfficialLaporanData()`
   ├─ Resolusi Model Varian via VariantConfig ('sptj', 'spmth', 'sp2b', 'lph')
   ├─ Cek Arsip Tabel Database:
   │    ├─ Ada ──> Ambil Nomor Surat, Tanggal, Nominal Riil, Info Sekolah/Kepsek
   │    └─ Belum Ada ──> Jalankan Mesin Kalkulasi Live (BKU + Penerimaan Dana)
   │
   ▼
Copilot Response Generation:
   - Sapaan hangat khas partner bendahara: "Aman Om..."
   - Badge Status Dokumen
   - Tabel HTML Rapi Sesuai Format Cetak Resmi SIKAS
   - Lembar Pengesahan Tanda Tangan
```

---

## 4. Spesifikasi Teknis Tool `get_official_laporan_data`

### 4.1. Deklarasi Schema Tool
```php
[
    'type' => 'function',
    'function' => [
        'name' => 'get_official_laporan_data',
        'description' => 'Mengambil data resmi laporan pertanggungjawaban keuangan BOSP sekolah (SPTJ, SPMTH, SP2B, dan LPH) baik yang sudah tersimpan di arsip database (dengan nomor surat dan tanggal resmi) maupun kalkulasi dinamis (live) jika dokumen belum disimpan. Panggil tool ini saat pengguna bertanya tentang SPTJ, SPMTH, SP2B (tahapan/bulanan), Laporan Penggunaan Hibah (LPH), atau meminta ringkasan status kelengkapan 4 laporan dinas tersebut.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'jenis_laporan' => [
                    'type' => 'string',
                    'enum' => ['sptj', 'spmth', 'sp2b', 'lph', 'semua'],
                    'description' => 'Jenis laporan yang diminta: "sptj" (Surat Pernyataan Tanggung Jawab Belanja), "spmth" (Surat Pernyataan Mutlak Tanggung Jawab Hibah), "sp2b" (Surat Permintaan Pengesahan Belanja), "lph" (Laporan Penggunaan Hibah), atau "semua" (ringkasan status ke-4 laporan sekaligus).',
                ],
                'tahap' => [
                    'type' => 'integer',
                    'enum' => [1, 2],
                    'description' => 'Tahapan/Semester laporan (1 untuk Semester I / Jan–Jun, 2 untuk Semester II / Jul–Des). Opsional.',
                ],
                'bulan' => [
                    'type' => 'string',
                    'description' => 'Nama bulan transaksi atau angka 1–12 (khusus untuk SP2B bulanan). Opsional.',
                ],
                'tahun' => [
                    'type' => 'integer',
                    'description' => 'Tahun anggaran laporan (contoh: 2026, 2025). Opsional, default adalah tahun aktif saat ini.',
                ],
            ],
            'required' => ['jenis_laporan'],
        ],
    ],
]
```

### 4.2. Logika Mesin Kalkulasi Tiap Laporan
1. **SPTJ**:
   - Penerimaan Termin: `Tahap 1` & `Tahap 2` dari `PenerimaanDana` (atau seluruh dana untuk SiLPA).
   - Pengeluaran:
     * Belanja Pegawai: BKU pengeluaran dengan Kegiatan `07.12.01` s.d. `07.12.04`.
     * Belanja Barang Jasa: BKU pengeluaran Akun `5.1.02` non-pegawai.
     * Belanja Modal: BKU pengeluaran Akun `5.2`.
     * Belanja Operasi = Pegawai + Barang Jasa.
   - Sisa Kas: `BukuKasService::hitungSaldoTunaiSebelumBulan` dan `hitungSaldoBankSebelumBulan` (akhir Juni untuk Tahap 1, akhir Desember untuk Tahap 2).
2. **SPMTH**:
   - Pagu Dana BOSP dari model `Penganggaran`.
   - Realisasi Lalu: Total belanja semester 1 jika evaluasi tahap 2, atau Rp 0 jika tahap 1.
   - Realisasi Ini: Total belanja semester berjalan.
   - Sisa Dana = Pagu - (Realisasi Lalu + Realisasi Ini).
3. **SP2B**:
   - Periode: Tahap (1 & 2) atau Bulan (1 s.d. 12).
   - Saldo Awal: Sisa kas tunai + bank sebelum periode berjalan (ditambah saldo awal luncuran jika Tahap 1 / Bulan 1).
   - Pendapatan: Dana masuk BOSP periode berjalan.
   - Belanja: Total belanja BKU periode berjalan dengan rincian pegawai, barang jasa, modal peralatan mesin (5.2.02), modal buku/aset lainnya (5.2.05), dan modal tanah/bangunan.
   - Saldo Akhir = Saldo Awal + Pendapatan - Belanja.
4. **LPH**:
   - Komparasi Anggaran vs Realisasi: Penerimaan Dana, Belanja Operasi, Belanja Modal Peralatan Mesin, Belanja Modal Aset Tetap Lainnya (Buku Perpustakaan), dan Sisa Dana.
   - Rekapitulasi Belanja per Kode Rekening.

---

## 5. Rencana Pengujian

1. **Unit Test Backend**:
   - Menguji resolusi data tersimpan SPTJ Tahap 1 2026 (No. `045.2/ /SMP.MUH/DISDIKBUD/2026`).
   - Menguji resolusi data tersimpan SPMTH Tahap 1 2026.
   - Menguji resolusi SP2B Tahap 1 dan SP2B Bulanan (Maret, September).
   - Menguji resolusi LPH Semester 1 2026.
   - Menguji kalkulasi live fallback jika meminta Tahap 2 yang belum tersimpan di database.
2. **Pint Code Formatting**:
   - Format kode menggunakan `vendor/bin/pint`.
3. **Git Commit**:
   - Commit dokumen spesifikasi desain dan kode implementasi.
