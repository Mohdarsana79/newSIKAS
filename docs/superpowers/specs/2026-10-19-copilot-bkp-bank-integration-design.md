# Desain Spesifikasi: Integrasi Buku Kas Pembantu Bank (BKP Bank) pada SIKAS AI Copilot

## 1. Konteks & Latar Belakang
Pada implementasi sebelumnya, SIKAS AI Copilot telah dibekali tool untuk memeriksa:
1. Pagu Anggaran BOSP (`get_budget_pagu_summary`)
2. Buku Kas Umum / Kuitansi Belanja Kas (`get_bku_monthly_realization`)
3. Perencanaan RKAS (`search_rkas_activity`)
4. Kalkulasi Pajak Belanja (`calculate_tax_recommendation`)
5. Draf Staging Card BKU (`prepare_bku_transaction_draft`)
6. Analisis Grafik Serapan Triwulan/Jenis Belanja (`query_realization_comparison`)

Namun, belum tersedia tool untuk membaca dan menyajikan data **Buku Kas Pembantu Bank (BKP Bank)**. Akibatnya, ketika pengguna meminta untuk melihat "Buku Kas Bank", "Saldo Rekening Bank", atau "Mutasi Bank Bulan X", AI Copilot tidak memiliki akses ke data mutasi bank sehingga keliru memanggil tool BKU (`get_bku_monthly_realization`) atau menampilkan data kas umum biasa.

Di sisi lain, SIKAS sudah memiliki pembukuan BKP Bank yang sangat matang di `BukuBankController` dan `BukuKasService` (mencakup saldo awal bank, penerimaan transfer dana BOSP, penarikan tunai ke bendahara, bunga bank, pajak bunga bank, belanja non-tunai transfer/CMS, serta setoran STS).

Dokumen ini menetapkan spesifikasi desain penyiapan data Buku Kas Pembantu Bank agar AI Copilot dapat menyajikan posisi kas dan mutasi rekening bank secara akurat, lengkap dengan running balance dan format tabel standar SIKAS.

---

## 2. Sasaran & Kriteria Keberhasilan
1. **Tool Khusus BKP Bank:** Menyediakan tool `get_bkp_bank_monthly` pada `CopilotService` yang menerima parameter `bulan` (Januari–Desember).
2. **Data Akurat & Selaras:** Menghasilkan ringkasan saldo bank (saldo awal, penerimaan, pengeluaran, saldo akhir) dan daftar mutasi rekening yang 100% konsisten dengan laporan cetak PDF/Excel BKP Bank SIKAS.
3. **Pemisahan Tegas BKU vs BKP Bank:** Prompt sistem AI Copilot dapat membedakan secara tegas kapan harus memanggil BKU kuitansi belanja (`get_bku_monthly_realization`) dan kapan harus memanggil BKP Bank (`get_bkp_bank_monthly`).
4. **Tampilan Tabel & Running Balance:** AI menyajikan ringkasan posisi kas bank dan tabel HTML mutasi bank dengan kolom resmi:
   `No` | `Tanggal` | `Kode Rekening` | `No. Bukti` | `Uraian Transaksi Bank` | `Penerimaan (Rp)` | `Pengeluaran (Rp)` | `Saldo Bank (Rp)`.
5. **Gaya Bahasa Santai & Anti-Bocor Data:** Menjaga persona teman akrab ("Bro", "Om", "Bos") tanpa membocorkan nama variabel internal, query database, atau ID database.

---

## 3. Arsitektur & Spesifikasi Teknis

### 3.1. Definisi Function Calling Tool
Tool dideklarasikan dalam format OpenAI-compatible di `CopilotService::getAvailableTools()`:
```php
[
    'type' => 'function',
    'function' => [
        'name' => 'get_bkp_bank_monthly',
        'description' => 'Mengambil data resmi pembukuan Buku Kas Pembantu Bank (BKP Bank) pada bulan tertentu dalam tahun anggaran aktif (saldo awal bank, total penerimaan transfer dana BOSP, pendapatan bunga bank, penarikan tunai ke kas bendahara, pajak bunga bank, belanja non-tunai/CMS, setoran STS, serta saldo akhir bank, beserta rincian mutasi rekening per tanggal). Panggil tool ini saat pengguna bertanya tentang Buku Kas Bank, mutasi rekening bank, saldo bank bulan tertentu, atau transaksi perbankan sekolah.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'bulan' => [
                    'type' => 'string',
                    'enum' => [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                    ],
                    'description' => 'Nama bulan pembukuan BKP Bank yang diminta (Januari sampai Desember).',
                ],
            ],
            'required' => ['bulan'],
        ],
    ],
]
```

### 3.2. Implementasi Backend (`CopilotService::getBkpBankMonthly`)
Metode `getBkpBankMonthly(int $tahun, string $bulan, string $variant)` mengumpulkan data melalui model yang terikat pada varian aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`):
1. **Model & FK Resolution:**
   - `Penganggaran`: `VariantConfig::getModelClass('penganggaran', $variant)`
   - `PenerimaanDana`: `VariantConfig::getModelClass('penerimaan_dana', $variant)`
   - `PenarikanTunai`: `VariantConfig::getModelClass('penarikan_tunai', $variant)`
   - `BukuKasUmum`: `VariantConfig::getModelClass('bku', $variant)`
   - `Sts`: `VariantConfig::getModelClass('sts', $variant)`
   - FK Penganggaran: `VariantConfig::penganggaranFk($variant)`
2. **Saldo Awal Bank:**
   Menggunakan `app(BukuKasService::class)->hitungSaldoBankSebelumBulan($penganggaran->id, $bulanAngka)`.
   Untuk bulan Januari, jika ada saldo awal tahun lalu pada `PenerimaanDana` (BOSP Reguler Tahap 1), saldo tersebut digabungkan ke saldo awal bank.
3. **Komponen Mutasi Bulan Berjalan:**
   - **Penerimaan Dana:** Filter `whereMonth('tanggal_terima', $bulanAngka)` dan `whereYear('tanggal_terima', $tahun)`.
   - **Penarikan Tunai:** Filter `whereMonth('tanggal_penarikan', $bulanAngka)` dan `whereYear('tanggal_penarikan', $tahun)`.
   - **Bunga Bank & Pajak Bunga Bank:** Dari record BKU dengan flag `is_bunga_record = true`.
   - **STS Buku Bank:** Record STS dengan `is_bkp = true` pada bulan berjalan.
   - **Belanja Non-Tunai:** Record BKU dengan `jenis_transaksi = 'non-tunai'` dan `is_bunga_record = false`.
   - **Pajak Belanja Non-Tunai:** Potongan pajak non-tunai (penerimaan) dan penyetoran pajak non-tunai NTPN (pengeluaran).
4. **Perhitungan Running Balance:**
   Setiap item mutasi diurutkan berdasarkan `tanggal` transaksi, lalu dihitung running saldonya:
   $$\text{Saldo}_{n} = \text{Saldo}_{n-1} + \text{Penerimaan}_n - \text{Pengeluaran}_n$$
5. **Ringkasan Indikator (KPI):**
   - `saldo_awal`
   - `total_penerimaan` (Penerimaan transfer dana + bunga bank + potongan pajak non-tunai)
   - `total_pengeluaran` (Penarikan tunai + pajak bunga bank + belanja non-tunai + STS + setor pajak non-tunai)
   - `saldo_akhir` = `saldo_awal + total_penerimaan - total_pengeluaran`

### 3.3. Pembaruan Prompt Sistem (`$systemPrompt`)
Menambahkan panduan tegas pada `$systemPrompt`:
1. **Deteksi Permintaan Buku Bank:**
   Jika pengguna menanyakan "Buku Kas Bank", "Buku Pembantu Bank", "BKP Bank", "Saldo rekening bank bulan X", atau "Mutasi bank bulan X":
   - WAJIB memanggil tool `get_bkp_bank_monthly` dengan parameter `bulan` yang diminta.
   - DILARANG memanggil `get_bku_monthly_realization` (yang hanya untuk belanja kuitansi BKU).
2. **Format Respons AI:**
   - Menyapa akrab ("Bro", "Om", "Bos").
   - Menampilkan ringkasan posisi kas bank di atas tabel:
     * Saldo Awal Kas Bank
     * Total Penerimaan Bank Bulan Ini
     * Total Pengeluaran Bank Bulan Ini
     * Saldo Akhir Kas di Bank
   - Menampilkan seluruh mutasi dalam tabel HTML terstruktur rapi:
     `<th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti</th><th>Uraian Transaksi</th><th>Penerimaan</th><th>Pengeluaran</th><th>Saldo Bank</th>`
   - Baris pertama tabel: Baris "Saldo Awal Bank".
   - Baris mutasi sesuai urutan kronologis tanggal.
   - Baris penutup: Total Penerimaan, Total Pengeluaran, dan Saldo Akhir Bank.

---

## 4. Keamanan & Kualitas Data
- Menggunakan `VariantConfig` agar kompatibel dengan 4 varian anggaran (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
- Bebas dari kebocoran nama variabel sistem (`$spent`, `$saldo_awal`, `penganggaran_id`, dsb) melalui sanitasi bawaan.
- Nominal Rupiah selalu diformat rata kanan (`text-align: right`) dengan pemisah ribuan titik (`Rp 25.000.000`).
