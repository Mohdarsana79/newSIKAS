# SIKAS AI DeepSeek Suite — Fase 4: Generator Narasi LPJ/SPJ & Catatan Atas Laporan Keuangan (CaLK) Otomatis (Desain Teknis)

**Status:** APPROVED  
**Tanggal:** 19 Oktober 2026  
**Penulis:** Tim Pengembang newSIKAS & Antigravity  
**Model AI:** DeepSeek-V3 (`deepseek-chat`)  

---

## 1. Latar Belakang & Problem Statement

Setiap akhir semester (per-Tahap pencairan) dan akhir tahun anggaran, bendahara dan kepala sekolah diwajibkan menyusun **Laporan Pertanggungjawaban (LPJ/SPJ)** serta **Catatan Atas Laporan Keuangan (CaLK)** dana BOSP untuk diserahkan ke Dinas Pendidikan, Inspektorat Daerah, dan Badan Pemeriksa Keuangan (BPK RI).

Dalam praktiknya, penyusunan naskah narasi CaLK menghadapi kendala:
1. **Beban Administrasi Tinggi:** Bendahara membutuhkan waktu berhari-hari untuk merangkai kalimat narasi birokrasi pemerintahan yang formal untuk menjelaskan puluhan hingga ribuan transaksi belanja.
2. **Kerapuhan Aritmatika:** Sering terjadi ketidaksinkronan angka antara tabel rekapitulasi realisasi belanja dengan penjelasan naratif di dalam bab laporan.
3. **Format Kurang Baku:** Banyak sekolah belum memiliki draf standar Standar Akuntansi Pemerintahan (SAP) yang membedakan Belanja Operasi, Belanja Modal, serta penjelasan saldo kas dan pajak terutang.

**Fase 4** menghadirkan **Generator Narasi LPJ/SPJ & CaLK Otomatis** bertenaga DeepSeek-V3 dengan pendekatan *Modular Multi-Section Pipeline*:
- **Akurasi Angka 100%:** Dihitung langsung oleh mesin database PostgreSQL (bukan dihitung oleh AI).
- **Keunggulan Bahasa Narasi:** DeepSeek-V3 difokuskan menyusun narasi formal berwibawa standar BPK RI.
- **Human-in-the-Loop:** Hasil narasi tersimpan di database dan dapat disunting oleh bendahara sebelum dicetak ke PDF resmi ber-kop sekolah.

---

## 2. Arsitektur Solusi & Alur Data

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANTARMUKA PENGGUNA (REACT)                      │
│                                                                        │
│  [FiturPelengkap/Laporan/Index.tsx] ──> [TabReguler.tsx]               │
│                                              │                         │
│                                     [Tab 5: CalkTab.tsx]               │
│                                     ├── Filter: Tahun & Periode        │
│                                     ├── KPI Serapan Anggaran & Kas     │
│                                     ├── Toolbar: Generate / Simpan /   │
│                                     │   Cetak PDF / Salin Word         │
│                                     └── Editor Teks Per-Bab (I s.d. V) │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ HTTP POST / GET
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (LARAVEL 13)                            │
│                                                                        │
│  [CalkReportController]                                                │
│  ├── index: Memuat laporan tersimpan untuk tahun/periode aktif         │
│  ├── generate: Memicu proses agregasi & DeepSeek-V3 generator          │
│  ├── update: Menyimpan suntingan bendahara ke PostgreSQL               │
│  └── exportPdf: Merender PDF kop resmi via DomPDF                      │
│                                                                        │
│  [CalkDataAggregator]                                                  │
│  └── Menghitung agregat matematis dari PostgreSQL (Pagu, Belanja 5.1/  │
│      5.2, Serapan SNP, Pajak, Sisa Kas Bank & Tunai)                  │
│                                                                        │
│  [CalkAiGenerator]                                                     │
│  └── Memanggil DeepSeek-V3 (temperature 0.3) dengan system prompt      │
│      akuntansi pemerintahan untuk menyusun Bab I s.d. Bab V            │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [Tabel: calk_reports]             [Template: calk-report.blade.php]
        - metrics_snapshot JSONB          - Kop Surat Resmi Sekolah
        - bab_1 s.d. bab_5 TEXT           - Matriks Tabel Realisasi
        - user_id, is_finalized           - Lembar TTD Kepsek & Bendahara
```

---

## 3. Spesifikasi Skema Database (`calk_reports`)

Migrasi baru: `database/migrations/2026_10_19_000003_create_calk_reports_table.php`:

```php
Schema::create('calk_reports', function (Blueprint $table) {
    $table->id();
    $table->string('variant', 30)->default('reguler'); // reguler, kinerja, silpa, kinerja_silpa
    $table->integer('tahun_anggaran');
    $table->string('periode', 20); // 'tahap_1', 'tahap_2', 'tahunan'
    $table->string('judul_laporan', 255);
    
    // Ringkasan matematis riil
    $table->jsonb('metrics_snapshot');
    
    // Naskah Bab CaLK (Disusun AI & Dapat Disunting)
    $table->text('bab_1_pendahuluan')->nullable();
    $table->text('bab_2_kebijakan_akuntansi')->nullable();
    $table->text('bab_3_analisis_realisasi')->nullable();
    $table->text('bab_4_penjelasan_pos_keuangan')->nullable();
    $table->text('bab_5_penutup')->nullable();
    
    $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->boolean('is_finalized')->default(false);
    $table->timestamps();

    $table->unique(['variant', 'tahun_anggaran', 'periode'], 'calk_variant_tahun_periode_unique');
});
```

---

## 4. Rincian Bab Laporan CaLK Standar SAP

1. **BAB I: PENDAHULUAN**
   - Maksud, tujuan, dan dasar hukum pengelolaan dana BOSP (Permendikbudristek & PMK terkait).
   - Profil singkat satuan pendidikan (NPSN, alamat, jenjang).
2. **BAB II: KEBIJAKAN AKUNTANSI**
   - Asas pengelolaan: Transparan, akuntabel, efisien, dan tertib administrasi.
   - Basis akuntansi: Pengakuan pendapatan dan realisasi belanja berbasis kas menuju akrual.
3. **BAB III: ANALISIS REALISASI ANGGARAN & CAPAIAN TARGET**
   - Ringkasan target pagu anggaran vs realisasi riil (dalam rupiah dan persentase serapan %).
   - Evaluasi serapan per-Tahap pencairan serta perbandingan belanja operasi vs belanja modal.
4. **BAB IV: PENJELASAN POS-POS LAPORAN KEUANGAN**
   - Rincian Belanja Operasi: Belanja Pegawai/Honorarium, Barang & Jasa, Pemeliharaan Sarana, Daya & Jasa.
   - Rincian Belanja Modal: Pengadaan buku, alat peraga, dan aset tetap lainnya.
   - Kewajiban Perpajakan: Rekapitulasi pemotongan dan penyetoran PPh 21, PPh 22, PPh 23, dan PPN.
   - Posisi Saldo Kas Akhir: Penjelasan sisa kas di rekening bank dan kas tunai di brankas bendahara.
5. **BAB V: PENUTUP & KESIMPULAN**
   - Hambatan/kendala dalam pelaksanaan penatausahaan keuangan dan upaya penyelesaiannya.
   - Kesimpulan akuntabilitas dan pernyataan tanggung jawab pengelola dana BOSP.

---

## 5. Rincian Antarmuka & Ekspor PDF

- **Komponen Frontend:** `resources/js/Pages/FiturPelengkap/Laporan/components/CalkTab.tsx`.
- **Integrasi Menu:** Ditambahkan sebagai Tab ke-5 pada `TabReguler.tsx`.
- **Ekspor Dokumen:**
  - Route: `GET /{routePrefix}laporan/calk/export-pdf/{id}`
  - Blade: `resources/views/pdf/calk-report.blade.php`
  - Tombol Salin Cepat: Menyalin teks lengkap dalam format siap tempel ke Microsoft Word.
