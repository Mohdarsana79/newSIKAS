# Desain Teknis: Fitur Asisten AI Penulis Uraian Belanja BKU

**Tanggal:** 2026-10-22  
**Status:** In Review  
**Topik:** Fitur Tombol "Asisten AI" untuk Pembuatan Otomatis Uraian Belanja Baku Standar BOSP pada Form Modal Transaksi BKU  

---

## 1. Latar Belakang & Permasalahan

Pada form modal input transaksi Buku Kas Umum (`resources/js/Pages/Penatausahaan/Bku.tsx`), pengguna (bendahara sekolah) memiliki field:
- `Uraian Belanja (Opsional)` (`detailUraian` $\rightarrow$ `uraian_opsional`).

### Permasalahan:
1. **Ketidakkonsistenan Format Uraian Belanja:**
   Bendahara sering kali bingung bagaimana merumuskan kalimat uraian belanja yang baik, lengkap, dan memenuhi standar audit BPK, Inspektorat, dan ketentuan Permendikdasmen Nomor 8 Tahun 2026.
2. **Efisiensi Waktu Penginputan:**
   Mengetik manual rincian barang, nama kegiatan, dan rekanan pada setiap transaksi belanja memakan waktu. Padahal, form modal BKU telah memiliki data terstruktur:
   - Toko / Rekanan / Penerima Pembayaran (`data.nama_toko` / `data.nama_penerima_pembayaran`)
   - Jenis Kegiatan RKAS terpilih (`selectedActivity`)
   - Rekening Belanja terpilih (`selectedAccount`)
   - Daftar Item Barang/Jasa RKAS yang dicentang (`data.items`, volume, satuan, harga)
   - Jenis Transaksi (Tunai / Non-Tunai) dan Nomor Nota

### Solusi yang Diinginkan:
Menambahkan tombol **"Asisten AI"** tepat di atas textarea *Uraian Belanja (Opsional)*. Saat diklik, Asisten AI membaca seluruh konteks transaksi yang telah dipilih dan langsung menuliskan rumusan kalimat uraian belanja yang baku, formal, dan siap pakai ke dalam textarea.

---

## 2. Keputusan Desain (Hasil Sesi Wawancara / Grill)

Berdasarkan kesepakatan pada sesi wawancara terstruktur bersama pengguna:
1. **Alur Interaksi:**
   - Sekali klik tombol "Asisten AI", AI langsung menuliskan kalimat uraian terbaik ke dalam textarea.
   - Disediakan tombol **"Variasi Kalimat"** (ikon putar/refresh) di sampingnya agar bendahara dapat meminta alternatif kalimat lain tanpa harus menghapus manual.
2. **Format Gaya Bahasa Baku (Standar BOSP):**
   - Format kalimat formal BOSP:
     $$\text{[Frase Tindakan: "Pembayaran belanja..." / "Lunas bayar..."]} + \text{[Rincian Barang/Jasa]} + \text{[Peruntukan Kegiatan]} + \text{[Toko/Rekanan]}$$
   - *Contoh Transaksi Barang:*  
     `"Pembayaran belanja alat tulis kantor berupa Kertas HVS A4 70gr dan Spidol Whiteboard untuk keperluan Pelaksanaan Kegiatan Belajar Mengajar pada Toko Sahabat Edukasi"`
   - *Contoh Transaksi Honor/Jasa:*  
     `"Lunas bayar honorarium narasumber penyelenggaraan kegiatan workshop kurikulum kepada Ahmad Dahlan pada Kegiatan Peningkatan Kompetensi Guru"`
3. **Penyedia AI & Penanganan API Key:**
   - Menggunakan model **DeepSeek-V3 (`deepseek-chat`)** murni via `DeepSeekService::callChat`.
   - Jika pengguna belum mengonfigurasi API Key DeepSeek pada profil atau saldo habis, sistem menampilkan pesan/modal peringatan yang mengarahkan bendahara ke halaman Profil Akun untuk melengkapi API Key.
4. **Posisi & Tampilan UI:**
   - Terletak di atas textarea, sejajar di sebelah kanan label *"Uraian Belanja (Opsional)"*.
   - Desain tombol modern bergaya *badge/pill* bergradien ungu-cyan dengan ikon *Sparkles/AI*.
   - Memiliki indikator loading (*spinner*) saat proses permintaan AI sedang berjalan.

---

## 3. Spesifikasi Arsitektur & Rencana Implementasi

### 3.1. Backend Endpoint: `POST /bku/ai-generate-uraian`
Rute didaftarkan di [`routes/variant.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/routes/variant.php) agar otomatis mewarisi *variant-aware middleware* (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).

* **Route Name:** `{prefix}bku.ai-generate-uraian`
* **Controller:** `App\Http\Controllers\BukuKasUmumController@generateAiUraian`
* **Request Payload:**
  ```json
  {
    "nama_rekanan": "Toko Sahabat Edukasi",
    "kegiatan": "03.01 - Pelaksanaan Kegiatan Belajar dan Mengajar",
    "rekening": "5.1.02.01.01.0024 - Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor",
    "items": [
      { "uraian": "Kertas HVS A4 70gr", "volume": 5, "satuan": "Rim" },
      { "uraian": "Spidol Whiteboard", "volume": 2, "satuan": "Kotak" }
    ],
    "jenis_transaksi": "tunai",
    "nomor_nota": "BPU-001",
    "variant_index": 0
  }
  ```
* **Response Sukses (HTTP 200):**
  ```json
  {
    "success": true,
    "uraian": "Pembayaran belanja alat tulis kantor berupa Kertas HVS A4 70gr dan Spidol Whiteboard untuk keperluan Pelaksanaan Kegiatan Belajar dan Mengajar pada Toko Sahabat Edukasi",
    "variant_index": 0
  }
  ```
* **Response Belum Ada API Key (HTTP 403):**
  ```json
  {
    "success": false,
    "error_type": "NO_API_KEY",
    "message": "Kunci API DeepSeek belum dikonfigurasi pada profil Anda. Silakan atur API Key pada menu Profil Akun untuk mengaktifkan Asisten AI."
  }
  ```

### 3.2. Prompt Engineering DeepSeek-V3 (`deepseek-chat`)
* **Role:** Ahli Penatausahaan Keuangan Sekolah & Bendahara BOSP Senior.
* **Instruksi:**
  1. Hasilkan TEPAT 1 KALIMAT uraian belanja BKU bahasa Indonesia formal dan baku.
  2. DILARANG menambahkan teks pembuka/penutup, tanda kutip ganda pembungkus, atau *markdown*.
  3. Struktur wajib: Frase tindakan formal BOSP + rincian barang/jasa + keperluan kegiatan + nama rekanan/toko.
  4. Untuk `variant_index` > 0, gunakan variasi redaksi sinonim yang tetap baku (misal pergantian antara *"Pembayaran belanja..."* dan *"Lunas bayar..."* atau penataan susunan peruntukan).

### 3.3. Frontend Implementasi (`Bku.tsx`)
1. **Komponen Header Uraian Belanja:**
   - Menata label `InputLabel` dan tombol aksi Asisten AI dalam satu baris `flex justify-between items-center mb-1`.
   - Tombol utama: **"Asisten AI"** dengan ikon *Sparkles*.
   - Tombol samping: **"Variasi"** (muncul setelah pernah di-generate atau saat ada teks).
2. **Validasi Kesiapan Input:**
   - Jika pengguna menekan tombol sebelum memilih Kegiatan atau Rekening atau Item Belanja, tampilkan *toast/tooltip* peringatan: *"Pilih kegiatan, rekening belanja, atau rincian item terlebih dahulu agar Asisten AI memiliki data untuk merumuskan uraian."*
3. **Modal / Peringatan API Key:**
   - Jika menerima error `NO_API_KEY`, tampilkan notifikasi alert / modal informatif dengan tombol link cepat ke pengaturan profil pengguna.

---

## 4. Rencana Pengujian (Testing Strategy)

1. **Unit Test Backend:**
   - Memastikan endpoint `bku.ai-generate-uraian` mengembalikan respon valid jika input valid.
   - Memastikan pengembalian status 403 `NO_API_KEY` jika pengguna belum memiliki API key.
2. **Manual & Browser Testing:**
   - Buka modal tambah transaksi BKU.
   - Pilih Toko, pilih Kegiatan, pilih Rekening Belanja, dan centang 2 item belanja.
   - Klik tombol **"Asisten AI"**.
   - Verifikasi teks langsung masuk ke textarea `detailUraian`.
   - Klik tombol **"Variasi"** dan verifikasi variasi redaksi dihasilkan.
   - Coba submit transaksi BKU dan verifikasi `uraian_opsional` tersimpan dengan benar di tabel database dan laporan BKU.

---

## 5. Kepatuhan & Konvensi Repositori
- Mematuhi aturan `AGENTS.md` (dukungan 4 varian BOSP, rute di `routes/variant.php`, formating PHP dengan `vendor/bin/pint`).
- Menggunakan model `deepseek-chat` via `DeepSeekService` yang telah ada tanpa menambah dependensi baru.
