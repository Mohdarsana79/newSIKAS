# Desain Teknis: Penyesuaian Uraian Kwitansi dan Dokumen SPJ Real pada SIKAS AI Copilot

**Tanggal:** 2026-10-21  
**Status:** In Review  
**Topik:** Penyesuaian Format Uraian "Untuk Pembayaran" pada Dokumen SPJ (Kwitansi, Tanda Terima, BAST, Surat Pesanan) agar Sesuai dengan Kwitansi Riil Barang/Jasa  

---

## 1. Latar Belakang & Masalah

Pada fitur dokumen SPJ AI Copilot sebelumnya, pengguna melaporkan bahwa saat meminta kwitansi:
> *"saat saya meminta kwitansi ternyata uraiannya belum sesuai. seharusnya uraiannya sesuai dgn kwitansi yang ada"*

### Analisis Akar Masalah:
1. **Awalan Pembukuan Kas BKU:**
   Field `untuk_pembayaran` dan `uraian` pada tool `get_spj_document_detail` dan `get_spj_documents_status` sebelumnya mengambil langsung dari `$bku->uraian_opsional ?: $bku->uraian`. Keduanya diawali dengan teks pembukuan buku kas formal standar ARKAS/BKU, yaitu `"Lunas Bayar Belanja..."` (contoh: *"Lunas Bayar Belanja Pemeliharaan Prasarana Lahan, Bangunan, dan Ruang"* atau *"Lunas Bayar Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor"*). Kalimat ini merupakan format jurnal BKU, bukan kalimat kwitansi belanja yang lazim.
2. **Ketiadaan Rincian Item Belanja pada Uraian Pembayaran:**
   Pada dokumen kwitansi fisik/asli, bendahara dan penerima uang membutuhkan uraian yang secara spesifik menyebutkan nama barang/jasa riil yang dibeli (contoh: *"Pembayaran Belanja Kuas Biasa, Cat tembok Nippon Paint, Kuas Roll"* atau *"Pembayaran Belanja Racun Rumput"*).
3. **Bug Nama Properti Relasi Rekening & Kegiatan:**
   Pada `CopilotService::getSpjDocumentDetail`:
   - `$bku->rekeningBelanja?->nama_rekening` mengembalikan `null` karena nama kolom tabel `rekening_belanjas` adalah `rincian_objek`.
   - `$bku->kodeKegiatan?->nama` mengembalikan `null` karena nama kolom tabel `kode_kegiatans` adalah `uraian`.
   Akibatnya, header kwitansi pada chat hanya menampilkan kode angka tanpa nama rekening dan nama uraian kegiatannya.

---

## 2. Keputusan Desain (Hasil Sesi Klarifikasi)

Berdasarkan kesepakatan pada sesi tanya jawab terstruktur:
1. **Aturan Uraian Belanja Barang / Jasa Fisik:**
   - **Single Item (1 Barang):** Sebutkan nama barangnya dengan format `"Pembayaran Belanja [Nama Barang]"` (contoh: `"Pembayaran Belanja Racun Rumput"`).
   - **Multi-Item (>1 Barang Gabungan):** Gabungkan seluruh nama item barang dari tabel `uraianDetails`, berformat `"Pembayaran Belanja [Barang 1], [Barang 2], [Barang 3]"` (contoh: `"Pembayaran Belanja Kuas Biasa, Cat tembok Nippon Paint, Kuas Roll"`).
2. **Aturan Transaksi Honorarium / Upah / Insentif:**
   - Ambil dari `$bku->uraian_opsional` yang dibersihkan dari awalan `"Lunas Bayar "` / `"Lunas bayar "` dan diganti dengan `"Pembayaran "` (contoh: `"Pembayaran Honor Guru Husni, S.Pd.I"`, `"Pembayaran Upah Kerja Penyemprotan Rumput"`).
3. **Fallback Jika Detail Barang Kosong:**
   - Gunakan `$bku->uraian_opsional ?: $bku->uraian`, bersihkan awalan `"Lunas Bayar "` / `"Lunas bayar "`, dan gantikan dengan awalan `"Pembayaran "`.
4. **Cakupan Dokumen:**
   - Aturan ini diterapkan secara konsisten ke seluruh dokumen pendukung SPJ: **Kwitansi**, **Tanda Terima**, **BAST**, dan **Surat Pesanan**.
5. **Perbaikan Relasi Rekening & Kegiatan:**
   - Rekening: `($bku->rekeningBelanja?->kode_rekening ?? '') . ' - ' . ($bku->rekeningBelanja?->rincian_objek ?? '')`
   - Kegiatan: `($bku->kodeKegiatan?->kode ?? '') . ' - ' . ($bku->kodeKegiatan?->uraian ?? '')`

---

## 3. Spesifikasi Arsitektur & Logika Implementasi

### 3.1. Helper Method: `formatUraianPembayaranReal($bku)`
Dibuat di `app/Services/Ai/CopilotService.php`:
```php
/**
 * Menghasilkan kalimat uraian pembayaran resmi dokumen SPJ sesuai kwitansi fisik
 */
protected function formatUraianPembayaranReal($bku): string
{
    // 1. Deteksi transaksi honor/upah/jasa perorangan
    $isHonor = str_contains(strtolower($bku->uraian), 'honor') || 
               str_contains(strtolower($bku->uraian), 'jasa tenaga') ||
               str_contains(strtolower($bku->uraian), 'upah');

    if ($isHonor && !empty($bku->uraian_opsional)) {
        $cleaned = preg_replace('/^lunas\s+bayar\s+/i', '', trim($bku->uraian_opsional));
        return 'Pembayaran ' . ltrim($cleaned);
    }

    // 2. Ambil dari rincian item belanja (bku_uraian_details)
    $details = $bku->uraianDetails ?? collect();
    if ($details->count() > 0) {
        $itemNames = $details->pluck('uraian')->filter()->map(fn($item) => trim($item))->unique()->values();
        if ($itemNames->isNotEmpty()) {
            return 'Pembayaran Belanja ' . $itemNames->implode(', ');
        }
    }

    // 3. Fallback: Bersihkan uraian_opsional atau uraian BKU
    $raw = !empty($bku->uraian_opsional) ? $bku->uraian_opsional : $bku->uraian;
    $cleaned = preg_replace('/^lunas\s+bayar\s+/i', '', trim($raw));
    
    // Pastikan diawali kata Pembayaran jika belum ada
    if (!str_starts_with(strtolower($cleaned), 'pembayaran')) {
        return 'Pembayaran ' . $cleaned;
    }
    return $cleaned;
}
```

### 3.2. Pembaruan pada `getSpjDocumentsStatus`
- Field `'uraian'` diubah menggunakan `$this->formatUraianPembayaranReal($bku)` sehingga daftar tabel audit SPJ menampilkan uraian belanja riil bukan `"Lunas Bayar..."`.

### 3.3. Pembaruan pada `getSpjDocumentDetail`
- Field `'untuk_pembayaran'` pada `kwitansi` diisi dengan `$this->formatUraianPembayaranReal($bku)`.
- Field `'uraian_belanja'` / `'untuk_pembayaran'` pada `tanda_terima`, `bast`, dan `surat_pesanan` juga menggunakan `$this->formatUraianPembayaranReal($bku)`.
- Perbaikan query string dan properti `rincian_objek` & `uraian` master.

### 3.4. Pembaruan Prompt Copilot
- Menambahkan aturan ketat di system prompt Bagian 10:
  *"Pada baris 'Untuk Pembayaran', tampilkan selalu uraian riil barang/jasa dari field `untuk_pembayaran` (contoh: 'Pembayaran Belanja Kuas Biasa, Cat tembok Nippon Paint, Kuas Roll'). DILARANG KERAS memunculkan awalan pembukuan kas 'Lunas Bayar...' di lembar dokumen resmi."*

---

## 4. Rencana Validasi & Pengujian

1. **Unit Test Backend**:
   - Memeriksa output `formatUraianPembayaranReal` untuk:
     * Transaksi belanja multi-item (BKU 210: Kuas Biasa, Cat tembok, Kuas Roll) -> Harus menghasilkan `"Pembayaran Belanja Kuas Biasa, Cat tembok Nippon Paint, Kuas Roll"`.
     * Transaksi belanja single-item (BKU 208: Racun Rumput) -> Harus menghasilkan `"Pembayaran Belanja Racun Rumput"`.
     * Transaksi honorarium guru (BKU 215 / ID 17: Honor Guru) -> Harus menghasilkan `"Pembayaran Honor Guru ..."`.
   - Memeriksa nama rekening dan nama kegiatan yang sebelumnya kosong.
2. **Live AI Chat Test**:
   - Meminta kwitansi bukti 058/BOSP/THP-II/2026 dan memverifikasi baris "Untuk Pembayaran", "Rekening Belanja", dan "Kegiatan".
3. **Pint & Git Commit**:
   - Format kode PHP dengan `vendor/bin/pint` dan commit ke git.
