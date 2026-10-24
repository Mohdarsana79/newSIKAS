# Design Spec: Standarisasi Panduan Penatausahaan (Aktivasi BKU, Penerimaan Dana, & Kartu Bulan) pada AI Copilot

**Tanggal**: 2026-10-23  
**Topik**: Peningkatan Kualitas Panduan AI Copilot untuk Fitur Penatausahaan BKU  
**Target Modul**: `app/Services/Ai/CopilotService.php`, `tests/Unit/CopilotSpjTandaTerimaTest.php`

---

## 1. Latar Belakang & Masalah
Pengguna menginginkan agar AI Copilot SIKAS dapat menjelaskan fitur **Penatausahaan** secara lebih jelas, rapi, terstruktur, dan mudah dipahami oleh bendahara maupun operator sekolah. Draft panduan asli dari pengguna menjelaskan fungsi aktivasi BKU, tab varian BOSP, tombol Tarik dari ARKAS, Tambah Penerimaan Dana, dan mekanisme penguncian kartu bulan Januari sampai Desember.

Sesuai konfirmasi pengguna, panduan akan distandarisasi ke dalam **3 Bagian Komprehensif**:
1. **Bagian 1: Konsep Aktivasi BKU & Tab Varian BOSP**
2. **Bagian 2: Penjelasan 3 Menu / Tombol Utama (Tarik ARKAS, Tambah Penerimaan Dana, Cetak)**
3. **Bagian 3: Mekanisme Rantai Buka-Kunci 12 Kartu Bulan & 5 Status Kartu (Terkunci, Belum di isi, Draft, Belum Lapor Pajak, Selesai)**

---

## 2. Struktur Panduan Resmi yang Disempurnakan

### Bagian 1: Konsep Aktivasi BKU & Tab Varian BOSP
- **Fungsi Utama**: Fitur Penatausahaan digunakan untuk mengelola pembukuan kas harian (Buku Kas Umum / BKU), mencatat penerimaan transfer dana BOSP dan saldo awal bank, mencatat mutasi kas tunai & bank, merealisasikan belanja barang/jasa/modal, serta melakukan tutup buku bulanan.
- **Syarat Aktivasi**: Kartu tahunan BKU pada fitur Penatausahaan **hanya akan muncul jika data RKAS (Penganggaran) sudah dibuat terlebih dahulu**.
- **Tab Varian Anggaran**:
  - `BOSP Reguler`
  - `BOSP Kinerja`
  - `SiLPA BOSP Reguler`
  - `SiLPA BOSP Kinerja`
  *(Pilih tab varian anggaran yang sesuai untuk melihat kartu tahun anggaran dan bulan pembukuan yang aktif).*

### Bagian 2: Penjelasan 3 Menu / Tombol Utama
1. **Tarik BKU dari ARKAS** (Tombol Hijau):
   - Berfungsi menarik seluruh data pembukuan BKU dari database aplikasi desktop ARKAS secara otomatis untuk seluruh bulan dalam tahun anggaran berjalan.
   - Data yang ditarik meliputi: penerimaan transfer dana, penarikan tunai dari bank, setoran tunai ke bank, belanja kas/non-tunai yang direalisasikan, hingga status tutup buku bulanan.
   - ⚠️ **Peringatan Krusial (Data Integrity)**: *Sebelum menarik data BKU dari ARKAS, pastikan data RKAS sudah ditarik terlebih dahulu dari ARKAS ke SIKAS*. Jika data RKAS belum ada atau tidak sinkron dengan ARKAS, sistem tidak dapat memetakan transaksi belanja ke kode kegiatan/rekening belanja yang berisiko merusak data BKU.
2. **Tambah Penerimaan Dana** (Tombol Biru):
   - Berfungsi untuk mencatat penerimaan dana transfer BOSP (Tahap 1 dan Tahap 2) serta Saldo Awal kas di bank.
   - Dasar Penginputan: Wajib mengacu pada **Rekening Koran Bank** sekolah atau portal resmi transfer BOSP Kemendikbudristek.
   - **Saldo Awal Bank**: Apabila rekening koran awal tahun memiliki sisa saldo kas (misal jasa giro/bunga yang belum ditarik), maka tanggal dan nilai saldo awal tersebut **wajib diisi pada formulir Tahap 1** agar saldo kas di bank sinkron dan klop dengan fisik rekening koran.
3. **Cetak** (Tombol Putih / Abu-abu):
   - Berfungsi untuk masuk ke halaman **Rekapitulasi Kas & Cetak Penatausahaan**.
   - Digunakan untuk mencetak: Buku Kas Umum (BKU), Buku Pembantu Kas Tunai, Buku Pembantu Bank, Buku Pembantu Pajak, dan Lembar Rekapitulasi Penutupan Kas Bulanan.

### Bagian 3: Mekanisme Rantai Buka-Kunci 12 Kartu Bulan & 5 Indikator Status
- **Rantai Pembukaan Kartu Bulan (Sequential Workflow)**:
  - Kartu bulan terdiri dari **Januari sampai Desember**.
  - Kondisi awal seluruh kartu bulan berstatus **Terkunci** apabila Penerimaan Dana Tahap 1 belum diinput.
  - Setelah Penerimaan Dana Tahap 1 berhasil disimpan, kartu bulan **Januari** otomatis terbuka (`Belum di isi`).
  - Pembukuan berjalan berurutan: bulan Februari baru akan terbuka jika bulan Januari sudah dilakukan **Tutup Buku** (status `Selesai`). Demikian seterusnya hingga bulan Juni.
  - **Syarat Khusus Bulan Juli (Awal Tahap 2)**: Pada kartu bulan Juli, sistem mewajibkan penginputan **Penerimaan Dana Tahap 2**. Jika belum diinput, kartu bulan Juli dan bulan berikutnya di semester 2 (Agustus–Desember) akan terkunci dan menampilkan modal peringatan *"Penerimaan Dana Tahap 2 Belum Ada"*.
- **5 Status Indikator Kartu Bulan**:
  1. `Terkunci` (Abu-abu): Bulan belum dapat diakses karena belum memenuhi syarat pembukuan bulan sebelumnya atau belum ada penerimaan dana tahapan.
  2. `Belum di isi` (Biru): Kartu bulan sudah terbuka, namun belum ada transaksi belanja kas yang diinput.
  3. `Draft` (Kuning): Bulan sedang aktif dalam proses penginputan transaksi kas dan belanja.
  4. `Belum Lapor Pajak` (Merah): Seluruh belanja sudah diinput namun terdapat pungutan pajak yang belum dicatat bukti setor pajaknya ke kas negara.
  5. `Selesai` (Hijau): Buku Kas Umum bulan tersebut telah ditutup buku secara sah dengan saldo akhir kas yang seimbang.

---

## 3. Strict Rules & Guardrails
1. **Strict Zero Internal URL Path Rule**:
   - Dilarang keras menampilkan link seperti `/penatausahaan`, `/penatausahaan/bku`, `/bku`, `/laporan`, dll.
   - Seluruh panduan merujuk pada nama menu visual: "Menu Penatausahaan di sidebar sebelah kiri".
2. **Kerahasiaan & Personalisasi**:
   - Dilarang menyebut nama pribadi pengguna ("Moh Gian Darsana").
   - Sapaan hangat dan santai khas bendahara ("Siap Om!", "Om", "Bos").
3. **Format Markdown Rapi**:
   - Disajikan dengan heading terstruktur, tabel perbandingan, alert tips/peringatan, dan daftar poin bernomor.

---

## 4. Rencana Pengujian
1. Unit testing via `tests/Unit/CopilotSpjTandaTerimaTest.php` untuk memverifikasi seluruh komponen panduan ada pada system prompt dan tersanitasi.
2. Live query testing via DeepSeek API untuk memverifikasi respons chat langsung.
