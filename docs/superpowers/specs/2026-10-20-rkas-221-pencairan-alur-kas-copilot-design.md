# Spesifikasi Desain: Integrasi Lembar Kerja 221, Rincian Pencairan, dan Alur Kas pada AI Copilot

- **Tanggal**: 2026-10-20
- **Status**: Disetujui
- **Topik**: AI Copilot Financial Intelligence - Lembar Kerja 221, Rincian Pencairan, & Alur Kas
- **File Terkait**:
  - `app/Services/Ai/CopilotService.php`
  - `app/Http/Controllers/RkasController.php`
  - `app/Http/Controllers/RkasPerubahanController.php`
  - `resources/js/Pages/Penganggaran/Rkas/Partials/TabAlurKas.tsx`
  - `resources/js/Pages/Penganggaran/Rkas/Partials/TabRincianPencairan.tsx`

---

## 1. Latar Belakang & Tujuan

Aplikasi SIKAS menyajikan 3 laporan perencanaan anggaran penting yang sering ditanyakan oleh pihak sekolah dan dinas:
1. **Lembar Kerja 221 (Formulir RKA SKPD 2.2.1)**: Dokumen kerja resmi rincian belanja berjenjang yang menyandingkan kode rekening hierarkis belanja (`5`, `5.1`, `5.1.02`, `5.1.02.01`, dst.) dengan item-item barang/jasa rincian (volume, satuan, harga satuan, dan subtotal).
2. **Rincian Pencairan (RP)**: Dokumen penatausahaan dan persiapan pencairan belanja per Tahap (Tahap 1 / Tahap 2) dan per Bulan yang mencantumkan nama penerima, jabatan, rekening bank, bruto anggaran, potongan pajak (PPN, PPh 21, PPh 23), dan jumlah neto yang diterima.
3. **Alur Kas**: Matriks sebaran penggunaan kas bulanan sepanjang tahun (12 bulan: Jan–Des) per program dan kegiatan, dilengkapi pergerakan saldo kas masuk (cair 50% di Tahap I & 50% di Tahap II) terhadap total belanja bulanan dan saldo kas kumulatif.

Saat ini, AI Copilot belum memiliki tool khusus untuk mengambil ketiga data di atas secara spesifik, sehingga pertanyaan terkait rincian item belanja 221, daftar penerima/potongan pencairan, maupun simulasi alur kas bulanan belum dapat dijawab dengan data riil dari database.

Spesifikasi ini mendefinisikan penambahan **3 Tool Spesialis** pada `CopilotService` agar AI Copilot dapat merespons pertanyaan pengguna secara akurat, transparan, dan berbasis data riil baik untuk **RKAS Murni** maupun **RKAS Perubahan**.

---

## 2. Arsitektur 3 Tool Spesialis

### 2.1. Tool 1: `get_lembar_kerja_221`
- **Fungsi**: Mengambil data formulir Lembar Kerja 221 (interleaving hierarki rekening belanja + baris rincian item).
- **Skema Parameter**:
  - `tahun` (integer, opsional, default: 2025): Tahun anggaran yang dianalisis.
  - `variant` (string, opsional, default: 'reguler'): Varian anggaran (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
  - `tipe_dokumen` (string, opsional, default: 'aktif'): Pilihan dokumen:
    - `'aktif'`: Menggunakan RKAS Perubahan jika ada yang aktif, atau RKAS Murni jika belum ada perubahan.
    - `'perubahan'`: Mengambil data dari RKAS Perubahan secara spesifik.
    - `'murni'`: Mengambil data dari RKAS Awal / Murni secara spesifik.
  - `kode_rekening` (string, opsional): Filter kode rekening tertentu (misal `'5.1.02.01'` untuk belanja barang saja, atau `'5.2'` untuk belanja modal).
  - `limit` (integer, opsional, default: 50): Batas jumlah baris item untuk menjaga efisiensi token prompt.

- **Struktur Payload Output**:
  ```json
  {
    "tahun": 2025,
    "tipe_dokumen": "perubahan",
    "total_pagu": 31320000,
    "total_belanja": 31320000,
    "defisit": 0,
    "hierarki_summary": [
      { "kode_rekening": "5", "uraian": "BELANJA", "jumlah": 31320000 },
      { "kode_rekening": "5.1", "uraian": "BELANJA OPERASI", "jumlah": 28837000 },
      { "kode_rekening": "5.2", "uraian": "BELANJA MODAL", "jumlah": 2483000 }
    ],
    "rows": [
      { "type": "header", "kode_rekening": "5", "uraian": "BELANJA", "jumlah": 31320000 },
      { "type": "header", "kode_rekening": "5.1", "uraian": "BELANJA OPERASI", "jumlah": 28837000 },
      { "type": "header", "kode_rekening": "5.1.02", "uraian": "BELANJA BARANG DAN JASA", "jumlah": 28837000 },
      { "type": "header", "kode_rekening": "5.1.02.01", "uraian": "BELANJA BARANG", "jumlah": 7333000 },
      { "type": "item", "kode_rekening": "5.1.02.01.01.0024", "uraian": "Kertas HVS A4 70gr", "volume": 10, "satuan": "Rim", "harga_satuan": 55000, "jumlah": 550000 }
    ]
  }
  ```

---

### 2.2. Tool 2: `get_rincian_pencairan`
- **Fungsi**: Mengambil data penatausahaan rincian pencairan dana per tahap dan bulan beserta penerima, bank, dan potongan pajaknya.
- **Skema Parameter**:
  - `tahun` (integer, opsional, default: 2025).
  - `variant` (string, opsional, default: 'reguler').
  - `tahap` (integer, opsional, default: null): Filter Tahap `1`, `2`, atau `null` (semua tahap).
  - `bulan` (string, opsional, default: 'Semua'): Filter nama bulan (`'Januari'`, `'Februari'`, ..., `'Desember'`, atau `'Semua'`).
  - `tipe_dokumen` (string, opsional, default: 'aktif'): `'aktif'`, `'perubahan'`, atau `'murni'`.

- **Aturan Bisnis SIKAS**:
  - Pada dokumen RKAS Perubahan: Tahap 1 tetap berasal dari data awal yang sudah berjalan, sedangkan Tahap 2 mengambil dari RKAS Perubahan (sesuai logika `rincianGabungan` di `RkasPerubahanController`).
  - Menghitung pajak total:
    - PPN: `pot_ppn`
    - PPh 21: `pot_pph21 + pot_pph21_narasumber`
    - PPh 23: `pot_pph23`
    - Jumlah Diterima (Neto) = `bruto - (PPN + PPh 21 + PPh 23)`.
  - Jika nama penerima / rekening belum diisi oleh bendahara, berikan nilai default `'-'`.

- **Struktur Payload Output**:
  ```json
  {
    "tahun": 2025,
    "tipe_dokumen": "perubahan",
    "filter_tahap": 1,
    "filter_bulan": "Maret",
    "ringkasan": {
      "total_anggaran_bruto": 6089000,
      "total_pot_ppn": 0,
      "total_pot_pph21": 0,
      "total_pot_pph23": 0,
      "total_pajak": 0,
      "total_diterima_neto": 6089000,
      "jumlah_item": 8
    },
    "items": [
      {
        "no": 1,
        "kode_rekening": "5.1.02.01.01.0024",
        "kode_kegiatan": "03.02.01",
        "nama_kegiatan": "Pengadaan Alat Olahraga Kok Bulu Tangkis",
        "bulan": "Maret",
        "tahap": 1,
        "nama_penerima": "-",
        "jabatan": "-",
        "nomor_rekening": "-",
        "bank": "-",
        "nomor_kwitansi": "-",
        "bruto": 120000,
        "pot_ppn": 0,
        "pot_pph21": 0,
        "pot_pph23": 0,
        "diterima_neto": 120000
      }
    ]
  }
  ```

---

### 2.3. Tool 3: `get_alur_kas`
- **Fungsi**: Mengambil alur kas sebaran 12 bulan (Jan–Des), penerimaan per tahap, total belanja bulanan, dan saldo kas akhir tiap bulan.
- **Skema Parameter**:
  - `tahun` (integer, opsional, default: 2025).
  - `variant` (string, opsional, default: 'reguler').
  - `tahap` (integer, opsional, default: null): `1` (Jan–Jun), `2` (Jul–Des), atau `null` (12 bulan penuh).
  - `tipe_dokumen` (string, opsional, default: 'aktif'): `'aktif'`, `'perubahan'`, atau `'murni'`.

- **Aturan Alur Kas**:
  - **Penerimaan Dana**:
    - Tahap I: Cair di bulan **Januari** sebesar 50% dari total pagu (Rp 15.660.000).
    - Tahap II: Cair di bulan **Juli** sebesar 50% dari total pagu (Rp 15.660.000).
  - **Saldo Kas Bulanan**:
    - Saldo Awal Januari = Rp 0.
    - Kas Masuk = Penerimaan tahap terkait.
    - Kas Keluar = Total Belanja bulan tersebut.
    - Saldo Akhir Bulan $n$ = Saldo Awal $n$ + Kas Masuk $n$ - Belanja $n$.
    - Saldo Akhir Desember harus kembali menjadi **Rp 0** jika seluruh anggaran terserap seimbang.

- **Struktur Payload Output**:
  ```json
  {
    "tahun": 2025,
    "tipe_dokumen": "perubahan",
    "pagu_anggaran": 31320000,
    "penerimaan": {
      "tahap_1": 15660000,
      "tahap_2": 15660000
    },
    "alur_bulanan": [
      {
        "bulan": "Januari",
        "tahap": 1,
        "saldo_awal": 0,
        "penerimaan": 15660000,
        "belanja": 1912000,
        "saldo_akhir": 13748000
      },
      {
        "bulan": "Februari",
        "tahap": 1,
        "saldo_awal": 13748000,
        "penerimaan": 0,
        "belanja": 1687000,
        "saldo_akhir": 12061000
      }
    ],
    "rekap_kegiatan": [
      {
        "kode_kegiatan": "03.02.01",
        "nama_kegiatan": "Kegiatan Pembelajaran dan Ekstrakurikuler",
        "pagu": 120000,
        "sebaran_bulan": { "Januari": 0, "Februari": 0, "Maret": 120000, "April": 0, ... }
      }
    ]
  }
  ```

---

## 3. Gaya Penyajian Prompt Copilot

AI Copilot diinstruksikan untuk menyajikan respons dalam tabel HTML rapi dengan gaya bahasa yang santai, bersahabat ("Om", "Bos"), dan lugas:
1. **Untuk Lembar Kerja 221**:
   - Sajikan tabel yang menonjolkan Kode Rekening, Uraian, Volume, Satuan, Harga Satuan, dan Jumlah (Rp).
   - Baris hierarki akun ditebalkan (bold).
   - Menjelaskan total anggaran belanja dan status keseimbangan anggaran (defisit Rp 0).
2. **Untuk Rincian Pencairan**:
   - Berikan ringkasan akumulasi: Total Anggaran Bruto, Total Potongan Pajak (PPN, PPh 21, PPh 23), dan Total Bersih / Neto yang Diterima.
   - Sajikan tabel rincian transaksi: No, Uraian Kegiatan, Bulan/Tahap, Penerima, Rekening Bank, Bruto, Pajak, dan Neto.
3. **Untuk Alur Kas**:
   - Sajikan tabel pergerakan kas bulanan: Bulan, Tahap, Saldo Awal, Penerimaan, Belanja, dan Saldo Akhir.
   - Tegaskan bahwa pergerakan kas sehat (saldo akhir tidak pernah negatif) dan berakhir seimbang Rp 0 pada penutupan tahun anggaran.

---

## 4. Rencana Verifikasi & Testing

1. **Uji Langsung Method Controller / Service**:
   - Buat file test scratch `scratch/test_copilot_221_rp_alur.php` untuk memverifikasi eksekusi ketiga tool secara langsung dengan database riil PostgreSQL.
2. **Uji End-to-End Chat LLM**:
   - Buat script simulasi live chat `scratch/test_copilot_chat_221_rp_alur.php` untuk memastikan model DeepSeek memanggil tool yang benar saat ditanya tentang Lembar Kerja 221, Rincian Pencairan, dan Alur Kas.
3. **Pint Code Style Check**:
   - Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php` untuk menjamin kerapian kode sesuai standar Laravel.
