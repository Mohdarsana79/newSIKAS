# Desain Spesifikasi: Integrasi Buku Kas Pembantu Tunai (BKP Tunai) pada SIKAS AI Copilot

## 1. Konteks & Latar Belakang
Pada sistem SIKAS AI Copilot, pengelolaan keuangan sekolah telah dilengkapi dengan tool pembukuan:
1. Pagu Anggaran BOSP (`get_budget_pagu_summary`)
2. Buku Kas Umum / Kuitansi Belanja Kas (`get_bku_monthly_realization`)
3. Buku Kas Pembantu Bank (`get_bkp_bank_monthly`)
4. Perencanaan RKAS (`search_rkas_activity`)
5. Kalkulasi Pajak Belanja (`calculate_tax_recommendation`)
6. Draf Staging Card BKU (`prepare_bku_transaction_draft`)
7. Analisis Grafik Serapan Triwulan/Jenis Belanja (`query_realization_comparison`)

Namun, belum tersedia tool untuk membaca dan menyajikan data **Buku Kas Pembantu Tunai (BKP Tunai)**. Pembukuan kas tunai mencatat uang kas fisik yang ditarik dari rekening bank dan disimpan di brankas bendahara sekolah untuk pembayaran belanja tunai kuitansi.

Di SIKAS, modul BKP Tunai telah berjalan di `BukuKasPembantuTunaiController` dan `BukuKasService`. Dokumen ini merumuskan penyiapan tool `get_bkp_tunai_monthly` agar AI Copilot dapat memberikan jawaban presisi saat bendahara menanyakan posisi kas tunai, penarikan uang tunai, belanja kuitansi tunai, dan saldo akhir uang fisik di brankas per bulan.

---

## 2. Sasaran & Kriteria Keberhasilan
1. **Tool Khusus BKP Tunai:** Menambahkan tool `get_bkp_tunai_monthly` pada `CopilotService` dengan parameter `bulan` (Januari–Desember).
2. **Kesesuaian Data Laporan:** Menghasilkan data saldo awal tunai, penarikan kas tunai, belanja tunai kuitansi, pemotongan/setoran pajak tunai, running balance, dan saldo akhir uang fisik di brankas yang 100% konsisten dengan laporan cetak BKP Tunai SIKAS.
3. **Pemisahan Tegas Pembukuan Kas:**
   - **Buku Kas Tunai (BKP Tunai):** Memanggil `get_bkp_tunai_monthly`.
   - **Buku Kas Bank (BKP Bank):** Memanggil `get_bkp_bank_monthly`.
   - **Buku Kas Umum (BKU):** Memanggil `get_bku_monthly_realization`.
   - **Rencana Kegiatan RKAS:** Memanggil `search_rkas_activity`.
4. **Tampilan HTML & Running Balance:** AI menyajikan ringkasan posisi kas tunai dan tabel HTML mutasi tunai lengkap dengan running balance per transaksi.
5. **Gaya Bahasa Santai & Bersih dari Nama Variabel Teknis:** Menyapa pengguna secara akrab ("Bro", "Om", "Bos") tanpa menampilkan ID database, nama variabel program, atau blok kode.

---

## 3. Arsitektur & Spesifikasi Teknis

### 3.1. Definisi Function Calling Tool
Tool dideklarasikan dalam format OpenAI-compatible di `CopilotService::getAvailableTools()`:
```php
[
    'type' => 'function',
    'function' => [
        'name' => 'get_bkp_tunai_monthly',
        'description' => 'Mengambil data resmi pembukuan Buku Kas Pembantu Tunai (BKP Tunai) pada bulan tertentu dalam tahun anggaran aktif (saldo awal kas tunai di brankas bendahara, penarikan uang tunai dari bank, potongan pajak belanja tunai yang dipungut, belanja tunai kuitansi BKU, setoran tunai kembali ke bank, penyetoran pajak tunai NTPN, serta saldo akhir kas tunai fisik bendahara, beserta rincian transaksi tunai kronologis). Panggil tool ini saat pengguna bertanya tentang Buku Kas Tunai, BKP Tunai, uang tunai di brankas, sisa kas di bendahara, atau transaksi tunai sekolah.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'bulan' => [
                    'type' => 'string',
                    'enum' => [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                    ],
                    'description' => 'Nama bulan pembukuan BKP Tunai yang diminta (Januari sampai Desember).',
                ],
            ],
            'required' => ['bulan'],
        ],
    ],
]
```

### 3.2. Implementasi Backend (`CopilotService::getBkpTunaiMonthly`)
Metode `getBkpTunaiMonthly(int $tahun, string $bulan, string $variant)` mengumpulkan data melalui model yang terikat pada varian aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`):
1. **Model & FK Resolution:**
   - `Penganggaran`: `VariantConfig::getModelClass('penganggaran', $variant)`
   - `PenarikanTunai`: `VariantConfig::getModelClass('penarikan_tunai', $variant)`
   - `SetorTunai`: `VariantConfig::getModelClass('setor_tunai', $variant)`
   - `BukuKasUmum`: `VariantConfig::getModelClass('bku', $variant)`
   - FK Penganggaran: `VariantConfig::penganggaranFk($variant)`
2. **Saldo Awal Kas Tunai:**
   Menggunakan `app(BukuKasService::class)->hitungSaldoTunaiSebelumBulan($penganggaran->id, $bulanAngka)`.
3. **Penerimaan Tunai (Kas Masuk ke Bendahara):**
   - Record `PenarikanTunai` pada bulan berjalan: Uang ditarik dari rekening bank ke kas tunai bendahara.
   - Pungutan Pajak Belanja Tunai (`total_pajak` & `total_pajak_daerah` dari belanja tunai BKU): Ditambahkan sebagai penerimaan sementara di tangan bendahara sebelum disetorkan.
4. **Pengeluaran Tunai (Kas Keluar dari Bendahara):**
   - Record `BukuKasUmum` dengan `jenis_transaksi = 'tunai'` dan `is_bunga_record = false`: Pembayaran belanja tunai (kotor).
   - Record `SetorTunai` pada bulan berjalan jika ada uang disetor kembali ke bank.
   - Setoran Pajak Tunai NTPN (`tanggal_lapor` pada bulan berjalan dengan `notNull('ntpn')`).
5. **Perhitungan Running Balance:**
   Setiap transaksi diurutkan berdasarkan `tanggal` transaksi, lalu dihitung running saldo kas tunainya:
   $$\text{Saldo Kas Tunai}_{n} = \text{Saldo}_{n-1} + \text{Penerimaan Tunai}_n - \text{Pengeluaran Tunai}_n$$
6. **Ringkasan Indikator (KPI):**
   - `saldo_awal`
   - `total_penerimaan` (Penarikan tunai dari bank + potongan pajak tunai diterima)
   - `total_pengeluaran` (Belanja tunai kuitansi + setor tunai ke bank + setor pajak tunai NTPN)
   - `saldo_akhir` = `saldo_awal + total_penerimaan - total_pengeluaran` (sisa uang tunai fisik di brankas bendahara)

### 3.3. Pembaruan Prompt Sistem (`$systemPrompt`)
Menambahkan instruksi penanganan Buku Kas Tunai:
1. **Deteksi Permintaan Buku Kas Tunai:**
   Jika pengguna menanyakan "Buku Kas Tunai", "BKP Tunai", "Buku Kas Pembantu Tunai", "Uang kas di brankas", "Sisa kas di bendahara", atau "Belanja tunai bulan X":
   - WAJIB memanggil tool `get_bkp_tunai_monthly` dengan parameter `bulan` yang diminta.
   - DILARANG memanggil `get_bkp_bank_monthly` (yang untuk rekening bank) atau `get_bku_monthly_realization` (yang untuk BKU umum).
2. **Format Respons AI:**
   - Menampilkan ringkasan posisi kas tunai di atas tabel:
     * Saldo Awal Kas Tunai Bulan Ini (format Rp)
     * Total Penerimaan Kas Tunai (Tarik Tunai dari Bank + Pungutan Pajak)
     * Total Pengeluaran Kas Tunai (Belanja Tunai Kuitansi + Setor Pajak + Setor Bank)
     * Saldo Akhir Kas Tunai (Sisa Fisik di Brankas Bendahara)
   - Menampilkan seluruh transaksi dalam tabel HTML terstruktur rapi:
     `<th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti / Kuitansi</th><th>Uraian Transaksi Tunai</th><th>Penerimaan (Rp)</th><th>Pengeluaran (Rp)</th><th>Saldo Kas Tunai (Rp)</th>`
   - Baris pertama tabel: Baris "Saldo Awal Kas Tunai".
   - Baris transaksi urut tanggal kronologis.
   - Baris penutup: Total Penerimaan, Total Pengeluaran, dan Saldo Akhir Kas Tunai.

---

## 4. Keamanan & Kualitas Data
- Didukung multi-varian (`VariantConfig`).
- Nilai Rupiah selalu rata kanan (`text-align: right`) dan diformat standar Rupiah Indonesia.
- Bebas dari kebocoran nama variabel sistem atau ID database internal.
