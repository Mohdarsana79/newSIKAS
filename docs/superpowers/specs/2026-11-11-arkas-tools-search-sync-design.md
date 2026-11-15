# Dokumen Desain: Pembenahan Pencarian Fallback ARKAS & Solusi Performa Sinkronisasi Bebas Freeze

**Tanggal:** 11 November 2026  
**Status:** Disetujui Pengguna (Drafting Spec)  
**Modul:** Arkas Tools (`app/Http/Controllers/ArkasToolController.php` & `resources/js/Pages/ArkasTools/Index.tsx`)  

---

## 1. Latar Belakang & Akar Masalah

Pada modul **Arkas Tools**, ditemukan dua kendala utama yang mengganggu operasional pengguna:

### 1.1 Pencarian Data Tidak Berfungsi (Tidak Fallback ke ARKAS)
- **Kondisi:** Endpoint `/arkas-tools/search` hanya mengeksekusi query ke tabel lokal PostgreSQL (`ref_barangs`).
- **Penyebab:** Ketika tabel `ref_barangs` masih kosong (0 baris) atau belum memiliki barang yang dicari, sistem langsung mengembalikan hasil kosong (`total: 0`, `data: []`).
- **Dampak:** Pengguna menganggap fitur pencarian rusak/tidak berfungsi karena pencarian tidak otomatis mencari ke database ARKAS (`arkas.db`).

### 1.2 Penarikan Data Membuat Browser "Not Responding" (Freeze Total)
- **Kondisi:** Pengguna mengklik tombol *Tarik Data* untuk mengambil data dari ARKAS.
- **Penyebab:**
  1. File `arkas.db` memiliki **23.083 barang** (tahun 2026) dan **76.168 barang** (seluruh tahun).
  2. Karena database lokal SIKAS kosong, seluruh 23.083–76.168 barang dimasukkan ke dalam array `$priorityData` ("Data Baru") dan dikirimkan sebagai payload JSON raksasa ke browser.
  3. Pada komponen React (`resources/js/Pages/ArkasTools/Index.tsx`), seluruh data mentah tersebut dimasukkan ke dalam state `results` dan di-render langsung ke dalam tabel HTML `<tbody>` tanpa paginasi (hanya mode lokal yang memiliki paginasi).
  4. React mencoba merender 23.083 baris `<tr>` &times; 8 `<td>` (&gt;184.000 elemen DOM). Hal ini memblokir JavaScript main thread secara ekstrem, mengakibatkan browser macet total (*Page Unresponsive / Not Responding*).

---

## 2. Kebutuhan & Keputusan Desain (User Alignment)

Berdasarkan wawancara terarah (*grilling session*), solusi yang disepakati mencakup:

1. **Pencarian Cerdas Hibrid dengan Auto-Sync (Fallback ke ARKAS):**
   - Pencarian tetap memprioritaskan database lokal SIKAS (`ref_barangs`) untuk kecepatan (< 50ms).
   - Jika pencarian di SIKAS menghasilkan **0 data**, backend secara otomatis mencari ke database ARKAS (`arkas.db`) via engine Python `query.py` (maksimum 500 barang per keyword).
   - Barang yang ditemukan di ARKAS **otomatis disimpan/di-*upsert* langsung ke tabel `ref_barangs` SIKAS** di latar belakang.
   - Frontend menampilkan hasil barang tersebut dengan indikator/badge *"Sumber: ARKAS (Otomatis Disimpan ke SIKAS)"* dan alert informasi sukses.

2. **Penyatuan Aksi: "Sinkronkan dengan ARKAS" (Bebas Freeze):**
   - Menghilangkan tombol *Tarik Data* yang membuang data mentah ke DOM.
   - Mengganti tombol *Tarik Data* dan *Sync Database* menjadi satu tombol aksi utama yang bersih: **"Sinkronkan dengan ARKAS"**.
   - Ketika diklik, modal menampilkan konfirmasi cakupan tahun (sesuai filter tahun aktif, misalnya Tahun 2026 atau Semua Tahun).
   - Proses sinkronisasi dilakukan langsung di backend (membaca SQLite ARKAS dan batch upsert ke PostgreSQL per 2.000 data).
   - Browser **tidak pernah** merender puluhan ribu baris ke DOM. Tabel utama selalu menampilkan data lokal terpaginasi (50 baris per halaman), sehingga konsumsi memori browser stabil dan **0% lag/freeze**.

---

## 3. Rincian Arsitektur & Alur Data

### 3.1 Alur Pencarian Cerdas (Smart Search Flow)

```
[User Input Keyword] 
         │
         ▼
[GET /arkas-tools/search]
         │
         ▼
[Cek Tabel Lokal SIKAS (ref_barangs)]
         ├─► [Ada Hasil] ──► Return JSON terpaginasi (source: 'local_database')
         │
         └─► [0 Hasil] ────► Panggil Python Engine: query.py $keyword $year
                                   │
                                   ├─► [Ditemukan di ARKAS]
                                   │         │
                                   │         ▼
                                   │   Batch Upsert ke ref_barangs (Auto-Cache)
                                   │         │
                                   │         ▼
                                   │   Return JSON terpaginasi (source: 'arkas_auto_synced')
                                   │
                                   └─► [Tidak Ada di ARKAS] ──► Return 0 hasil bersih
```

### 3.2 Alur Sinkronisasi Langsung (Direct Sync Flow)

```
[Klik "Sinkronkan dengan ARKAS"]
         │
         ▼
[Buka Modal Konfirmasi Tahun (misal: Tahun 2026)]
         │
         ▼
[Klik "Mulai Sinkronisasi" -> POST /arkas-tools/sync]
         │
         ├─► [Tahap 1]: Eksekusi Python query.py '__ALL__' $year
         ├─► [Tahap 2]: Batch Upsert ke PostgreSQL ref_barangs (chunk 2.000)
         │
         ▼
[Response Sukses: synced & updated counts]
         │
         ▼
[Frontend: Tampilkan notifikasi sukses, refresh tabel lokal (50 data pertama)]
```

---

## 4. Rencana Perubahan Kode

### 4.1 Backend: `app/Http/Controllers/ArkasToolController.php`

1. **Refactor `search(Request $request)`:**
   - Lakukan query ke `RefBarang` seperti biasa.
   - Jika `$paginated->total() === 0` dan `$keyword !== ''` dan `$keyword !== '__ALL__'`:
     - Panggil `$this->runPythonQuery($keyword, $year)`.
     - Jika ditemukan data ARKAS (`!empty($pythonResult['data'])`):
       - Lakukan batch upsert data tersebut ke tabel `ref_barangs` secara otomatis.
       - Query ulang atau bungkus data tersebut ke format paginasi standar.
       - Sertakan flag `source: 'arkas_auto_synced'` dan pesan ringkas.
2. **Refactor `sync(Request $request)`:**
   - Pastikan batch upsert efisien dengan chunking 2.000 baris.
   - Kembalikan ringkasan jumlah data baru dan data yang diperbarui.
3. **Pembersihan `fetchArkas`:**
   - Tidak lagi digunakan oleh tombol tabel utama karena proses telah dialihkan ke `sync` langsung tanpa membebani DOM.

### 4.2 Frontend: `resources/js/Pages/ArkasTools/Index.tsx`

1. **Penyatuan Tombol Toolbar:**
   - Hapus tombol ganda (*Tarik Data* & *Sync Database*).
   - Tampilkan tombol utama: **"Sinkronkan dengan ARKAS"** (ikon putar/refresh, warna Indigo/Emerald).
2. **Penyempurnaan Modal Sinkronisasi:**
   - Modal menampilkan konfirmasi tahun anggaran yang akan disinkronkan.
   - Menampilkan status proses (*Sedang membaca database ARKAS & menyinkronkan data...*) dengan animasi spinner/bar.
   - Setelah sukses, modal ditutup dan memanggil `loadPage(1)` untuk menampilkan 50 barang pertama yang baru disinkronkan.
3. **Tampilan Hasil Pencarian Auto-Fallback:**
   - Jika `dataSource === 'arkas_auto_synced'`, tampilkan alert banner hijau:
     *"Barang ditemukan di database ARKAS dan telah otomatis disimpan ke database SIKAS."*
   - Status badge pada tabel menampilkan *"Sudah Disimpan"*.
4. **Keamanan Performa Tabel:**
   - Tabel **hanya merender** data terpaginasi (50, 100, atau 200 baris per halaman).
   - Tidak ada lagi rendering tanpa batas, menjamin browser selalu responsif dan ringan.

---

## 5. Rencana Pengujian (Verification Plan)

1. **Uji Pencarian Fallback:**
   - Pastikan database `ref_barangs` kosong atau tidak memiliki barang "Kertas".
   - Masukkan kata kunci "kertas", klik Cari.
   - Verifikasi bahwa sistem otomatis mencari ke `arkas.db`, menampilkan puluhan item kertas, dan otomatis menyimpannya ke `ref_barangs`.
   - Lakukan pencarian kedua dengan kata kunci yang sama: verifikasi bahwa pencarian kedua langsung cepat diambil dari `ref_barangs` (PostgreSQL).
2. **Uji Sinkronisasi Bebas Freeze:**
   - Pilih Tahun 2026 di dropdown.
   - Klik "Sinkronkan dengan ARKAS".
   - Konfirmasi proses di modal.
   - Verifikasi bahwa browser tidak freeze/not responding selama proses berlangsung.
   - Verifikasi data `ref_barangs` terisi 23.083 data di PostgreSQL.
   - Verifikasi tabel menampilkan 50 data terpaginasi dengan navigasi halaman 1..462.
3. **Uji Ekspor CSV:**
   - Verifikasi ekspor data dari tabel lokal berfungsi normal tanpa crash.

