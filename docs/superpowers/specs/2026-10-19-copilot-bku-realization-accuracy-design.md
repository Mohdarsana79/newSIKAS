# Spesifikasi Desain: Akurasi Data Realisasi BKU & Realisasi RKAS Awal pada Copilot AI

**Tanggal:** 19 Oktober 2026  
**Status:** Approved (Disepakati melalui sesi Grilling & Brainstorming)  
**Dokumen Terkait:** [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php), [BukuKasUmumController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuKasUmumController.php), [BukuKasUmum.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/BukuKasUmum.php)

---

## 1. Latar Belakang & Analisis Masalah

Pengguna melaporkan:
> *"saya melihat data realisasi pada BKU tidak akurat. tidak sesuai dengan realisasi pada BKU saya. dan seharusnya sistem dapat mengetahui realisasi RKAS awal pada BKU Secara akurat"*

### Temuan Investigasi Database & Alur Transaksi:
1. **Ketidaksesuaian Sumber Data**:
   - Saat pengguna menanyakan realisasi BKU bulan tertentu (contohnya bulan Maret), AI Copilot sebelumnya hanya memanggil tool `search_rkas_activity` (tabel rencana anggaran RKAS).
   - Di tabel `rkas` perencanaan belanja bulan Maret, anggarannya adalah **Rp 4.321.000**, dan belanja yang tercatat merujuk ke RKAS bulan Maret hanya **Rp 3.988.000**.
   - Sementara itu, di **Buku Kas Umum (BKU)** bulan Maret yang sesungguhnya dicatat oleh bendahara (tabel `buku_kas_umums` dengan tanggal transaksi bulan Maret 2026), total transaksi pembelanjaan adalah **Rp 8.348.000**.
   - Selisih Rp 4.360.000 tersebut terjadi karena dana BOSP Tahap 1 cair pada bulan Maret, sehingga transaksi belanja kegiatan RKAS alokasi bulan Januari dan Februari baru dibayarkan dan dibukukan di BKU pada bulan Maret.
2. **Ketiadaan Tool Khusus Realisasi BKU**:
   - AI sebelumnya tidak memiliki fungsi untuk membaca data transaksi riil dari Buku Kas Umum (`buku_kas_umums` dan `buku_kas_umum_uraian_details`). Akibatnya, AI memaksakan data tabel rencana RKAS untuk menjawab pertanyaan realisasi kas BKU.

---

## 2. Solusi & Arsitektur

### A. Penambahan Tool Baru: `get_bku_monthly_realization`
Menambahkan function calling baru pada [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php):
- **Nama Tool**: `get_bku_monthly_realization`
- **Deskripsi**: *"Mengambil data resmi realisasi pembukuan kas BKU (Buku Kas Umum) pada bulan tertentu dalam tahun anggaran aktif, mencakup total belanja kuitansi yang dibukukan, total belanja kumulatif s.d. bulan tersebut, dan rincian seluruh kuitansi transaksi belanja (tanggal nota, no bukti, uraian belanja, rekanan toko, rekening belanja, nominal kuitansi, dan kegiatan RKAS terkait)."*
- **Parameter**:
  - `bulan` (string, enum: Januari s/d Desember, required): Nama bulan pembukuan BKU yang diminta.
- **Payload Return**:
  - `bulan`: Nama bulan
  - `tahun`: Tahun anggaran aktif
  - `total_belanja_bulan_ini`: Total pengeluaran belanja riil di BKU bulan ini (contoh Maret: Rp 8.348.000)
  - `total_belanja_kumulatif_sd_bulan_ini`: Total belanja s.d. bulan ini
  - `jumlah_transaksi`: Total kuitansi belanja yang tercatat
  - `transaksi`: Array daftar transaksi belanja BKU:
    - `no`: Nomor urut 1, 2, 3...
    - `tanggal`: Tanggal transaksi BKU (format `dd/mm/yyyy`)
    - `no_bukti`: Nomor nota atau ID transaksi pembukuan (`nomor_nota` ?? `id_transaksi`)
    - `uraian`: Uraian pembelanjaan BKU
    - `rekanan`: Nama toko / rekanan penyedia
    - `kode_rekening`: Kode rekening belanja
    - `nama_rekening`: Rincian objek rekening
    - `nominal`: Nominal belanja (`dibelanjakan` / `total_transaksi_kotor`)
    - `kegiatan_rkas_terkait`: Uraian kegiatan RKAS awal yang direalisasikan

### B. Pemisahan Peran Antar-Tool yang Jelas
1. **Pertanyaan Realisasi Kas BKU**:
   - Pertanyaan seperti: *"Berapa realisasi BKU bulan Maret?"*, *"Tampilkan belanja BKU bulan Juni"*, *"Kuitansi apa saja yang dibayar di BKU bulan Maret?"*.
   - **Tindakan AI**: Memanggil `get_bku_monthly_realization`.
   - **Format Tampilan**:
     - Ringkasan eksekutif: Total Belanja Bulan Ini (Rp) dan Total Belanja Kumulatif s.d. Bulan Ini (Rp).
     - Tabel HTML ber-overflow scroll dengan kolom:
       `No` | `Tanggal Transaksi` | `No. Bukti / Nota` | `Uraian Belanja BKU` | `Rekanan / Toko` | `Rekening Belanja` | `Nominal Belanja (Rp)` (rata kanan).
2. **Pertanyaan Rencana Anggaran RKAS**:
   - Pertanyaan seperti: *"Berapa rencana anggaran di RKAS bulan Maret?"*, *"Cari alokasi kegiatan sarpras di RKAS"*.
   - **Tindakan AI**: Memanggil `search_rkas_activity`.
   - Menghitung serapan RKAS Awal berdasarkan relasi `buku_kas_umum_uraian_details` yang merujuk pada RKAS ID tersebut secara akurat.

### C. Konsistensi Keamanan & Tampilan Bersih
- Melarang penampilan kolom ID database (`bku_id`, `rkas_id`) ke antarmuka pengguna.
- Tidak membocorkan nama variabel sistem di chat bubble.
- Tetap mematuhi aturan styling tabel HTML scrollable Tailwind di [CopilotDrawer.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx).

---

## 3. Rencana Pengujian
1. **Uji Realisasi BKU Maret**:
   - Panggil `getBkuMonthlyRealization(2026, 'Maret', 'reguler')`.
   - Verifikasi total belanja adalah **Rp 8.348.000** (100% cocok dengan Buku Kas Umum bulan Maret).
   - Verifikasi seluruh kuitansi (Materai, ATK HVS, Kipas Angin, dsb.) tercatat lengkap dengan nominal dan rekannya.
2. **Uji Skenario Chat Prompt**:
   - Verifikasi AI secara akurat memilih `get_bku_monthly_realization` saat ditanya realisasi BKU.
   - Verifikasi tabel HTML tersusun rapi dengan kolom No, Tanggal, No. Bukti, Uraian, Toko, Rekening, dan Nominal Belanja.
