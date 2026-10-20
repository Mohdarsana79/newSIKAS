# Desain Spesifikasi: Integrasi Buku Pembantu Rincian Objek Belanja (BKP ROB) pada SIKAS AI Copilot

## 1. Konteks & Latar Belakang
Pada sistem SIKAS AI Copilot, pengelolaan keuangan sekolah telah dilengkapi dengan berbagai buku pembantu resmi BOSP:
1. Pagu Anggaran BOSP (`get_budget_pagu_summary`)
2. Buku Kas Umum / Kuitansi Belanja Kas (`get_bku_monthly_realization`)
3. Buku Kas Pembantu Bank (`get_bkp_bank_monthly`)
4. Buku Kas Pembantu Tunai (`get_bkp_tunai_monthly`)
5. Buku Kas Pembantu Pajak (`get_bkp_pajak_monthly`)
6. Perencanaan RKAS (`search_rkas_activity`)
7. Kalkulasi Pajak Belanja (`calculate_tax_recommendation`)
8. Draf Staging Card BKU (`prepare_bku_transaction_draft`)
9. Analisis Grafik Serapan Triwulan/Jenis Belanja (`query_realization_comparison`)

Namun, AI Copilot belum memiliki tool khusus untuk menyajikan **Buku Pembantu Rincian Objek Belanja (BKP ROB)**. Padahal dalam penatausahaan keuangan sekolah, laporan ROB merupakan pembukuan wajib yang mengelompokkan seluruh belanja kuitansi BKU berdasarkan rekening objek belanja (seperti belanja ATK, pemeliharaan sarpras, langganan internet, makan minum rapat, dan honorarium), serta memantau saldo anggaran belanja yang tersedia.

SIKAS telah memiliki modul ROB di [BukuRobController](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuRobController.php) dan template cetak PDF [rob_pdf.blade.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/rob_pdf.blade.php). Dokumen ini merumuskan perancangan tool `get_bkp_rob_monthly` pada `CopilotService` agar AI Copilot dapat memberikan data ROB yang lengkap, terstruktur per rekening belanja, memuat rincian transaksi kuitansi, sisa anggaran kas, serta perbandingan terhadap pagu akun RKAS.

---

## 2. Sasaran & Kriteria Keberhasilan
1. **Tool Khusus BKP ROB:** Menambahkan tool `get_bkp_rob_monthly` pada `CopilotService` dengan parameter `bulan` (Januari–Desember), opsional `tahun` (contoh: 2025, 2026), dan opsional `rekening` (kata kunci nama/kode rekening).
2. **Kesesuaian Data Laporan:** Menghasilkan data saldo awal anggaran belanja tersedia, rincian serapan belanja per rekening belanja, running total kumulatif, dan sisa anggaran kas yang 100% konsisten dengan laporan cetak [rob_pdf.blade.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/rob_pdf.blade.php).
3. **Pengayaan Pagu RKAS Akun:** Menyertakan informasi alokasi Pagu Anggaran RKAS untuk setiap rekening objek belanja tersebut sehingga bendahara dapat mengetahui tingkat serapan akun.
4. **Pencarian / Filter Rekening Fleksibel:** Jika bendahara menanyakan objek belanja tertentu (misal: "ATK" atau "Honorarium"), AI dapat menyaring akun yang relevan; jika tidak disebutkan, AI menyajikan seluruh objek belanja.
5. **Format Respons Standar:** Ringkasan eksekutif posisi kas ROB, tabel rekapitulasi per objek belanja, diikuti tabel rincian transaksi per kelompok objek belanja dengan format Rupiah rata kanan.
6. **Gaya Bahasa & Privasi:** Santai & akrab ("Bro", "Om", "Bos"), tanpa mengekspos ID database, tanpa nama variabel program, dan tanpa hardcode nama pribadi pada kode sumber.

---

## 3. Arsitektur & Spesifikasi Teknis

### 3.1. Definisi Function Calling Tool
Tool dideklarasikan dalam format OpenAI-compatible di `CopilotService::getAvailableTools()`:
```php
[
    'type' => 'function',
    'function' => [
        'name' => 'get_bkp_rob_monthly',
        'description' => 'Mengambil data resmi pembukuan Buku Pembantu Rincian Objek Belanja (BKP ROB) pada bulan tertentu dalam tahun anggaran aktif. Menyajikan saldo anggaran belanja tersedia, rincian serapan belanja yang dikelompokkan per Kode dan Nama Rekening Belanja (seperti ATK, Honorarium, Pemeliharaan, Internet, dll), daftar kuitansi transaksi per objek belanja beserta running total dan sisa anggaran kas, serta perbandingan terhadap Pagu RKAS akun tersebut. Panggil tool ini saat pengguna bertanya tentang Buku ROB, Rincian Objek Belanja, realisasi belanja per rekening, atau serapan akun belanja tertentu.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'bulan' => [
                    'type' => 'string',
                    'enum' => [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                    ],
                    'description' => 'Nama bulan pembukuan ROB yang diminta (Januari sampai Desember).',
                ],
                'tahun' => [
                    'type' => 'integer',
                    'description' => 'Tahun anggaran pembukuan ROB (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                ],
                'rekening' => [
                    'type' => 'string',
                    'description' => 'Kata kunci nama rekening atau kode rekening belanja (contoh: "ATK", "Honorarium", "5.1.02..."). Opsional, jika dikosongkan akan menampilkan seluruh objek belanja.',
                ],
            ],
            'required' => ['bulan'],
        ],
    ],
]
```

### 3.2. Implementasi Backend (`CopilotService::getBkpRobMonthly`)
Metode `getBkpRobMonthly(int $tahun, string $bulan, string $variant, ?string $rekeningFilter = null)` mengumpulkan data melalui model yang terikat pada varian aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`):
1. **Model & FK Resolution:**
   - `Penganggaran`: `VariantConfig::getModelClass('penganggaran', $variant)`
   - `BukuKasUmum`: `VariantConfig::getModelClass('bku', $variant)`
   - `Rkas`: `VariantConfig::getModelClass('rkas', $variant)`
   - `RekeningBelanja`: `App\Models\RekeningBelanja`
   - FK Penganggaran: `VariantConfig::penganggaranFk($variant)`
2. **Saldo Awal Anggaran Belanja Tersedia (ROB):**
   - Menggunakan `BukuKasService::hitungTotalDanaTersedia($penganggaran->id)`.
   - Jika bulan > 1 (Februari s/d Desember), kurangi dengan total realisasi kotor belanja non-bunga dari bulan 1 s/d bulan sebelumnya:
     $$\text{Saldo Awal ROB} = \text{Total Dana Tersedia} - \sum \text{Realisasi Belanja Bulan-Bulan Sebelumnya}$$
3. **Pengambilan Transaksi Belanja BKU Bulan Berjalan:**
   - Transaksi BKU non-bunga pada bulan target (`is_bunga_record = false` atau null) diurutkan berdasarkan `rekening_belanja_id` dan `tanggal_transaksi`.
   - Eager-loading `rekeningBelanja` dan `kodeKegiatan`.
4. **Pengelompokan Berdasarkan Rekening Objek Belanja:**
   - Transaksi dikelompokkan berdasarkan `kode_rekening` dan `rincian_objek`.
   - Jika ada parameter `$rekeningFilter`, lakukan filter substring pada kode rekening atau nama rincian objek.
5. **Perhitungan Running Total & Sisa Anggaran Kas per Transaksi:**
   - Untuk setiap transaksi belanja:
     $$\text{Jumlah Kumulatif}_n = \text{Jumlah Kumulatif}_{n-1} + \text{Realisasi Kotor}_n$$
     $$\text{Sisa Anggaran Kas}_n = \text{Saldo Awal ROB} - \text{Jumlah Kumulatif}_n$$
6. **Pengayaan Pagu Anggaran RKAS per Akun:**
   - Mengambil total alokasi pagu tahunan pada tabel RKAS untuk masing-masing `rekening_belanja_id`.
   - Menghitung total realisasi kumulatif tahun berjalan akun tersebut, sisa pagu anggaran akun, dan persentase serapannya.
7. **Struktur Data Pengembalian:**
   ```json
   {
     "bulan": "Maret",
     "tahun": 2026,
     "saldo_awal_anggaran": 14500000.0,
     "total_realisasi_bulan_ini": 8348000.0,
     "sisa_anggaran_kas": 6152000.0,
     "filter_rekening": null,
     "rekap_objek_count": 15,
     "rekap_objek": [
       {
         "kode_rekening": "5.1.02.01.01.0024",
         "nama_rekening": "Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor",
         "pagu_rkas": 2000000.0,
         "realisasi_bulan_ini": 1884000.0,
         "total_realisasi_tahunan": 1884000.0,
         "sisa_pagu_rkas": 116000.0,
         "transaksi_count": 1
       }
     ],
     "kelompok_objek": [
       {
         "kode_rekening": "5.1.02.01.01.0024",
         "nama_rekening": "Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor",
         "total_realisasi": 1884000.0,
         "transaksi": [
           {
             "tanggal": "2026-03-15",
             "tanggal_formatted": "15/03/2026",
             "no_bukti": "BPU02",
             "uraian": "Belanja Kebutuhan ATK Kantor",
             "realisasi": 1884000.0,
             "jumlah_kumulatif": 1884000.0,
             "sisa_anggaran_kas": 12616000.0
           }
         ]
       }
     ]
   }
   ```

### 3.3. Integrasi Prompt Sistem (`$systemPrompt`)
Menambahkan aturan eksplisit pada bagian pedoman pembukuan:
1. **Deteksi Permintaan BKP ROB:**
   Jika pengguna menanyakan "Buku ROB", "BKP ROB", "Rincian Objek Belanja", "Realisasi per rekening", "Serapan belanja per akun", atau "Belanja ATK/Honor/Sewa bulan X":
   - WAJIB memanggil tool `get_bkp_rob_monthly` dengan parameter `bulan`, `tahun` (jika spesifik), dan parameter `rekening` (jika menanyakan akun tertentu).
   - DILARANG memanggil `get_bku_monthly_realization` (yang untuk BKU kronologis umum tanpa grouping rekening) atau `search_rkas_activity` (yang untuk pencarian rencana kegiatan).
2. **Format Respons AI:**
   - **Ringkasan Posisi Kas Anggaran ROB:**
     - Anggaran Belanja Tersedia di Awal Bulan (format Rp).
     - Total Realisasi Belanja Seluruh Akun Bulan Ini (format Rp).
     - Sisa Anggaran Kas Belanja Akhir Bulan (format Rp).
   - **Tabel Rekapitulasi per Objek Belanja:**
     `<th>No</th><th>Kode Rekening</th><th>Nama Objek Belanja</th><th>Pagu RKAS (Rp)</th><th>Realisasi Bulan Ini (Rp)</th><th>Total Realisasi Tahunan (Rp)</th><th>Sisa Pagu RKAS (Rp)</th>`
   - **Tabel Rincian Transaksi Belanja per Rekening:**
     Dikelompokkan rapi per kode dan nama rekening belanja dengan kolom:
     `<th>No</th><th>Tanggal</th><th>No. Bukti / Kuitansi</th><th>Uraian Belanja</th><th>Realisasi (Rp)</th><th>Jumlah Kumulatif (Rp)</th><th>Sisa Anggaran Kas (Rp)</th>`
   - Jika bulan tersebut tidak memiliki transaksi belanja, jelaskan secara santai bahwa belum ada pencairan belanja pada bulan tersebut.

---

## 4. Pengujian & Validasi
1. **Unit/Integration Script Testing:**
   - Menguji BKP ROB tahun 2026 bulan Maret: Memverifikasi 15 kelompok rekening dengan total realisasi Rp 8.348.000, saldo awal Rp 14.500.000, dan sisa anggaran kas Rp 6.152.000.
   - Menguji filter spesifik rekening (contoh: rekening "ATK" atau "Honorarium"): Memverifikasi bahwa hanya akun terkait yang dikembalikan.
   - Menguji BKP ROB multi-tahun (2025): Memverifikasi pengelompokan akun belanja tahun 2025.
2. **Linting & Code Quality:**
   - Menjalankan `vendor/bin/pint --test` pada file yang diubah.
   - Menjalankan `php -l` untuk memastikan sintaks bebas error.
