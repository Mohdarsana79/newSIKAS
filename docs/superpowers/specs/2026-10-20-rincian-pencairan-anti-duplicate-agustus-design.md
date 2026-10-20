# Spesifikasi Desain: Pencegahan Duplikasi Transaksi Rincian Pencairan Bulanan (Bulan Agustus Tepat 5 Transaksi Rp 1.286.000)

- **Tanggal**: 2026-10-20
- **Status**: Disetujui Pengguna
- **Terkait**: `app/Services/Ai/CopilotService.php`

---

## 1. Masalah & Latar Belakang

Saat pengguna meminta rincian transaksi pencairan belanja bulan Agustus:
- Data riil pada database PostgreSQL (`newSIKAS`) untuk bulan Agustus 2026 adalah **5 transaksi** dengan total bruto **Rp 1.286.000** (pajak Rp 0, neto Rp 1.286.000):
  1. Upah Kerja Penyemprotan Rumput (Bruto: Rp 100.000, Kwitansi: 061/BOSP/THP-II/2026)
  2. Selpianti (Bruto: Rp 483.000, Kwitansi: 063/BOSP/THP-II/2026)
  3. Pembelian Pulsa Data Internet (Bruto: Rp 103.000, Kwitansi: 055/BOSP/THP-II/2026)
  4. Insentif tenaga Operator Komputer / Dapodik (Bruto: Rp 500.000, Kwitansi: 064/BOSP/THP-II/2026)
  5. Insentif Pembina Ekstrakurikuler Pramuka (Bruto: Rp 100.000, Kwitansi: 065/BOSP/THP-II/2026)
- Namun AI Copilot menampilkan **6 transaksi**, di mana kegiatan "Insentif Pembina Ekstrakurikuler Pramuka" muncul **2 kali** (ganda).

### Akar Masalah Teknis
1. **Kegiatan Serupa Antar-Bulan**:
   Di database RKAS Perubahan, kegiatan "Insentif Pembina Ekstrakurikuler Pramuka" (Rp 100.000, penerima MASITAH ABDULLAH) muncul di bulan Juli, Agustus, dan September dengan nomor kuitansi yang identik: `065/BOSP/THP-II/2026`.
2. **Data Mentah Tidak Terurut Kronologis**:
   Sebelumnya, method `getRincianPencairan()` mengambil data mentah dari Eloquent tanpa pengurutan kronologis bulan (`Januari` s.d. `Desember`). Akibatnya, baris-baris bulan Agustus tersebar secara acak (ada di index 9, 17, 43, 44, 45) berbaur dengan baris Juli, September, dll.
3. **Penyaringan Manual oleh LLM**:
   Jika LLM memanggil data cakupan luas atau memproses daftar transaksi yang tersebar acak, LLM bingung membedakan item berulang antar-bulan dan menduplikasi baris Pramuka ke dalam tabel bulan Agustus.

---

## 2. Sasaran Desain (Goals)

1. **Pencegahan Duplikasi 100%**:
   - Transaksi bulan Agustus **wajib dan pasti tepat 5 transaksi** dengan total bruto **Rp 1.286.000**.
   - Tidak boleh ada kegiatan yang berulang/ganda (seperti Insentif Pembina Pramuka).
2. **Penyortiran Kronologis di Backend (`CopilotService::getRincianPencairan()`)**:
   - Seluruh baris transaksi diurutkan secara teratur menurut urutan 12 bulan resmi BOSP: Januari (1), Februari (2), ..., Agustus (8), September (9), ..., Desember (12).
   - Menambahkan field `no_bulan` (nomor urut transaksi di bulan tersebut: 1..N) di samping nomor urut global `no`.
   - Mengelompokkan transaksi per bulan (`items_per_bulan`) dalam payload return backend.
3. **Aturan Tegas di System Prompt AI**:
   - Ketika pengguna meminta rincian belanja / pencairan bulan tertentu (misal: Agustus):
     - AI **WAJIB** memanggil `get_rincian_pencairan(bulan: '{nama_bulan}')`.
     - Jumlah baris pada tabel rincian transaksi **WAJIB SAMA PERSIS** dengan `jumlah_transaksi` dari ringkasan / `rekap_bulanan` (khusus Agustus: tepat 5 transaksi, Rp 1.286.000).
     - AI **DILARANG KERAS** menduplikasi kegiatan atau menyisipkan data dari bulan lain.

---

## 3. Komponen & Perubahan Teknis

### 3.1. Penyortiran & Pengelompokan Kronologis di `CopilotService.php`
Di dalam method `getRincianPencairan()`:
1. Urutkan `$filtered` menggunakan urutan indeks bulan resmi (1 s.d. 12):
   ```php
   $monthOrder = array_flip(['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
   $filteredSorted = $filtered->sort(function ($a, $b) use ($monthOrder) {
       $orderA = $monthOrder[$a->bulan] ?? 99;
       $orderB = $monthOrder[$b->bulan] ?? 99;
       if ($orderA !== $orderB) {
           return $orderA <=> $orderB;
       }
       return $a->id <=> $b->id;
   })->values();
   ```
2. Saat membentuk `$mappedItems`:
   - Berikan `no` (1..Total) dan `no_bulan` (1..N per bulan).
3. Buat associative array `$itemsPerBulan`:
   ```php
   $itemsPerBulan = [];
   foreach ($mappedItems as $item) {
       $itemsPerBulan[$item['bulan']][] = $item;
   }
   ```
4. Masukkan `'items_per_bulan' => $itemsPerBulan` ke dalam array response.

### 3.2. Penegasan Aturan pada System Prompt AI (`buildSystemPrompt()`)
Tambahkan instruksi tegas:
- Jika pengguna meminta rincian pencairan/belanja pada bulan tertentu:
  - Panggil `get_rincian_pencairan(bulan: '{nama_bulan}')`.
  - Jumlah baris transaksi pada tabel HTML WAJIB sama persis dengan angka `jumlah_transaksi` (Agustus: 5 baris, September: 15 baris, dst.).
  - Dilarang menduplikasi baris kegiatan yang memiliki nomor kuitansi sama dengan bulan lain.

---

## 4. Kriteria Pengujian & Validasi

1. **Uji Unit Backend**:
   - `getRincianPencairan(2026, 'reguler', null, 'Agustus')` menghasilkan tepat 5 items.
   - Tidak ada duplikasi Pramuka.
   - Total bruto klop Rp 1.286.000.
2. **Uji Multi-Turn & Live Chat AI**:
   - Simulasi query: *"tampilkan rincian transaksi pencairan bulan agustus"*.
   - Verifikasi AI menyajikan tabel dengan tepat 5 baris (1 Upah Rumput, 1 Selpianti, 1 Pulsa Internet, 1 Insentif Dapodik, 1 Insentif Pramuka).
   - Total Bruto: Rp 1.286.000 (tidak ada baris ke-6 atau nilai Rp 1.386.000).
3. **Pint Formatting & Git Commit**.
