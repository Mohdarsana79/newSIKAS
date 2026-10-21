# Desain Teknis: Integrasi Data Dokumen SPJ (Kwitansi, Tanda Terima, BAST, dan Surat Pesanan) ke SIKAS AI Copilot

**Tanggal:** 2026-10-21  
**Status:** Approved by User  
**Topik:** Penyajian Data Real Dokumen Pertanggungjawaban SPJ (Kwitansi, Tanda Terima, Berita Acara Serah Terima Barang/Jasa, dan Surat Pesanan) pada AI Copilot  

---

## 1. Latar Belakang & Tujuan

Dalam penatausahaan keuangan BOSP di aplikasi SIKAS, setiap transaksi pengeluaran pada Buku Kas Umum (BKU) harus didukung oleh dokumen pertanggungjawaban (SPJ) yang sah dan lengkap sesuai regulasi:
1. **Kwitansi**: Bukti pembayaran kas untuk semua transaksi belanja.
2. **Tanda Terima**: Tanda terima pembayaran honorarium, insentif, uang saku, atau transport guru/pegawai.
3. **Surat Pesanan (SP)**: Dokumen pemesanan resmi kepada penyedia/toko/SIPLah yang memuat spesifikasi pesanan, klausul waktu pengiriman, dan ketentuan pembayaran.
4. **Berita Acara Serah Terima (BAST)**: Dokumen serah terima fisik barang/jasa yang menyatakan barang telah diterima dalam kondisi baik, yang menjadi syarat mutlak pencatatan inventaris KIB (Kartu Inventaris Barang) dan belanja modal.

Sebelumnya, AI Copilot hanya dapat membaca transaksi BKU mentah tanpa memverifikasi apakah berkas dokumen fisik/digitalnya sudah dibuat di SIKAS. Dengan fitur ini:
- Bendahara dapat mengecek status kelengkapan dokumen SPJ untuk transaksi belanja bulanan/tahunan (misal: "Cek kelengkapan dokumen SPJ bulan September", "Apakah ada belanja modal yang belum ada BAST-nya?").
- Bendahara dapat melihat lembar rincian dokumen resmi secara real (misal: "Tampilkan isi BAST pengadaan laptop", "Rincian Surat Pesanan toko Amniar Cell", "Kwitansi nomor bukti 058", "Tanda terima honor guru bulan Agustus").

---

## 2. Arsitektur Relasi Dokumen SPJ

```
                       +---------------------------------------+
                       |           Buku Kas Umum (BKU)         |
                       |       (buku_kas_umums / varian)       |
                       +---------------------------------------+
                                           |
    +------------------+-------------------+-------------------+--------------------+
    |                  |                                       |                    |
    v (1 : N)          v (1 : N)                               v (1 : 1)            v (1 : 1)
+---------------+  +---------------------+               +---------------+    +-------------------+
|   Kwitansi    |  |    Tanda Terima     |               |  Surat Pesanan|    |       BAST        |
|  (kwitansis)  |  |   (tanda_terimas)   |               | (surat_pesans)|    |      (basts)      |
+---------------+  +---------------------+               +---------------+    +-------------------+
```

Setiap model dokumen mendukung 4 varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) yang dipetakan secara dinamis via `VariantConfig::getModelClass($concept, $variant)`.

---

## 3. Spesifikasi Tools AI Copilot

### 3.1. Tool 1: `get_spj_documents_status` (Audit Kelengkapan Dokumen SPJ)
- **Fungsi:** Mengambil daftar transaksi belanja BKU pada suatu periode dan memverifikasi status kelengkapan berkas dokumen pendukung SPJ (Kwitansi, Tanda Terima, Surat Pesanan, BAST).
- **Parameter Input:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `bulan` | string | Tidak | Nama bulan (Januari s.d. Desember, atau 'Semua'). Default: bulan aktif atau Semua. |
  | `tahap` | integer | Tidak | Pilihan Tahap: 1 (Januari–Juni) atau 2 (Juli–Desember). |
  | `status_filter` | string | Tidak | Filter: `semua` (default), `belum_lengkap` (hanya transaksi yang dokumennya kurang), atau `lengkap`. |
  | `tahun` | integer | Tidak | Tahun anggaran pembukuan (default: tahun aktif, misal 2026). |

- **Logika Kepatuhan Cerdas (Compliance Matrix):**
  - **Belanja Modal & Pengadaan Barang Fisik (Kode Rekening 5.2.x atau akun sarana/perabot)**:
    - Wajib: **Kwitansi**, **Surat Pesanan**, dan **BAST**.
  - **Belanja Honorarium & Transport (Akun honor, gaji, narasumber, transport)**:
    - Wajib: **Kwitansi** dan **Tanda Terima**.
  - **Belanja Operasional Umum (Listrik, air, telepon, internet, ATK kecil)**:
    - Wajib: **Kwitansi**.
  - Jika seluruh berkas wajib telah dibuat di database: `status = 'LENGKAP'`.
  - Jika ada berkas wajib yang belum dibuat: `status = 'BELUM_LENGKAP'`, beserta daftar `dokumen_kurang` (contoh: "BAST belum dibuat", "Surat Pesanan belum dibuat").

- **Output JSON:**
  ```json
  {
    "status": "success",
    "tahun": 2026,
    "bulan": "September",
    "ringkasan_kepatuhan": {
      "total_transaksi": 5,
      "transaksi_lengkap": 3,
      "transaksi_belum_lengkap": 2,
      "persentase_kepatuhan": 60.0
    },
    "items": [
      {
        "bku_id": 221,
        "tanggal": "2026-09-15",
        "nomor_bukti": "045/BOSP/2026",
        "uraian": "Pengadaan Laptop Acer Core i9",
        "nama_toko": "CV Mega Komputer",
        "nominal": 27639000,
        "kategori_belanja": "MODAL",
        "kelengkapan": {
          "kwitansi": {"ada": true, "nomor": "KW-045/2026"},
          "surat_pesanan": {"ada": true, "nomor": "SP-045/2026"},
          "bast": {"ada": false, "nomor": null},
          "tanda_terima": {"ada": false, "wajib": false}
        },
        "status_spj": "BELUM_LENGKAP",
        "dokumen_kurang": ["BAST (Berita Acara Serah Terima)"]
      }
    ]
  }
  ```

---

### 3.2. Tool 2: `get_spj_document_detail` (Rincian Lembar Dokumen Resmi)
- **Fungsi:** Mengambil data rincian isi lembar resmi salah satu berkas dokumen SPJ (Kwitansi, Tanda Terima, BAST, atau Surat Pesanan).
- **Parameter Input:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `tipe_dokumen` | string | Ya | Jenis dokumen yang diminta: `kwitansi`, `tanda_terima`, `bast`, atau `surat_pesanan`. |
  | `query` | string | Tidak | Kata kunci pencarian (nomor bukti BKU, nomor surat/dokumen, nama toko rekanan, atau uraian belanja). |
  | `bku_id` | integer | Tidak | ID transaksi BKU spesifik jika diketahui. |
  | `bulan` | string | Tidak | Nama bulan transaksi. |
  | `tahun` | integer | Tidak | Tahun anggaran dokumen (default: tahun aktif). |

- **Output JSON Structure:**
  - Identitas dokumen: nomor resmi, tanggal dokumen, nama sekolah, NPSN.
  - Pihak Pertama (Penyedia / Rekanan / Penerima Uang).
  - Pihak Kedua (Kepala Sekolah / Pejabat Pembuat Komitmen).
  - Rincian item barang / jasa: daftar barang/uraian, volume, satuan, harga satuan, subtotal, kondisi fisik barang (BAIK).
  - Nilai keuangan: Bruto, Potongan Pajak (PPN, PPh 21, PPh 22, PPh 23, Pajak Daerah), Neto yang dibayarkan, serta Terbilang Rupiah resmi.
  - Klausul ketentuan pengiriman dan pembayaran (khusus Surat Pesanan).
  - Kolom tanda tangan: Kepala Sekolah, Bendahara BOS, dan Rekanan/Penerima.

---

## 4. Format Penyajian Respons AI di Chat (System Prompt Bagian 10)

1. **Untuk Audit Kelengkapan Dokumen SPJ (`get_spj_documents_status`):**
   - Header: `### 📑 AUDIT KELENGKAPAN DOKUMEN SPJ — {BULAN/PERIODE}`
   - Badge Status: `[STATUS: {persen}% LENGKAP]` atau `[PERINGATAN: TERDAPAT {N} TRANSAKSI BELUM LENGKAP]`
   - Tabel Matriks HTML Terstruktur Rapi:
     `No` | `Tanggal` | `No. Bukti BKU` | `Uraian Belanja` | `Nominal (Rp)` | `Kwitansi` | `Tanda Terima` | `Surat Pesanan` | `BAST` | `Status SPJ`
   - Indikator centang hijau `✅ Ada` atau silang merah `❌ Belum Ada` (atau `—` jika tidak diwajibkan).
   - Rekomendasi Langkah Aksi:
     * Menjelaskan transaksi mana saja yang belum dilengkapi BAST / Surat Pesanan / Tanda Terima.
     * Mengingatkan bendahara untuk membuka menu dokumen terkait di SIKAS guna melengkapi berkas sebelum pemeriksaan SPJ.

2. **Untuk Lembar Resmi Dokumen SPJ (`get_spj_document_detail`):**
   - Header Dokumen Resmi:
     * `### 📜 KWITANSI PEMBAYARAN BOSP`
     * `### 📝 TANDA TERIMA HONORARIUM / JASA`
     * `### 📦 BERITA ACARA SERAH TERIMA BARANG (BAST)`
     * `### 📋 SURAT PESANAN (SP)`
   - Nomor Dokumen & Tanggal
   - Identitas Para Pihak (Pihak Pertama Rekanan & Pihak Kedua Sekolah)
   - Tabel Rincian Barang / Jasa (Volume, Satuan, Harga Satuan, Jumlah, Kondisi Barang)
   - Tabel Ringkasan Nilai Keuangan: Total Bruto, Potongan Pajak, Total Neto, dan Terbilang Rupiah
   - Lembar Pengesahan / Kolom Tanda Tangan Para Pihak.

---

## 5. Rencana Pengujian & Validasi
1. **Unit Test Backend**:
   - Uji method `getSpjDocumentsStatus` untuk bulan yang sudah memiliki transaksi (misal Maret, September, Oktober) dan verifikasi deteksi dokumen Kwitansi, BAST, SP, dan Tanda Terima.
   - Uji method `getSpjDocumentDetail` untuk tipe `bast`, `surat_pesanan`, `kwitansi`, dan `tanda_terima`.
2. **Live AI Chat Test dengan DeepSeek**:
   - Prompt uji 1: *"Coba cek kelengkapan dokumen SPJ bulan September 2026, apakah kuitansi, tanda terima, BAST, dan surat pesanannya sudah lengkap?"*
   - Prompt uji 2: *"Tampilkan rincian isi BAST untuk transaksi belanja laptop / perabot"*
3. **Pint Code Formatting & Git Commit**:
   - Format seluruh file PHP yang diubah dengan `vendor/bin/pint`.
   - Commit perubahan ke Git.
