# Spesifikasi Desain: Rekomendasi Kode Kegiatan & Rekening Belanja Real Master Data pada AI Copilot

**Tanggal**: 2026-10-20  
**Topik**: Rekomendasi Kode Kegiatan (SNP) & Rekening Belanja (Operasi vs Modal) Real Time  
**Status**: Disetujui Pengguna (Approved)

---

## 1. Latar Belakang & Kebutuhan
Bendahara sekolah seringkali membutuhkan konsultasi saat merencanakan pembelian barang atau jasa (misal: *"Saya ingin belanja kursi, kode kegiatan apa dan rekening apa yang cocok? Masuk belanja modal atau operasi?"*). 

Sebelumnya, AI Copilot:
1. Hanya memiliki tool `search_rkas_activity` yang mencari rincian yang *sudah pernah dianggarkan* di RKAS sekolah tahun berjalan.
2. Belum memiliki tool khusus untuk menjelajahi seluruh master data standar nasional:
   - `kode_kegiatans`: 314 kegiatan standar SNP (Standar Sarpras, Standar Pengelolaan, Standar Proses, dsb.).
   - `rekening_belanjas`: 280 akun belanja standar Permendagri (Belanja Operasi `5.1.x`, Belanja Modal `5.2.x`).
3. Risiko halusinasi kode rekening atau kegiatan jika AI tidak diberikan akses langsung ke tabel master data.

### Tujuan Desain:
1. Menyediakan tool `recommend_activity_and_account` yang mengakses langsung data master nyata (`kode_kegiatans` dan `rekening_belanjas`).
2. Menghasilkan rekomendasi komparasi yang jelas antara **Belanja Modal (Aset Tetap)** dan **Belanja Operasi (Barang Pakai Habis/Perabot)** beserta kriteria pemilihannya (batas kapitalisasi aset dan masa manfaat).
3. Menyertakan informasi riwayat nyata jika pasangan kegiatan dan rekening belanja tersebut pernah digunakan di RKAS sekolah sebelumnya.

---

## 2. Arsitektur & Spesifikasi Teknis

### A. Definisi Tool OpenAI-Compatible (`CopilotService::getAvailableTools`)
- **Nama Tool**: `recommend_activity_and_account`
- **Deskripsi**: "Mencari dan merekomendasikan pasangan Kode Kegiatan (SNP) dan Kode Rekening Belanja resmi (Belanja Operasi vs Belanja Modal) yang paling tepat untuk suatu rencana pembelian barang/jasa berdasarkan master data standar Permendagri/BOSP dan riwayat RKAS sekolah. Panggil tool ini saat pengguna bertanya tentang rekomendasi kode kegiatan, kode rekening belanja yang cocok untuk suatu barang/jasa (contoh: kursi, laptop, buku, cat, genset, internet, konsumsi rapat), atau menanyakan apakah belanja tersebut masuk Belanja Modal atau Belanja Operasi."
- **Parameters**:
  - `query` *(string, required)*: Nama barang, jasa, atau kegiatan yang ingin dibelanjakan (misal: "kursi", "mebel", "laptop", "buku perpustakaan", "cat", "ac").
  - `estimasi_harga` *(number, optional)*: Estimasi harga satuan per unit.
  - `kategori_preferensi` *(string, optional, enum: ['semua', 'operasi', 'modal'])*: Filter jenis belanja jika pengguna secara eksplisit menanyakan kategori tertentu.

### B. Implementasi Method Backend (`CopilotService::recommendActivityAndAccount`)
Method: `protected function recommendActivityAndAccount(string $query, ?float $estimasiHarga = null, string $kategoriPreferensi = 'semua', ?int $tahun = null, string $variant = 'reguler'): array`

1. **Mapping Kata Kunci & Sinonim**:
   Menyediakan kamus sinonim istilah belanja umum:
   - "kursi" / "meja" -> ["mebel", "perabot", "kursi", "meja", "sarana"]
   - "laptop" / "komputer" / "pc" -> ["komputer", "laptop", "peralatan personal komputer", "multimedia"]
   - "buku" -> ["buku", "kepustakaan", "perpustakaan", "literasi"]
   - "ac" / "pendingin" -> ["pendingin", "pengkondisi udara", "elektronik", "peralatan"]
   - "cat" / "semen" / "kuas" -> ["pemeliharaan", "bahan bangunan", "prasarana lahan"]
   - "makan" / "minum" / "snack" / "kue" -> ["makanan dan minuman", "konsumsi", "rapat"]

2. **Query Rekening Belanja (`RekeningBelanja`)**:
   - Mencari akun berdasarkan query dan sinonim pada kolom `rincian_objek` dan `kode_rekening`.
   - Mengelompokkan hasil menjadi:
     * `modal`: Rekening berkode `5.2...` (Modal Peralatan dan Mesin, Modal Aset Tetap Lainnya, Modal Jalan/Jaringan/Irigasi).
     * `operasi`: Rekening berkode `5.1...` (Belanja Bahan Pakai Habis, Perabot Kantor, Pemeliharaan, Jasa, dsb.).

3. **Query Kode Kegiatan (`KodeKegiatan`)**:
   - Mencari kegiatan berdasarkan query dan sinonim pada kolom `uraian`, `sub_program`, dan `program`.
   - Memetakan kegiatan pengadaan baru vs pemeliharaan.

4. **Pemeriksaan Riwayat Pemakaian RKAS Sekolah**:
   - Query ke tabel `rkas` / `rkas_perubahans` milik sekolah aktif untuk mencari pasangan kegiatan + rekening yang pernah memuat nama barang tersebut.
   - Menghasilkan statistik `riwayat_pemakaian_sekolah` (jumlah pemakaian dan contoh uraian belanja riil).

5. **Payload Return Tool**:
   - `status`: `'success'`
   - `query`: string
   - `rekomendasi_modal`: array opsi Belanja Modal dengan panduan kriteria kapitalisasi.
   - `rekomendasi_operasi`: array opsi Belanja Operasi dengan panduan kriteria non-kapitalisasi/pakai habis.
   - `rekomendasi_pemeliharaan`: array opsi Belanja Pemeliharaan jika barang ditujukan untuk servis/perbaikan.
   - `panduan_penentuan`: Penjelasan batas kapitalisasi aset daerah dan masa manfaat.
   - `riwayat_rkas_sekolah`: Informasi penggunaan riil di sekolah.

### C. Pembaruan System Prompt AI (`CopilotService::buildSystemPrompt`)
Instruksi tegas kepada model AI:
1. Saat pengguna menanyakan kode kegiatan atau kode rekening yang cocok untuk suatu barang/jasa:
   - **WAJIB memanggil `recommend_activity_and_account`**. DILARANG KERAS mengarang kode kegiatan atau rekening sendiri tanpa tool!
2. Sajikan jawaban dalam struktur rapi:
   - **Opsi Belanja Modal (Aset Tetap)**: Kode Rekening, Uraian Rekening, Kode Kegiatan (SNP), Uraian Kegiatan, dan Kapan Memilih Ini (harga satuan memenuhi batas kapitalisasi aset daerah >= Rp 500rb / 1jt, masa manfaat > 12 bulan, masuk KIB).
   - **Opsi Belanja Operasi (Non-Aset / Pakai Habis)**: Kode Rekening, Uraian Rekening, Kode Kegiatan, Uraian Kegiatan, dan Kapan Memilih Ini (harga di bawah batas kapitalisasi atau tidak memenuhi syarat aset tetap).
   - **Opsi Pemeliharaan**: Jika tujuannya perbaikan / servis barang lama.
   - **Sertakan riwayat RKAS sekolah** jika pernah digunakan sebelumnya.

---

## 3. Rencana Pengujian
1. **Unit Verification Test**:
   - Menguji query `"kursi"`:
     * Rekomendasi Modal menghasilkan `5.2.02.05.02.0001` (Belanja Modal Mebel) dan kegiatan `05.08.02.`.
     * Rekomendasi Operasi menghasilkan `5.1.02.01.01.0030` (Perabot Kantor) dan kegiatan `06.05.10.`.
     * Rekomendasi Pemeliharaan menghasilkan `5.1.02.03.02.0118` (Pemeliharaan Mebel) dan kegiatan `05.08.05.`.
   - Menguji query `"laptop"`:
     * Menghasilkan Rekening Modal Komputer/Laptop dan Belanja Operasi Komponen/Peralatan.
2. **Live AI Chat Test**:
   - Menanyakan: *"saya ingin belanja kursi kode kegiatan apa dan rekening apa yang cocok ? jadi AI nya akan menjawab dengan real dan apakah cocoknya di belanja modal atau operasi"*
   - Memastikan AI memanggil `recommend_activity_and_account` dan menyajikan opsi Modal vs Operasi secara detail, lengkap, dan presisi.
