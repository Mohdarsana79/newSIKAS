# Desain Spesifikasi: Integrasi Buku Kas Pembantu Pajak (BKP Pajak) pada SIKAS AI Copilot

## 1. Konteks & Latar Belakang
Pada sistem SIKAS AI Copilot, pengelolaan keuangan sekolah telah dilengkapi dengan berbagai tool pembukuan resmi BOSP:
1. Pagu Anggaran BOSP (`get_budget_pagu_summary`)
2. Buku Kas Umum / Kuitansi Belanja Kas (`get_bku_monthly_realization`)
3. Buku Kas Pembantu Bank (`get_bkp_bank_monthly`)
4. Buku Kas Pembantu Tunai (`get_bkp_tunai_monthly`)
5. Perencanaan RKAS (`search_rkas_activity`)
6. Kalkulasi Pajak Belanja (`calculate_tax_recommendation`)
7. Draf Staging Card BKU (`prepare_bku_transaction_draft`)
8. Analisis Grafik Serapan Triwulan/Jenis Belanja (`query_realization_comparison`)

Namun, AI Copilot belum mengenali dan belum memiliki tool khusus untuk membaca **Buku Kas Pembantu Pajak (BKP Pajak)**. Padahal dalam penatausahaan keuangan sekolah, setiap pemotongan pajak (PPN, PPh 21, PPh 22, PPh 23, serta Pajak Daerah/PB 1) wajib dicatat dan disetorkan ke kas negara/kas daerah dengan bukti NTPN (Nomor Transaksi Penerimaan Negara).

SIKAS telah memiliki modul BKP Pajak di [BukuPajakController](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuPajakController.php), [BkpPajakExport](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Exports/BkpPajakExport.php), dan [BukuKasService](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/BukuKasService.php). Dokumen ini merumuskan perancangan tool `get_bkp_pajak_monthly` pada `CopilotService` agar AI Copilot dapat memberikan jawaban presisi, menyajikan ringkasan posisi kas pajak, rincian per jenis pajak, mutasi kronologis ber-running balance, serta peringatan kuitansi yang belum disetor NTPN-nya.

---

## 2. Sasaran & Kriteria Keberhasilan
1. **Tool Khusus BKP Pajak:** Menambahkan tool `get_bkp_pajak_monthly` pada `CopilotService` dengan parameter `bulan` (Januari–Desember) dan opsional `tahun` (contoh: 2025, 2026).
2. **Kesesuaian Data Laporan:** Menghasilkan data saldo awal pajak, pemotongan/penerimaan pajak belanja, penyetoran pajak NTPN, running balance, saldo akhir pajak belum disetor, serta breakdown jenis pajak (PPN, PPh 21, PPh 22, PPh 23, PB 1) yang 100% konsisten dengan laporan cetak BKP Pajak SIKAS.
3. **Peringatan Pajak Belum Disetor:** Menyediakan informasi transaksi belanja yang sudah dipotong pajak namun belum disetorkan (belum ada NTPN atau tanggal lapor), sehingga AI dapat mengingatkan bendahara secara proaktif.
4. **Pemisahan Tegas Pembukuan Kas:**
   - **Buku Kas Pajak (BKP Pajak):** Memanggil `get_bkp_pajak_monthly`.
   - **Buku Kas Tunai (BKP Tunai):** Memanggil `get_bkp_tunai_monthly`.
   - **Buku Kas Bank (BKP Bank):** Memanggil `get_bkp_bank_monthly`.
   - **Buku Kas Umum (BKU):** Memanggil `get_bku_monthly_realization`.
5. **Format Respons Standar:** Ringkasan posisi kas pajak, rincian per jenis pajak, tabel HTML mutasi kronologis dengan format Rupiah rata kanan, dan running balance per baris.
6. **Gaya Bahasa & Privasi:** Santai & akrab ("Bro", "Om", "Bos"), tanpa mengekspos ID database, tanpa nama variabel program, dan tanpa hardcode nama pribadi pada kode sumber.

---

## 3. Arsitektur & Spesifikasi Teknis

### 3.1. Definisi Function Calling Tool
Tool dideklarasikan dalam format OpenAI-compatible di `CopilotService::getAvailableTools()`:
```php
[
    'type' => 'function',
    'function' => [
        'name' => 'get_bkp_pajak_monthly',
        'description' => 'Mengambil data resmi pembukuan Buku Kas Pembantu Pajak (BKP Pajak) pada bulan tertentu (saldo awal kas pajak yang belum disetor, pemotongan/penerimaan pajak belanja kuitansi BKU, penyetoran pajak ke kas negara/daerah dengan NTPN, saldo akhir kas pajak belum disetor, breakdown per jenis pajak PPN/PPh21/PPh22/PPh23/PB1, serta daftar transaksi belanja yang pajaknya belum disetorkan). Panggil tool ini saat pengguna bertanya tentang Buku Kas Pajak, BKP Pajak, setoran pajak, NTPN, pemotongan pajak belanja, atau saldo kas pajak.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'bulan' => [
                    'type' => 'string',
                    'enum' => [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                    ],
                    'description' => 'Nama bulan pembukuan BKP Pajak yang diminta (Januari sampai Desember).',
                ],
                'tahun' => [
                    'type' => 'integer',
                    'description' => 'Tahun anggaran pembukuan BKP Pajak (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                ],
            ],
            'required' => ['bulan'],
        ],
    ],
]
```

### 3.2. Implementasi Backend (`CopilotService::getBkpPajakMonthly`)
Metode `getBkpPajakMonthly(int $tahun, string $bulan, string $variant)` mengumpulkan data melalui model yang terikat pada varian aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`):
1. **Model & FK Resolution:**
   - `Penganggaran`: `VariantConfig::getModelClass('penganggaran', $variant)`
   - `BukuKasUmum`: `VariantConfig::getModelClass('bku', $variant)`
   - FK Penganggaran: `VariantConfig::penganggaranFk($variant)`
2. **Saldo Awal Kas Pajak:**
   Menggunakan `app(BukuKasService::class)->hitungSaldoPajakSebelumBulan($penganggaran->id, $bulanAngka, $tahun)`.
   Saldo awal mencerminkan akumulasi potongan pajak pada bulan-bulan sebelumnya yang belum disetorkan hingga akhir bulan lalu.
3. **Penerimaan Pajak (Pungutan Pemotongan Pajak Belanja):**
   - Transaksi BKU dengan `tanggal_transaksi` di bulan target yang memiliki `total_pajak > 0` atau `total_pajak_daerah > 0`.
   - Mengelompokkan dan mengklasifikasikan nilai pajak:
     - PPh 21 (Honorarium, upah narasumber/panitia)
     - PPh 22 (Belanja barang pemerintah)
     - PPh 23 (Jasa perbaikan, sewa, katering jasa)
     - PPN (Pajak Pertambahan Nilai)
     - PB 1 (Pajak Daerah restoran/mamin rapat)
   - Setiap transaksi pemotongan dicatat sebagai mutasi bertipe `terima_pajak` (`penerimaan > 0`, `pengeluaran = 0`).
4. **Pengeluaran Pajak (Penyetoran Pajak ke Kas Negara/Daerah):**
   - Transaksi BKU dengan `tanggal_lapor` di bulan target yang memiliki `ntpn` tidak null dan `(total_pajak > 0 atau total_pajak_daerah > 0)`.
   - Setiap penyetoran dicatat sebagai mutasi bertipe `setor_pajak` (`pengeluaran > 0`, `penerimaan = 0`) beserta nomor NTPN.
5. **Identifikasi Pajak Belum Disetor:**
   - Mendeteksi transaksi belanja pada bulan target (atau sebelumnya) yang memiliki potongan pajak, namun `ntpn` masih kosong atau `tanggal_lapor` melebihi bulan target.
   - Mengumpulkan daftar ini ke dalam array `belum_disetor` (berisi nomor kuitansi, tanggal, uraian, jenis pajak, dan nominal).
6. **Perhitungan Running Balance:**
   - Semua mutasi diurutkan secara kronologis berdasarkan `tanggal`. Jika tanggal sama, transaksi penerimaan (pungutan) diletakkan sebelum pengeluaran (setoran).
   - Menghitung running balance per baris:
     $$\text{Saldo Kas Pajak}_{n} = \text{Saldo}_{n-1} + \text{Penerimaan Pajak}_n - \text{Pengeluaran Pajak}_n$$
7. **Struktur Data Pengembalian:**
   ```json
   {
     "bulan": "Maret",
     "tahun": 2026,
     "saldo_awal": 0.0,
     "total_penerimaan": 19200.0,
     "total_pengeluaran": 0.0,
     "saldo_akhir": 19200.0,
     "rincian_jenis_pajak": {
       "ppn": 0.0,
       "pph21": 0.0,
       "pph22": 0.0,
       "pph23": 19200.0,
       "pb1": 0.0
     },
     "belum_disetor_count": 2,
     "belum_disetor": [ ... ],
     "mutasi_count": 2,
     "items": [ ... ]
   }
   ```

### 3.3. Integrasi Prompt Sistem (`$systemPrompt`)
Menambahkan aturan eksplisit pada bagian pedoman pembukuan:
1. **Deteksi Permintaan BKP Pajak:**
   Jika pengguna menanyakan "Buku Kas Pajak", "BKP Pajak", "Kas Pembantu Pajak", "Penyetoran Pajak", "NTPN", "Pajak belum setor", atau "Mutasi pajak bulan X":
   - WAJIB memanggil tool `get_bkp_pajak_monthly` dengan parameter `bulan` (dan `tahun` jika spesifik).
   - DILARANG memanggil `get_bkp_bank_monthly`, `get_bkp_tunai_monthly`, atau `get_bku_monthly_realization`.
2. **Format Respons AI:**
   - Menampilkan ringkasan posisi kas pajak di atas tabel:
     - Saldo Awal Pajak (format Rp)
     - Total Pemotongan/Penerimaan Pajak Bulan Ini (format Rp)
     - Total Penyetoran Pajak ke Kas Negara/Daerah (format Rp)
     - Saldo Akhir Kas Pajak / Pajak Belum Disetor (format Rp)
   - Menampilkan rincian breakdown per jenis pajak (PPN, PPh 21, PPh 22, PPh 23, PB 1).
   - Menampilkan tabel HTML mutasi pajak kronologis lengkap:
     `<th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti / NTPN</th><th>Uraian Transaksi Pajak</th><th>Pemotongan/Penerimaan (Rp)</th><th>Penyetoran/Pengeluaran (Rp)</th><th>Saldo Kas Pajak (Rp)</th>`
   - Memberikan peringatan ramah jika terdapat kuitansi yang pajaknya belum disetorkan (belum memiliki NTPN).

---

## 4. Pengujian & Validasi
1. **Unit/Integration Script Testing:**
   - Menguji BKP Pajak tahun 2026 bulan Maret: Penerimaan PPh 23 Rp 19.200 (kuitansi sewa tenda & mamin rapat), pengeluaran Rp 0 (karena disetor pada April), saldo akhir Rp 19.200.
   - Menguji BKP Pajak tahun 2026 bulan April: Saldo awal Rp 19.200, penerimaan PPh 21 Rp 5.000, pengeluaran setor NTPN Rp 24.200, saldo akhir Rp 0.
   - Menguji BKP Pajak tahun 2025: Memverifikasi 8 transaksi pajak di 2025 dengan saldo awal dan running balance yang akurat.
2. **Linting & Code Quality:**
   - Menjalankan `vendor/bin/pint --test` pada file yang diubah.
   - Menjalankan `php -l` untuk memastikan sintaks bebas error.
