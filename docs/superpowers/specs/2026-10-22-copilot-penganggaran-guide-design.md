# Design Spec: Panduan Fitur Penganggaran pada SIKAS AI Copilot

- **Tanggal**: 2026-10-22
- **Topik**: Standarisasi Panduan Fitur Penganggaran (Alur 5 Langkah & 4 Menu Card RKAS) pada AI Copilot
- **Status**: Disetujui Pengguna (User Approved)

---

## 1. Latar Belakang & Kebutuhan
Modul **Penganggaran** adalah modul kunci di mana bendahara menetapkan pagu anggaran dan mengelola data legalitas kepala sekolah, bendahara, dan komite sebelum menyusun rincian belanja pada RKAS. 

Pengguna menghendaki panduan fitur Penganggaran di AI Copilot diperbarui secara terstruktur dan rapi dengan mengacu pada draf alur kerja resmi:
1. Penjelasan fungsi fitur Penganggaran dan 4 tab varian BOSP (BOSP Reguler, BOSP Kinerja, SiLPA BOSP Reguler, SiLPA BOSP Kinerja).
2. Panduan 5 langkah praktis pembuatan pagu anggaran baru.
3. Penjelasan 4 menu/tombol aksi yang terdapat di dalam Card RKAS yang tampil (Edit, Detail RKAS, Ringkasan & Cetak, Hapus).
4. Peringatan kehati-hatian pada menu Hapus.
5. Kepatuhan mutlak terhadap aturan kerahasiaan rute teknis (*Strict Zero Internal URL Path Rule*), memandu murni menggunakan nama tombol dan letak visual di sidebar.

---

## 2. Struktur Teks Panduan Resmi Penganggaran

Panduan resmi yang disampaikan AI Copilot kepada bendahara:

### Pengenalan Fitur:
> Fitur **Penganggaran** digunakan untuk membuat dan menetapkan pagu anggaran sebagai dasar dalam menginput data RKAS. Penganggaran ini terdiri dari beberapa tab varian:
> - **BOSP Reguler**
> - **BOSP Kinerja**
> - **SiLPA BOSP Reguler**
> - **SiLPA BOSP Kinerja**

### Alur 5 Langkah Pembuatan Anggaran:
- **Langkah ke 1** : Klik fitur **Penganggaran** di sisi sebelah kiri sidebar.
- **Langkah ke 2** : Pilih tab BOSP yang ingin ditambahkan Pagu Anggaran (misal: *BOSP Reguler*, *BOSP Kinerja*, *SiLPA BOSP Reguler*, atau *SiLPA BOSP Kinerja*).
- **Langkah ke 3** : Di bagian atas kanan, klik tombol **"Buat Anggaran Baru"**.
- **Langkah ke 4** : Isi semua form yang diminta secara lengkap, yaitu:
  - *Pagu Anggaran*
  - *Tahun Anggaran*
  - *Nama Komite*
  - *Nama Kepala Sekolah*
  - *NIP Kepala Sekolah*
  - *SK Pengangkatan Kepala Sekolah*
  - *Tanggal SK Kepala Sekolah*
  - *Nama Bendahara*
  - *NIP Bendahara*
  - *SK Bendahara*
  - *Tanggal SK Bendahara*
- **Langkah ke 5** : Klik tombol **"Simpan"** maka data anggaran akan tersimpan di sistem.

### Tampilan Card RKAS & Penjelasan 4 Menu Aksi:
Setelah data disimpan, akan tampil kartu (**Card**) RKAS Awal / Murni yang menampilkan informasi RKAS Tahun Anggaran dan nominal Pagu Anggaran. Di dalam Card tersebut terdapat beberapa menu:
- **Menu Edit** : Berfungsi untuk melakukan pengeditan data anggaran dan data pelengkap lainnya seperti nama kepala sekolah, NIP kepala sekolah, SK kepala sekolah, tanggal SK kepala sekolah, nama komite, nama bendahara, NIP bendahara, SK bendahara, dan tanggal SK bendahara.
- **Menu Detail RKAS** : Berfungsi untuk masuk ke halaman lembar kerja RKAS guna membuat dan menginput data rincian belanja RKAS awal atau murni.
- **Menu Ringkasan & Cetak** : Berfungsi untuk masuk ke halaman cetak untuk melihat dan mencetak hasil penginputan RKAS (laporan pengesahan).
- **Menu Hapus** : Berfungsi untuk menghapus data penganggaran RKAS. Harap berhati-hati saat menghapus karena semua data RKAS yang telah diinput di dalamnya akan ikut terhapus permanen. Pastikan data RKAS memang kosong agar tidak salah hapus. Namun, jika memang bertujuan untuk mereset/menghapus seluruh anggaran RKAS awal/murni sekaligus, hal tersebut dapat dilakukan.

---

## 3. Komponen Perubahan

### 3.1 Backend & System Prompt (`app/Services/Ai/CopilotService.php`)
- Menambahkan sub-bab khusus: `d. PANDUAN KHUSUS FITUR PENGANGGARAN (PEMBUATAN PAGU & PENGELOLAAN CARD RKAS):` di dalam method `buildSystemPrompt()`.
- Menyesuaikan nomor urut sub-bab berikutnya:
  - `e. PANDUAN TROUBLESHOOTING UMUM`
  - `f. ATURAN KERAHASIAAN SISTEM & STRICT ZERO INTERNAL URL PATH RULE`
- Memastikan tidak ada URL path internal sistem yang bocor.

### 3.2 Unit Test (`tests/Unit/CopilotSpjTandaTerimaTest.php`)
- Menambahkan method test case `test_system_prompt_includes_detailed_penganggaran_guide()` yang memverifikasi:
  - Teks pengenalan 4 tab (BOSP Reguler, BOSP Kinerja, SiLPA BOSP Reguler, SiLPA BOSP Kinerja).
  - Alur Langkah 1 sampai Langkah 5.
  - Form field (pagu, tahun, komite, kepsek, bendahara, sk, dll).
  - Penjelasan 4 menu card (Menu edit, Menu detail Rkas, Menu ringkasan & Cetak, Menu hapus).
  - Peringatan kehati-hatian pada menu hapus.

---

## 4. Rencana Pengujian
1. Jalankan `php artisan test --filter=CopilotSpjTandaTerimaTest`.
2. Jalankan simulasi percakapan via API DeepSeek untuk menguji pertanyaan pengguna terkait *"bagaimana cara membuat penganggaran baru?"* dan *"apa saja menu di card rkas?"*.
