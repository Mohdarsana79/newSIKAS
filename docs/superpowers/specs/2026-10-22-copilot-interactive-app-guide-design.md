# Design Spec: SIKAS AI Copilot Interactive App Guide & Smart Navigation

- **Tanggal**: 2026-10-22
- **Topik**: AI Copilot sebagai Alat Bantu Panduan Aplikasi SIKAS & Smart In-App Navigator
- **Status**: Disetujui Pengguna (Drafting Spec)

---

## 1. Latar Belakang & Tujuan
Saat ini, SIKAS AI Copilot telah memiliki kapabilitas mendalam untuk analisis data anggaran, rekapitulasi realisasi BOSP, audit forensik kas, serta drafting transaksi BKU. Namun, pengguna (Bendahara Sekolah) menginginkan Copilot juga dapat bertindak sebagai **alat bantu pemakaian aplikasi SIKAS (Interactive App Guide / In-App Navigator)**.

### Masalah yang Diselesaikan:
1. Pengguna sering kali memerlukan panduan alur kerja operasional (SOP) yang runut (misal: alur tutup buku BKU, cara tarik data ARKAS, cara cetak kuitansi SPJ massal, cara hitung/lapor pajak NTPN, dan cara mengatasi selisih kas).
2. Setelah AI memberikan panduan langkah-demi-langkah, pengguna masih harus mencari menu di sidebar secara manual. Diperlukan **Kartu Tombol Pintas Aksi (Smart Action Buttons)** yang dapat diklik langsung untuk berpindah ke halaman tujuan secara instan (SPA) tanpa me-reload aplikasi dan tanpa menutup Copilot Drawer.
3. Di layar awal Copilot Drawer saat chat kosong, pengguna membutuhkan pengelompokan saran pertanyaan (Quick Prompts) yang membedakan antara pertanyaan panduan cara pakai dan pertanyaan data keuangan.

---

## 2. Ruang Lingkup & Cakupan Panduan Aplikasi
Copilot dibekali pengetahuan operasional menyeluruh mengenai seluruh modul SIKAS:
1. **Modul Penganggaran & RKAS:**
   - Alur pengisian RKAS manual dan pergeseran anggaran pada RKAS Perubahan.
   - Prosedur tarik data RKAS dari aplikasi desktop ARKAS (`arkas.db`).
   - Ekspor laporan Lembar Kerja 2.2.1, Alur Kas, Rekapitulasi, dan Tahapan (PDF/Excel).
2. **Modul Penatausahaan & BKU:**
   - Tata cara pencatatan belanja BKU (Tunai vs Bank/Non-tunai).
   - Tata cara penarikan tunai dari bank ke kas bendahara dan setor tunai kembali ke bank.
   - Penggunaan fitur Asisten AI Uraian Belanja untuk kuitansi BKU.
   - Alur pemotongan pajak belanja, setoran pajak dengan NTPN, dan laporan buku kas pajak.
   - Prosedur Tutup Kas Bulanan (Formulir K7B & Berita Acara Pemeriksaan Kas).
   - Prosedur Buka Kas Kembali (Reopen BKU) bila ada kesalahan pencatatan atau koreksi transaksi.
   - Alur tarik data transaksi BKU dari ARKAS desktop.
3. **Modul Dokumen SPJ & Fitur Pelengkap:**
   - Pembuatan dan pencetakan Kuitansi massal (Batch Generation) dengan 4 template resmi.
   - Pembuatan Berita Acara Serah Terima (BAST) belanja barang modal/jasa.
   - Pembuatan Surat Pesanan pengadaan barang/jasa.
   - Pembuatan Tanda Terima honorarium/kegiatan.
   - Pembuatan dan pencetakan laporan resmi: SPTJ, SPMTH, SP2B, dan LPH.
4. **Modul Integrasi & System:**
   - Konfigurasi Path Database ARKAS (`arkas.db`) dan pengecekan izin akses SQLite.
   - Sinkronisasi Kode Referensi ARKAS.
   - Prosedur Backup & Restore Database PostgreSQL serta pembaruan lisensi NPSN.
5. **Solusi Kendala & Troubleshooting (FAQ Praktis):**
   - Mengatasi selisih saldo kas di BKU vs Buku Pembantu Bank / Tunai.
   - Menangani transaksi berstatus "Over Budget" (melebihi pagu RKAS).
   - Solusi koneksi database ARKAS tidak terdeteksi.

---

## 3. Desain Arsitektur & Protokol Data

### 3.1 Protokol Smart Action Buttons
Ketika Copilot menjawab pertanyaan yang memandu penggunaan menu atau fitur tertentu, backend AI menyertakan metadata `action_buttons` di dalam struktur respons JSON:

```json
{
  "success": true,
  "content": "Untuk melakukan tutup buku bulan Maret di BKU, ikuti langkah berikut:\n1. Pastikan seluruh transaksi belanja bulan Maret sudah selesai diinput...\n2. Klik tombol **Tutup Kas** di sudut kanan atas tabel BKU...",
  "action_buttons": [
    {
      "label": "Buka Buku Kas Umum (BKU)",
      "url": "/penatausahaan/bku/2026/Maret",
      "icon": "BookOpen",
      "description": "Menuju pembukuan BKU bulan Maret"
    }
  ]
}
```

### 3.2 Eksekusi Navigasi di Frontend (`CopilotDrawer.tsx`)
1. Data `action_buttons` disimpan dalam state `Message` frontend:
   ```typescript
   export interface ActionButton {
       label: string;
       url: string;
       icon?: string;
       description?: string;
   }

   interface Message {
       id: string;
       role: 'user' | 'assistant';
       content: string;
       staging_card?: StagingDraft;
       analytics_chart?: any;
       action_buttons?: ActionButton[];
       timestamp: string;
   }
   ```
2. Saat tombol diklik:
   - Menggunakan `router.visit(btn.url, { preserveState: true, preserveScroll: true })` dari `@inertiajs/react`.
   - Hal ini memastikan browser berpindah halaman secara SPA tanpa me-reload aplikasi dan tanpa mereset jendela Copilot Drawer.
   - Drawer tetap terbuka di samping layar, memungkinkan bendahara tetap membaca langkah panduan sambil mempraktikkannya langsung di layar aplikasi.

### 3.3 Penyesuaian Multi-Variant (Reguler, Kinerja, SiLPA, Kinerja SiLPA)
- Backend `CopilotService` menyusun URL tombol aksi dengan mengikutsertakan prefix varian aktif melalui `VariantConfig::routePrefix($variant)`.
- Contoh:
  - Pada varian `reguler`: `/penatausahaan/bku/2026/Maret`
  - Pada varian `kinerja`: `/kinerja/penatausahaan/bku/2026/Maret`
  - Pada varian `silpa`: `/silpa/penatausahaan/bku/2026/Maret`

---

## 4. Desain Knowledge Base SOP di Backend (`CopilotService.php`)

Di dalam fungsi `buildSystemPrompt(string $variant, int $tahun)`:
1. Ditambahkan instruksi pedoman peran ganda:
   - **Peran 1: Analis & Eksekutor Keuangan BOSP** (Pagu, BKU, ROB, Pajak, SPTJ, Draf Staging).
   - **Peran 2: Pemandu Penggunaan Aplikasi SIKAS (In-App Guide & Navigator)**.
2. Ditanamkan **Peta Fitur & SOP SIKAS**:
   - Struktur menu utama, fungsi tombol aksi, tahapan alur penutupan kas, alur penarikan tunai, alur cetak SPJ batch, dan cara buka kembali kas (reopen).
3. Aturan Pembuatan Tombol Aksi:
   - Jika pengguna bertanya cara penggunaan suatu menu, Copilot WAJIB menyertakan blok rekomendasi rute/action button di akhir respons atau melalui parsing tag khusus `[ACTION_BUTTON: {"label": "...", "url": "...", "icon": "...", "description": "..."}]` yang di-extract oleh `CopilotService` ke array `action_buttons`.

---

## 5. Desain Antarmuka Pengguna (`CopilotDrawer.tsx`)

### 5.1 Tab Kategori Saran Cepat (Quick Prompts Switcher)
Saat obrolan masih kosong (`messages.length === 0`), ditampilkan tab filter elegan di atas daftar chip:
- **Tab 1: 📖 Panduan Aplikasi** (Menampilkan chip panduan SOP):
  1. `📖 Bagaimana alur dan cara tutup buku BKU setiap akhir bulan?`
  2. `📥 Bagaimana cara tarik data RKAS & BKU dari ARKAS desktop?`
  3. `🖨️ Bagaimana cara mencetak kuitansi SPJ secara massal/sekaligus?`
  4. `⚖️ Bagaimana cara mengatasi selisih kas di BKU dan Buku Bank?`
  5. `📝 Bagaimana cara membuat Berita Acara Serah Terima (BAST)?`
- **Tab 2: 💰 Keuangan & Draf** (Menampilkan chip keuangan & transaksi):
  1. `💰 Berapa pagu anggaran dan penerimaan dana tahun ini?`
  2. `📝 Catat belanja konsumsi rapat Rp 350.000 tunai ke Katering Berkah`
  3. `📊 Bandingkan realisasi serapan belanja per triwulan`
  4. `🧾 Berapa tarif pajak untuk belanja laptop Rp 8.500.000?`

### 5.2 Komponen Visual Smart Action Card
- Ditampilkan tepat di bawah bubble pesan asisten (sebelum timestamp).
- Menggunakan styling modern berkesan premium:
  - Background slate-50 / dark:bg-gray-800 dengan border indigo-200 / dark:border-indigo-800/60.
  - Ikon yang dinamis (`BookOpen`, `FileText`, `Printer`, `Settings`, `ArrowRight`).
  - Efek hover interaktif dan transisi halus.

---

## 6. Penanganan Error & Keamanan (Guardrails)
1. **Preservasi Keamanan:**
   - Copilot tetap dilarang keras membocorkan kode sumber PHP, React, SQL, nama variabel teknis sistem, atau arsitektur database internal.
   - Panduan disajikan dalam sudut pandang pengguna akhir (Bendahara), bukan sudut pandang pengembang/programmer.
2. **Fallback URL Aman:**
   - Jika halaman tertentu membutuhkan ID yang belum tersedia (misal ID penganggaran belum ada), tombol diarahkan ke halaman induk modulnya (`/penganggaran`).
3. **State Preservation:**
   - Navigasi menggunakan `router.visit(..., { preserveState: true })` memastikan bahwa histori percakapan tidak hilang saat berpindah halaman.

---

## 7. Rencana Pengujian
1. **Uji Tab Saran Cepat**: Memastikan klik tab `📖 Panduan Aplikasi` dan `💰 Keuangan & Draf` mengganti daftar prompt chip secara instan.
2. **Uji Panduan Operasional**:
   - Tanya "Bagaimana cara tutup buku BKU?" $\rightarrow$ Copilot menjawab langkah SOP Tutup Buku dan menyertakan tombol aksi "Buka Buku Kas Umum".
   - Tanya "Bagaimana alur tarik data ARKAS?" $\rightarrow$ Copilot menjelaskan alur dan menyertakan tombol "Buka Arkas Tools" / "Buka Penganggaran".
   - Tanya "Bagaimana cara cetak kuitansi SPJ sekaligus?" $\rightarrow$ Copilot memandu batch kuitansi dan menyertakan tombol "Buka Halaman Kwitansi".
3. **Uji Navigasi Interaktif**:
   - Klik tombol aksi navigasi pada balon obrolan $\rightarrow$ Halaman aplikasi berpindah ke halaman tujuan secara halus via Inertia SPA, drawer Copilot tetap terbuka di samping layar, dan riwayat obrolan tetap utuh.
4. **Uji Multi-Variant**: Memastikan tombol aksi pada varian non-reguler (Kinerja / SiLPA) secara akurat mengarahkan ke URL ber-prefix varian.
