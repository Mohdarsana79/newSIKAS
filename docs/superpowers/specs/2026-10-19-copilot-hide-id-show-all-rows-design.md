# Spesifikasi Desain: Tampilkan Seluruh Baris RKAS, Sembunyikan ID Kegiatan, dan Eliminasi Variabel Teknis (found_count)

**Tanggal:** 19 Oktober 2026  
**Status:** Approved (Disepakati melalui sesi Grilling & Brainstorming)  
**Dokumen Terkait:** [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php), [CopilotDrawer.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx)

---

## 1. Latar Belakang & Masalah

Pengguna melaporkan 3 kendala saat meminta data RKAS bulanan (contohnya bulan Maret):
1. **Pemotongan Baris Data**:
   - Query RKAS bulan Maret pada database sekolah sebenarnya memiliki **54 baris belanja**.
   - Namun sistem AI hanya menampilkan 15 baris karena adanya batasan `->take(15)`. Pengguna menginginkan seluruh baris pada bulan terkait tampil lengkap.
2. **Munculnya ID Kegiatan di Antarmuka Pengguna**:
   - AI menampilkan kolom atau informasi "ID Kegiatan" (angka ID internal database) di dalam chat/tabel.
   - Pengguna menegaskan: *User/bendahara tidak boleh tahu dan tidak boleh melihat ID Kegiatan sama sekali*.
3. **Kebocoran Nama Variabel Teknis (`found_count`)**:
   - AI menyebutkan variabel teknis seperti `found_count` di teks chat bubble (contoh: *"Ditemukan found_count: 15 kegiatan..."*).
   - Pengguna menginginkan antarmuka yang 100% bersih dari variabel JSON/database, menggunakan bahasa Indonesia alami dan formal.

---

## 2. Solusi & Keputusan Desain

### A. Tampilkan Seluruh Baris RKAS Bulanan
- Hapus batasan pemotongan `->take(15)` pada `searchRkasActivity` jika sedang mencari kegiatan bulanan (atau atur batas wajar yang mencakup seluruh anggaran sekolah, misal hingga 200 baris per bulan).
- Seluruh baris (misal 54 baris untuk bulan Maret) akan disajikan dalam tabel HTML lengkap.
- Tampilan tabel tetap nyaman dibaca dan tidak merusak layout karena wadah tabel di [CopilotDrawer.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx) sudah memiliki fitur `max-h-72 overflow-y-auto` dengan *sticky table header*.

### B. Penyembunyian 100% ID Kegiatan dari Tampilan Pengguna
- **Tampilan Chat & Tabel**:
   - Kolom ID Kegiatan **dihapus mutlak** dari format tabel HTML.
   - Kolom resmi tabel RKAS:
     1. **No** (Nomor urut 1, 2, 3...)
     2. **Bulan**
     3. **Uraian Barang / Kegiatan**
     4. **Rekening Belanja** (Kode & Nama)
     5. **Total Anggaran** (Format Rp, rata kanan)
     6. **Realisasi Belanja** (Format Rp, rata kanan)
     7. **Sisa Anggaran** (Format Rp, rata kanan)
- **Kebutuhan Drafting Transaksi BKU**:
   - Di balik layar (data JSON fungsi internal yang diterima model), ID tetap disimpan pada properti tersembunyi `_internal_id` atau `rkas_id` agar fungsi pencatatan belanja BKU (`prepare_bku_transaction_draft`) tetap bisa bekerja jika bendahara meminta.
   - AI dilarang keras memunculkan ID tersebut ke teks atau tabel.

### C. Eliminasi Variabel Teknis (`found_count`, dsb.)
1. **Refactoring Tool Return Payload**:
   - Hapus properti `found_count` dari hasil `search_rkas_activity`.
   - Ubah format pengembalian informasi jumlah menjadi kalimat naratif manusiawi di dalam JSON, misalnya `'ringkasan' => "Ditemukan 54 kegiatan pada bulan Maret"`.
2. **Pengetatan System Prompt**:
   - Tambahkan instruksi larangan keras menyebutkan nama properti JSON seperti `found_count`, `filter_bulan`, `items`, `id_kegiatan`.
   - Instruksikan AI untuk menulis kalimat pengantar yang alami (contoh: *"Berikut adalah 54 rincian kegiatan belanja pada bulan Maret 2026:"*).
3. **Penyempurnaan Backend Post-Processing Sanitizer (`sanitizeResponseText`)**:
   - Tambahkan pola pembersihan regex untuk membersihkan kemunculan variabel `found_count`, `filter_bulan`, dan sejenisnya jika model sempat menulisnya:
     ```php
     $replacements = [
         '/\bfound_count\b/i' => 'jumlah data',
         '/\bfilter_bulan\b/i' => 'bulan',
         '/\bid_kegiatan\b/i' => '',
         '/\brkas_id\b/i' => '',
     ];
     ```
   - Hapus secara otomatis jika ada header kolom `<th>ID Kegiatan</th>` atau `<th>ID</th>` di tabel HTML jika AI sempat membuatnya.

---

## 3. Rencana Pengujian
1. **Uji Pengambilan Semua Baris**: Memanggil `searchRkasActivity(2026, '', 'reguler', 'Maret')` dan memverifikasi seluruh 54 baris kegiatan bulan Maret berhasil diambil.
2. **Uji Penghapusan ID Kegiatan**: Memastikan tidak ada kolom atau teks ID Kegiatan yang muncul pada chat bubble.
3. **Uji Eliminasi Variabel Teknis**: Memverifikasi teks respons AI tidak lagi memuat kata `found_count`, `filter_bulan`, dsb.
