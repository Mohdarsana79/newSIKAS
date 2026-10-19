# Implementation Plan: Auto-Load Data Database & Pagination pada Arkas Tools

**Tanggal:** 16 Oktober 2026  
**Status:** Menunggu Review & Persetujuan Pengguna  
**Modul:** Arkas Tools (Auto-load Data Database Lokal & Pagination)  

---

## 1. Masalah & Penyebab (Root Cause)

### 1.1 Permasalahan
Saat ini, data barang ARKAS sudah berhasil disinkronkan ke dalam tabel database lokal PostgreSQL `ref_barangs` (total 76.168 data).  
Namun, ketika halaman **Arkas Tools** dibuka pertama kali atau di-reload (`F5`), tabel barang **masih kosong** dan baru terisi jika user melakukan pencarian kata kunci atau klik "Tarik Data".

### 1.2 Penyebab Teknis
1. Di `ArkasToolController@index`, controller hanya mengirimkan props statistik jumlah data (`localStats`), tanpa menyertakan daftar data barang awal (`initialData`).
2. Di `Index.tsx`, state `results` diinisialisasi sebagai array kosong `[]`, dan tidak ada mekanisme otomatis untuk memuat data dari database lokal saat komponen pertama kali dirender.
3. Karena jumlah data sangat besar (76.168 baris), jika seluruh data dimuat sekaligus tanpa paginasi, browser akan lambat dan payload Inertia akan membengkak.

---

## 2. Solusi yang Dirancang

### 2.1 Backend (`ArkasToolController.php`)
1. **Paginasi Server-side**:
   - Di `index()`, muat data awal terpaginasi (50 data per halaman) untuk tahun anggaran aktif (default 2026) langsung ke props Inertia:
     ```php
     $initialData = RefBarang::query()
         ->where('tahun', 2026)
         ->orderBy('nama_barang')
         ->paginate(50);
     ```
   - Dengan mengirimkan `initialData` langsung melalui props Inertia, data **langsung tampil seketika saat halaman dibuka atau di-reload tanpa blank/delay**.
2. **Endpoint Pencarian & Paginasi (`search`)**:
   - Menerima parameter:
     * `keyword`: kata kunci pencarian (opsional, jika kosong berarti menampilkan semua data).
     * `year`: tahun anggaran ('2026', '2025', '2024', atau 'ALL').
     * `page`: nomor halaman aktif (default 1).
     * `per_page`: jumlah data per halaman (default 50, opsi 50, 100, 200).
   - Mengembalikan response JSON terstruktur pagination Laravel:
     * `data`: daftar barang pada halaman aktif dengan status `Sudah Ada`.
     * `current_page`, `last_page`, `per_page`, `total`, `from`, `to`.
3. **Export CSV Lengkap**:
   - Export CSV tetap mengambil seluruh data sesuai kata kunci & tahun yang dipilih (tidak terpotong hanya 50 baris).

### 2.2 Frontend (`resources/js/Pages/ArkasTools/Index.tsx`)
1. **Auto-Load Tanpa Delay**:
   - Menggunakan `initialData` dari Inertia props saat pertama kali dibuka.
   - Tabel langsung menampilkan 50 baris data pertama tahun 2026 saat halaman di-reload.
2. **Komponen Navigasi Paginasi**:
   - Ditempatkan tepat di bawah tabel:
     * Menampilkan info: *"Menampilkan 1 – 50 dari 23.083 data barang (Halaman 1 dari 462)"*.
     * Tombol Navigasi: `Pertama`, `Sebelumnya`, Nomor Halaman (`1`, `2`, `3`, ..., `Akhir`), `Berikutnya`.
     * Pilihan ukuran halaman: 50, 100, atau 200 data per halaman.
3. **Reaktivitas Filter & Pencarian**:
   - Saat dropdown Tahun diubah (misal dari 2026 ke 2025 atau ALL), sistem otomatis memuat halaman 1 untuk tahun tersebut.
   - Form pencarian kata kunci: jika dikosongkan lalu klik "Cari", tabel otomatis menampilkan kembali seluruh data berpaginasi.
4. **Integrasi dengan Fitur Tarik Data & Sync**:
   - Jika user menekan tombol "Tarik Data" ARKAS, tabel beralih menampilkan data hasil pembacaan file ARKAS dengan badge status (`Sudah Ada`, `Perlu Update`, `Data Baru`).
   - Tombol "Sync Database" tetap mematuhi aturan: aktif jika ada data baru/update, dan non-aktif jika semua sudah tersimpan.
   - Setelah sync sukses, data otomatis diperbarui dan tombol sync kembali non-aktif.

---

## 3. Rencana Perubahan Kode

### 3.1 `ArkasToolController.php`
- Modifikasi method `index()` untuk menyertakan `initialData` paginasi:
  ```php
  public function index(Request $request)
  {
      $year = $request->input('year', '2026');
      $query = RefBarang::query();
      if ($year !== 'ALL') {
          $query->where('tahun', (int)$year);
      }
      $initialData = $query->orderBy('nama_barang')->paginate(50);
      ...
  }
  ```
- Modifikasi method `search()` agar mendukung paginasi dan keyword opsional (bisa kosong untuk fetch data paginasi biasa).

### 3.2 `Index.tsx`
- Tambahkan state paginasi: `currentPage`, `lastPage`, `totalItems`, `perPage`, `fromItem`, `toItem`.
- Render tabel dengan tombol paginasi modern di bawah tabel (Tailwind CSS matching tema SIKAS).
- Reaktif terhadap perubahan halaman dan filter tahun.

---

## 4. Rencana Pengujian

1. **Uji Reload Halaman (F5)**:
   - Memastikan data langsung muncul di tabel saat halaman dibuka / di-reload tanpa harus klik tombol apa pun.
2. **Uji Navigasi Halaman**:
   - Mengklik halaman 2, 3, Next, dan Prev, memastikan data berganti dengan cepat.
3. **Uji Ganti Filter Tahun**:
   - Mengubah tahun dari 2026 ke 2025, memastikan data tahun 2025 langsung tampil dan total data terupdate.
4. **Uji Pencarian Kata Kunci**:
   - Mengetik kata kunci (misal: "kertas"), memastikan hasil pencarian tampil dengan paginasinya.
5. **Uji Sync Database & Status**:
   - Memastikan tombol sync tetap non-aktif saat data sudah sinkron dan kolom status tetap akurat.

---

## 5. Pertanyaan & Konfirmasi Sebelum Eksekusi

Sesuai **Aturan No. 1** Anda (*"Tidak boleh eksekusi kode tanpa instruksi dari saya"*), belum ada kode yang dimodifikasi.  
Silakan review rencana implementation plan di atas, dan jika Anda menyetujui, berikan instruksi agar saya mulai menerapkan kode tersebut.
