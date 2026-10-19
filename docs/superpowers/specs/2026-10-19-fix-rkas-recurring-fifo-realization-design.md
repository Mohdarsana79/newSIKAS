# Spesifikasi Desain: Deteksi Realisasi RKAS Berulang Berbasis FIFO (First-In First-Out)

**Tanggal:** 19 Oktober 2026  
**Status:** Approved (Disepakati melalui sesi Grilling & Brainstorming)  
**Dokumen Terkait:** [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)

---

## 1. Analisis Akar Masalah (Mengapa Sabun Cuci Piring Berstatus Belum Direalisasikan?)

Pengguna melaporkan:
> *"ada data yang belum di realisasikan padahal saya sudah realisasikan di bulan maret :*
> *Perabot Kantor-Sabun Cuci Piring 1 buah Rp 10.000 Rp 10.000*
> *Perabot Kantor-Sabun Cuci Piring 1 buah Rp 10.000 Rp 10.000*
> *Perabot Kantor-Sabun Pembersih Lantai 1 buah Rp 20.000 Rp 20.000*
> *Perabot Kantor-Sabun Pembersih Lantai 1 buah Rp 20.000 Rp 20.000*
> *Perabot Kantor-Sabun Cuci Piring 1 buah Rp 10.000 Rp 10.000*
> *Perabot Kantor-Sabun Pembersih Lantai 1 buah Rp 20.000 Rp 20.000"*

### Temuan Teknis:
1. **Kegiatan Berulang (*Recurring Items*) di RKAS:**
   Barang operasional bulanan seperti *Perabot Kantor - Sabun Cuci Piring* dianggarkan setiap bulan (Januari s.d. Desember, 12 baris dengan `kode_id = 104`, `kode_rekening_id = 14`, nominal Rp 10.000).
   - Baris alokasi Januari memiliki `ID: 857`.
   - Baris alokasi Desember memiliki `ID: 868`.
2. **Pencatatan di BKU (BKU #722 tanggal 04-03-2026):**
   Pada antarmuka BKU, saat belanja 3 botol sabun cuci piring dibukukan sekaligus di bulan Maret, sistem menyimpan kuitansi belanja dengan `rkas_id = 868` (merujuk ke ID baris Desember, bukan ID 857 Januari).
3. **Penyebab Kegagalan Deteksi Sebelumnya:**
   Fungsi deteksi sebelumnya hanya mencari relasi kaku `whereIn('rkas_id', [$item->id])`.
   - Karena baris Januari memiliki `id = 857`, sistem mencari transaksi BKU dengan `rkas_id = 857`.
   - Karena di BKU transaksi tersimpan dengan `rkas_id = 868`, kueri mengembalikan 0 transaksi.
   - Akibatnya, baris Januari dilaporkan sebagai **"⚠️ Belum Direalisasikan"**, padahal barangnya sudah dibeli di bulan Maret!

---

## 2. Solusi: Alokasi Realisasi Berbasis Kelompok Kegiatan & FIFO

### Logika Inti:
1. **Identitas Kelompok Kegiatan (*Recurring Group Key*):**
   Gabungkan kegiatan RKAS yang memiliki identitas sama:
   `kode_id` + `kode_rekening_id` + `LOWER(TRIM(uraian))` + `harga_satuan`.
2. **Koleksi Transaksi Kuitansi BKU Satu Tahun Berjalan:**
   Kumpulkan seluruh kuitansi BKU tahun aktif yang merujuk pada kelompok kegiatan tersebut.
3. **Alokasi Berurutan (FIFO - First-In, First-Out):**
   - Urutkan baris RKAS kelompok tersebut secara kronologis (Januari -> Februari -> Maret -> ... -> Desember).
   - Urutkan transaksi kuitansi BKU secara kronologis berdasarkan `tanggal_transaksi`.
   - Alokasikan kuitansi BKU yang tersedia ke baris anggaran bulan paling awal yang belum terpenuhi:
     - Jatah kuitansi Maret ke-1 (Rp 10.000) dialokasikan untuk anggaran **Januari**.
       -> Status Januari: *"Direalisasikan pd Maret 2026 (Rp 10.000)"*.
     - Jatah kuitansi Maret ke-2 (Rp 10.000) dialokasikan untuk anggaran **Februari**.
       -> Status Februari: *"Direalisasikan pd Maret 2026 (Rp 10.000)"*.
     - Jatah kuitansi Maret ke-3 (Rp 10.000) dialokasikan untuk anggaran **Maret**.
       -> Status Maret: *"Sesuai Jadwal (Maret 2026)"*.
     - Kuitansi April, Mei, Juni dialokasikan untuk bulan April, Mei, Juni.
     - Bulan Juli s.d. Desember yang belum ada kuitansinya berstatus *"Belum Direalisasikan"*.

---

## 3. Rencana Pengujian

1. **Uji RKAS Januari 2026:**
   - Sabun Cuci Piring (ID 857) wajib mendeteksi status *"Direalisasikan pd Maret 2026 (Rp 10.000)"*, bukan *"Belum Direalisasikan"*.
   - Sabun Pembersih Lantai (ID 869) mendeteksi *"Direalisasikan pd Maret 2026 (Rp 20.000)"*.
   - Realisasi Bulan Ini untuk Januari tetap **Rp 0** dan Sisa Pagu **Rp 10.000** (karena transaksi baru terjadi di bulan Maret).
2. **Uji RKAS Maret 2026:**
   - Sabun Cuci Piring & Pembersih Lantai di bulan Maret berstatus *"Sesuai Jadwal (Maret 2026)"*.
