# Rancangan Desain: SIKAS AI DeepSeek Suite (Fase 2: Agentic Copilot Transaksi & Text-to-Analytics)

**Tanggal:** 2026-10-19  
**Status:** Disetujui (Approved)  
**Dokumen Terkait:** [2026-10-19-sikas-ai-deepseek-suite-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-sikas-ai-deepseek-suite-design.md)  

---

## 1. Ringkasan Eksekutif (Executive Summary)

**Fase 2** dari SIKAS AI DeepSeek Suite menghadirkan dua pilar kapabilitas cerdas utama:
1. **Agentic Copilot Penatausahaan (Transaction Drafter):** Asisten interaktif berbasis model `deepseek-chat` (DeepSeek-V3) dengan kapabilitas *Tool Calling / Function Calling* yang memungkinkan bendahara menyusun draf transaksi belanja, kuitansi, dan pemotongan pajak langsung melalui perintah bahasa alami (natural language), dilengkapi kartu konfirmasi pratinjau (*staging card*) sebelum data ditulis ke buku kas.
2. **Text-to-Analytics Keuangan Eksekutif:** Kemampuan tanya-jawab performa keuangan untuk Kepala Sekolah dan Bendahara yang menyajikan jawaban naratif formal, kartu indikator angka kunci (KPI), serta visualisasi grafik batang/tren mini menggunakan `ApexCharts`.

Keduanya disatukan ke dalam antarmuka **Floating Copilot Drawer** yang elegan di pojok kanan bawah aplikasi, dapat diakses dari halaman mana saja (Dashboard, BKU, Kwitansi, dll), dengan riwayat obrolan tersimpan secara ringan di *Local Storage* per akun pengguna.

---

## 2. Arsitektur Komponen & Alur Interaksi

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ANTARMUKA PENGGUNA (REACT)                        │
│   • Floating Action Button (FAB) di pojok kanan bawah                  │
│   • Slide-Over Copilot Drawer dengan auto-suggested prompts            │
│   • Staging Card & Mini ApexCharts Renderer                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Request Chat + Context Sesi
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   App\Http\Controllers\AiCopilotController            │
│   • Middleware Varian Aktif (Reguler / Kinerja / SiLPA)                │
│   • Inisialisasi Kunci API DeepSeek Pengguna (BYOK)                    │
│   • Eksekusi Loop Function Calling (DeepSeek-V3 Tools)                 │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼                               ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│ KUMPULAN TOOLS INTERNAL (PHP/SQL):    │ │ COMMIT ENDPOINT:             │
│ • search_rkas_activity                │ │ • POST /api/ai/copilot/commit│
│ • calculate_tax_recommendation        │ │   Menulis transaksi BKU ke   │
│ • prepare_bku_transaction_draft       │ │   database setelah konfirmasi│
│ • query_realization_comparison        │ │   pengguna ditekan           │
└───────────────────────────────────────┘ └──────────────────────────────┘
```

---

## 3. Spesifikasi Kumpulan Tool (Tool Registry)

### 3.1. `search_rkas_activity`
* **Tujuan:** Mencari kegiatan, kode rekening belanja, dan sisa pagu anggaran tahun aktif berdasarkan kata kunci uraian atau nama kegiatan.
* **Parameter:** `query` (string), `tahun` (integer).
* **Output:** Daftar item RKAS yang cocok:
  * `rkas_id`
  * `kode_kegiatan` & `nama_kegiatan`
  * `kode_rekening` & `rincian_objek`
  * `anggaran`, `terealisasi`, `sisa_pagu`

### 3.2. `calculate_tax_recommendation`
* **Tujuan:** Menghitung rekomendasi pemotongan dan pemungutan pajak berdasarkan nominal transaksi dan jenis barang/jasa.
* **Parameter:**
  * `amount` (float): Nominal kuitansi kotor.
  * `item_type` (string): `barang` | `jasa` | `konsumsi` | `honor`.
  * `is_pkp` (boolean, opsional): Apakah rekanan PKP (kena PPN 11%).
  * `has_npwp` (boolean, opsional): Apakah rekanan memiliki NPWP.
* **Output:** Rincian perhitungan pajak:
  * `ppn_amount`, `ppn_percent` (11%)
  * `pph_amount`, `pph_type` (PPh 21 / 22 / 23), `pph_percent`
  * `total_pajak`, `nilai_bersih` (dibelanjakan)

### 3.3. `prepare_bku_transaction_draft`
* **Tujuan:** Menyusun objek draf transaksi terstruktur (*staging payload*) untuk ditampilkan sebagai kartu pratinjau interaktif di dalam chat.
* **Parameter:**
  * `tanggal` (string: YYYY-MM-DD)
  * `jenis_transaksi` (string: 'tunai' | 'non-tunai')
  * `rkas_id` (integer)
  * `uraian` (string)
  * `nama_toko` (string)
  * `items` (array: `{ uraian, volume, satuan, harga_satuan, jumlah }`)
  * `pajak_details` (object)
* **Output:** Objek JSON draf transaksi yang memicu komponen UI `StagingCard`.

### 3.4. `query_realization_comparison`
* **Tujuan:** Menghitung agregasi realisasi anggaran per triwulan atau per standar pendidikan untuk menyajikan data grafik chart dan tabel perbandingan.
* **Parameter:**
  * `tahun` (integer)
  * `group_by` (string: `'triwulan'` | `'standar'` | `'jenis_belanja'`)
* **Output:** Data ringkasan deret angka (*series data*) untuk komponen `ApexCharts` dan tabel data perbandingan.

---

## 4. Alur Persetujuan Transaksi (Staging Card Workflow)

1. Pengguna mengetik perintah belanja di Copilot (misal: *"Catat belanja snack rapat Rp 350.000 tunai ke Toko Barokah"*).
2. DeepSeek memanggil tool `search_rkas_activity` dan `calculate_tax_recommendation`.
3. AI memanggil tool `prepare_bku_transaction_draft` dan merespons dengan kartu interaktif `StagingCard` di dalam antarmuka obrolan.
4. **Staging Card** menampilkan:
   * Nama Kegiatan & Kode Rekening yang dipetakan.
   * Tanggal transaksi, metode pembayaran (Tunai/Bank), dan Nama Toko.
   * Rincian barang belanjaan dan kalkulasi pajak (PPN/PPh).
   * Indikator Sisa Pagu Anggaran (Sebelum Transaksi → Setelah Transaksi).
5. Pada kartu terdapat dua tombol aksi:
   * **`[✅ Konfirmasi & Simpan ke BKU]`**: Mengirim draf ke endpoint backend `commit-transaction` untuk disimpan ke database `buku_kas_umums` dan `buku_kas_umum_uraian_details` dalam `DB::transaction`.
   * **`[✏️ Edit Form BKU]`**: Membuka modal input transaksi BKU standar dengan data yang telah terisi otomatis jika pengguna ingin menambahkan rincian lebih detail.

---

## 5. Antarmuka Pengguna (Floating Copilot Drawer)

### 5.1. Tombol Mengambang (Floating Action Button - FAB)
* Terpasang secara global pada layout aplikasi [`AuthenticatedLayout.tsx`](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Layouts/AuthenticatedLayout.tsx) di pojok kanan bawah.
* Desain elegan dengan ikon `Sparkles` dan label mini *"AI Copilot"*, dilengkapi animasi pulse halus.

### 5.2. Slide-Over Drawer
* Ketika diklik, drawer terbuka dari sisi kanan layar (lebar 420px di desktop, responsif 100% di mobile).
* **Header Drawer:**
  * Status model aktif (`DeepSeek-V3`), indikator Varian aktif (`Reguler / Kinerja / SiLPA`).
  * Tombol `[🔄 Mulai Obrolan Baru]` untuk menghapus riwayat obrolan sesi.
  * Tombol Minimize / Tutup.
* **Quick Prompt Suggestions:**
  * Tombol saran cepat saat obrolan baru dibuka:
    * *"💰 Cek Sisa Pagu Sarpras"*
    * *"📝 Draf Belanja ATK"*
    * *"📊 Tren Serapan Triwulan"*
* **Chat Area:**
  * Gelembung pesan pengguna dan gelembung respons AI yang mendukung rendering Markdown, tabel data, kartu draf transaksi, dan grafik mini `ApexCharts`.
* **Input Area:**
  * Textarea dengan tombol kirim, dukungan tombol Enter, dan animasi indikator pengetikan (*typing animation*).

---

## 6. Rute & Endpoint API

### Rute Baru di [`routes/variant.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php) (Multi-Variant Aware):
* `POST /api/ai/copilot/chat` (`api.ai.copilot.chat`): Menangani percakapan interaktif dan pemanggilan tools.
* `POST /api/ai/copilot/commit` (`api.ai.copilot.commit`): Menyimpan draf transaksi yang dikonfirmasi ke BKU.
* `GET /api/ai/copilot/suggested-context` (`api.ai.copilot.context`): Mengambil ringkasan pagu cepat untuk saran awal prompt.

---

## 7. Keamanan & Penanganan Edge Cases

1. **Prinsip Non-Destruktif:** AI tidak dapat menghapus atau mengubah transaksi BKU yang sudah disahkan atau ditutup kasnya.
2. **Validasi Saldo:** Tool `prepare_bku_transaction_draft` secara otomatis menolak drafting jika saldo kas tidak mencukupi atau pagu RKAS terlampaui (*over-budget guard*).
3. **Penyimpanan Sesi:** Riwayat chat disimpan di `localStorage` per kombinasi `user_id` dan `variant` (`sikas_copilot_chat_{userId}_{variant}`). Data tidak membebani database server.
4. **Fallback:** Jika pengguna belum memasukkan API Key di profilnya, drawer menampilkan kartu panduan ramah dengan tombol langsung menuju menu Pengaturan Profil.
