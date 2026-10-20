# Spesifikasi Desain: Deteksi & Agregasi Fitur Gabung Uraian pada Rincian Pencairan AI Copilot

**Tanggal**: 2026-10-20  
**Topik**: Deteksi Transaksi Gabung Uraian & Konsistensi Pajak pada AI Copilot SIKAS  
**Status**: Disetujui Pengguna (Approved)

---

## 1. Latar Belakang & Masalah
Pada aplikasi SIKAS, modul Rincian Pencairan (RP) memiliki fitur **Gabung Uraian** (`uraian_gabungan`). Fitur ini memungkinkan bendahara menggabungkan beberapa rincian belanja yang memiliki kode rekening dan kode kegiatan yang sama (serta bulan dan kuitansi yang sama) menjadi satu kesatuan kuitansi belanja resmi.

Contoh nyata pada data tahun 2026:
- **Bulan September, Kwitansi `058/BOSP/THP-II/2026` (Toko Surya Jaya)**:
  Terdapat 3 rincian belanja:
  1. *Kuas Biasa* (Bruto: Rp 60.000, PPh 23: Rp 2.400)
  2. *Cat Tembok Nippon Paint* (Bruto: Rp 330.000, PPh 23: Rp 13.200)
  3. *Kuas Roll* (Bruto: Rp 100.000, PPh 23: Rp 4.000)
  Ketiganya digabung menjadi **"Pemeliharaan Prasarana Lahan, Bangunan dan Ruang"** dengan **Total Bruto Rp 490.000** dan **Total PPh 23 Rp 19.600**.
- **Bulan September, Kwitansi `057/BOSP/THP-II/2026` (Toko Surya Jaya)**:
  Terdapat 7 rincian belanja ATK (*Pensil, Kertas F4, Spidol, Hekter, Ballpoint, Buku Album, Amplop*) digabung menjadi **"Alat Tulis Kantor"** dengan **Total Bruto Rp 1.507.000**.

### Permasalahan Sebelumnya:
1. `CopilotService::getRincianPencairan()` mengambil baris rincian mentah dari database tanpa melakukan agregasi transaksi gabungan.
2. Akibatnya, pada Tabel Transaksi Berpajak, AI memecah transaksi kuitansi Toko Surya Jaya menjadi 3 transaksi terpisah (Rp 60.000 / Rp 2.400, Rp 330.000 / Rp 13.200, Rp 100.000 / Rp 4.000), padahal secara riil kuitansi dan pajaknya sudah digabung menjadi satu transaksi utuh sebesar Rp 490.000 dengan pajak Rp 19.600.
3. Jumlah baris transaksi pada September dilaporkan 15 baris rincian mentah, padahal pada cetak resmi PDF SIKAS (`rincian_pencairan.blade.php`), jumlah kuitansi resmi setelah penggabungan adalah **7 kuitansi/transaksi**.

---

## 2. Sasaran Desain (Design Goals)
1. **Deteksi Otomatis Fitur Gabung Uraian**: Sistem secara otomatis mengenali rincian belanja yang memiliki `uraian_gabungan` aktif, mengelompokkannya per `bulan` + `kode_rekening_id` + `kode_kegiatan_id` + `uraian_gabungan`.
2. **Pajak Tidak Terpecah**: Potongan pajak (PPN, PPh 21, PPh 23) dari rincian gabungan diakumulasikan menjadi satu kesatuan kuitansi belanja (misal: Kwitansi `058` PPh 23 tetap utuh Rp 19.600 dari bruto Rp 490.000).
3. **Penyajian Lengkap dengan Catatan Sub-Barang**: Nama kegiatan menampilkan nama uraian gabungan resmi, dilengkapi ringkasan sub-barang pembentuknya (`sub_uraian_ringkasan` dan array `sub_items`) agar bendahara tetap mengetahui isi rincian belanja di balik kuitansi gabungan tersebut.
4. **Konsistensi 100% dengan Laporan Resmi SIKAS**:
   - Jumlah transaksi September menjadi **7 transaksi resmi** (Total Bruto Rp 4.233.000, Total Pajak Rp 77.600, Neto Rp 4.155.400).
   - Transaksi berpajak di Tahap 2 menjadi **3 transaksi resmi** (Kwitansi 058 Rp 19.600, Kwitansi 059 Rp 58.000, Kwitansi 068 Rp 6.000). Total Pajak Tahap 2 tetap utuh Rp 83.600.
   - Total kwitansi resmi tahunan 2026 menjadi **126 transaksi resmi** dengan Total Bruto Rp 29.000.000.

---

## 3. Arsitektur & Perubahan Teknis

### A. Backend: `CopilotService::getRincianPencairan()`
1. **Logika Pengelompokan (Grouping)**:
   Setelah memfilter dan mengurutkan `$sortedFiltered`, iterasi data membentuk kuitansi resmi dengan aturan:
   - Jika record memiliki `!empty($item->uraian_gabungan)`:
     Gunakan grouping key:
     `$groupKey = $item->bulan . '|' . ($item->kode_rekening_id ?? $item->rekeningBelanja?->kode_rekening) . '|' . ($item->kode_kegiatan_id ?? $item->kodeKegiatan?->kode) . '|' . trim($item->uraian_gabungan);`
   - Jika record tidak memiliki `uraian_gabungan`:
     Gunakan key unik per record:
     `$groupKey = $item->bulan . '|item|' . $item->id;`
2. **Akumulasi Nilai**:
   - `bruto += $val;`
   - `pot_ppn += $ppn;`
   - `pot_pph21 += $pph21;`
   - `pot_pph23 += $pph23;`
   - `total_pajak += $pajak;`
   - `diterima_neto += $neto;`
3. **Metadata Sub-Barang**:
   - `is_gabungan`: `true` / `false`.
   - `sub_items[]`: Menyimpan rincian satuan `['uraian' => ..., 'volume' => ..., 'satuan' => ..., 'harga_satuan' => ..., 'bruto' => ..., 'pajak' => ...]`.
   - `sub_uraian_ringkasan`: String rincian barang, misal: `"Kuas Biasa (Rp 60.000), Cat tembok nippon paint (Rp 330.000), Kuas Roll (Rp 100.000)"`.
4. **Agregasi `rekap_bulanan`**:
   - `jumlah_transaksi`: Dihitung dari jumlah transaksi/kuitansi hasil grouping resmi (September = 7, total setahun = 126).
   - `total_bruto`, `total_pajak`, dan `total_neto` tetap klop 100%.

### B. Prompt AI: `buildSystemPrompt()`
1. Tambahkan aturan eksplisit tentang fitur Gabung Uraian pada bagian Rincian Pencairan:
   - Memberitahukan model bahwa transaksi dengan `is_gabungan = true` adalah hasil penggabungan rincian belanja sejenis dengan rekening dan kegiatan yang sama.
   - Pajak pada transaksi gabungan tidak boleh dipecah. Sajikan nominal bruto dan pajak gabungan secara utuh.
   - Pada tabel rincian belanja maupun tabel transaksi berpajak, jika transaksi merupakan gabungan, tampilkan nama gabungan dan sertakan keterangan rincian sub-barang di bawahnya, contoh:
     `Pemeliharaan Prasarana Lahan, Bangunan dan Ruang<br><small style="color: #64748b;">(Rincian: Cat tembok nippon paint, Kuas Roll, Kuas Biasa)</small>`.
2. Perbarui aturan jumlah transaksi resmi:
   - September: Tepat **7 transaksi resmi** dengan Bruto Rp 4.233.000, Pajak Rp 77.600, Neto Rp 4.155.400.
   - Transaksi berpajak September: Tepat **2 transaksi resmi** (Kwitansi 058 Toko Surya Jaya Rp 490.000 pajak Rp 19.600, dan Kwitansi 059 Toko Surya Jaya Rp 1.450.000 pajak Rp 58.000).

---

## 4. Rencana Pengujian (Testing Plan)
1. **Unit Verification Script**:
   - Memanggil `CopilotService::getRincianPencairan(2026, 'reguler', 2, 'September')`.
   - Memastikan `items` berjumlah 7 transaksi.
   - Memastikan transaksi kwitansi `058/BOSP/THP-II/2026` memiliki Bruto Rp 490.000, PPh 23 Rp 19.600, dan Neto Rp 470.400.
   - Memastikan transaksi kwitansi `057/BOSP/THP-II/2026` memiliki Bruto Rp 1.507.000.
   - Memastikan `transaksi_berpajak` di September berjumlah tepat 2 transaksi.
2. **Live AI Chat Test**:
   - Menguji pertanyaan pengguna: *"Tampilkan rincian transaksi berpajak di bulan September 2026"*.
   - Memverifikasi jawaban AI menyajikan 2 transaksi utuh tanpa memecah Kwitansi 058.
3. **Regression Check**:
   - Memastikan bulan-bulan lain (Agustus 5 transaksi, dll.) tetap tepat dan tidak terganggu.

---

## 5. Review & Approval
Spesifikasi ini dirancang berdasarkan keputusan bersama bendahara sekolah dan referensi cetak PDF resmi SIKAS.
