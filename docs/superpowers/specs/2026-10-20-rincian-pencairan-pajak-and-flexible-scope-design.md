# Design Spec: Konsistensi Data Pajak Rincian Pencairan & Penyajian Transaksi Fleksibel (Tahunan, Tahapan, Bulanan)

**Tanggal**: 2026-10-20  
**Status**: Approved by User  
**Terkait**: `app/Services/Ai/CopilotService.php`

---

## 1. Masalah & Latar Belakang

Pada pemanggilan tool `get_rincian_pencairan` untuk Tahap 2 tahun 2026, ringkasan eksekutif mendeteksi total potongan pajak sebesar **Rp 83.600**. Namun pada tabel yang disajikan oleh AI Copilot, hanya terdapat 2 transaksi berpajak (Rp 2.400 dan Rp 6.000) yang berjumlah Rp 8.400. Selisih Rp 75.200 berasal dari 3 transaksi berpajak lainnya yang tidak ditampilkan pada tabel (Pemeliharaan Prasarana Rp 13.200, Pemeliharaan Prasarana Rp 4.000, dan Cat Lapangan Rp 58.000).

Penyebab:
1. Backend `getRincianPencairan()` sebelumnya membatasi pengiriman data dengan `array_slice($mappedItems, 0, 100)`.
2. AI Copilot saat menghasilkan respon hanya merender sampel 9-10 baris transaksi dari total 76 transaksi di Tahap 2, sehingga 3 transaksi berpajak terlewat.
3. Belum ada pemisahan antara tabel khusus transaksi yang dipotong pajak (`transaksi_berpajak`) dan tabel transaksi umum.
4. Kolom pajak di tabel disajikan tidak konsisten (hanya memuat PPh 23 tanpa rincian PPN, PPh 21, dan total pajak).

---

## 2. Sasaran Desain (Goals)

1. **Konsistensi 100% Angka Pajak**:
   - Total potongan pajak pada tabel transaksi berpajak harus klop 100% dengan total pajak di ringkasan eksekutif (misalnya Rp 83.600 pada Tahap 2).
2. **Pemisahan Dua Tabel pada Respon Copilot**:
   - **Tabel 1 (Khusus Transaksi Berpajak)**: Wajib memuat seluruh item transaksi yang memiliki potongan pajak (`pot_ppn > 0`, `pot_pph21 > 0`, atau `pot_pph23 > 0`) dengan kolom lengkap:
     `No | Bulan | Tahap | Nama Kegiatan / Barang | Rekanan / Penerima | No. Kwitansi | Bruto (Rp) | PPN (Rp) | PPh 21 (Rp) | PPh 23 (Rp) | Total Pajak (Rp) | Diterima Neto (Rp)`
     Lengkap dengan baris *TOTAL POTONGAN PAJAK* di bawah tabel.
   - **Tabel 2 (Rincian Pencairan Umum)**: Menampilkan seluruh transaksi sesuai cakupan yang diminta pengguna (tahunan penuh, per tahap, atau per bulan).
3. **Cakupan Fleksibel Sesuai Permintaan Pengguna**:
   - Jika pengguna minta **tahunan** → tampilkan seluruh transaksi 1 tahun tanpa batas baris.
   - Jika pengguna minta **per tahap** → tampilkan seluruh transaksi tahap tersebut.
   - Jika pengguna minta **per bulan** → tampilkan seluruh transaksi bulan tersebut.
4. **Penyempurnaan Tool Backend `getRincianPencairan`**:
   - Hapus pemotongan `array_slice(..., 100)` agar seluruh data transaksi terkirim lengkap.
   - Ekstrak array khusus `transaksi_berpajak` di hasil respon tool.
   - Tambahkan parameter `filter_pajak` (`'semua'`, `'berpajak'`, `'tanpa_pajak'`).

---

## 3. Komponen & Perubahan Arsitektur

### 3.1. Perubahan Skema Tool `get_rincian_pencairan` di `getAvailableTools()`
- Tambahkan parameter `filter_pajak`:
  ```php
  'filter_pajak' => [
      'type' => 'string',
      'enum' => ['semua', 'berpajak', 'tanpa_pajak'],
      'description' => 'Pilihan filter transaksi: "semua" (default), "berpajak" (hanya transaksi yang kena PPN/PPh), atau "tanpa_pajak".',
  ],
  ```

### 3.2. Penyempurnaan `getRincianPencairan()` di `CopilotService.php`
1. Terima parameter `$filterPajak = 'semua'`.
2. Hapus pembatasan `array_slice($mappedItems, 0, 100)` -> kirim seluruh `$mappedItems`.
3. Sediakan array khusus `transaksi_berpajak` yang menyaring `$mappedItems` dengan `$item['total_pajak'] > 0`.
4. Jika parameter `$filterPajak === 'berpajak'`, filter `$mappedItems` hanya untuk transaksi yang memiliki pajak.
5. Perbaiki pesan error/not-found jika data kosong: sebutkan "Data Rincian Pencairan" bukan "Data Alur Kas".

### 3.3. Penyesuaian System Prompt
- Tambahkan pedoman penyajian Rincian Pencairan:
  - Tampilkan Ringkasan Eksekutif (Total Bruto, Total PPN, Total PPh 21, Total PPh 23, Total Pajak, Total Neto, Jumlah Transaksi).
  - Jika terdapat transaksi yang dipotong pajak (`total_pajak > 0`):
    - WAJIB menampilkan **Tabel Khusus Transaksi Berpajak** yang memuat seluruh transaksi berpajak tanpa terkecuali, dengan kolom rincian PPN, PPh 21, PPh 23, Total Pajak, dan Diterima Neto.
    - Jumlah total pajak pada tabel ini harus sama persis dengan angka di ringkasan eksekutif (misal: Rp 83.600).
  - Tampilkan **Tabel Rincian Pencairan Umum** sesuai filter (tahunan / tahap / bulan).

---

## 4. Kriteria Pengujian & Keberhasilan (Acceptance Criteria)

1. **Uji Data Tahap 2**:
   - `getRincianPencairan(2026, 'reguler', 2)` mengembalikan seluruh 76 item transaksi.
   - Key `transaksi_berpajak` memuat persis 5 transaksi dengan total PPh 23 Rp 83.600.
2. **Uji Live Chat AI**:
   - Saat ditanya "minta data rincian pencairan tahap 2", AI Copilot menampilkan Tabel Transaksi Berpajak dengan total Rp 83.600 dan seluruh 5 transaksi tercantum (termasuk item 13.200, 4.000, dan 58.000).
   - Saat ditanya rincian pencairan per bulan (misal September), AI menampilkan transaksi bulan September.
   - Saat ditanya rincian pencairan satu tahun, AI menyajikan data tahunan.
