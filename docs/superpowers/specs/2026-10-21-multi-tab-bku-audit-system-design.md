# Spesifikasi Desain: Sistem Pra-Audit Forensik AI Multi-Tab (11 Tabs) & Multi-Periode SIKAS

## 1. Ringkasan Eksekutif & Tujuan
Aplikasi SIKAS (Sistem Informasi Keuangan Satuan Pendidikan) sebelumnya memiliki fitur **Pra-Audit AI (DeepSeek-R1)** yang terbatas hanya pada tab Register Penutupan Kas (`reg`) dengan cakupan per bulan. Dokumen ini mendefinisikan desain teknis untuk memperluas sistem Pra-Audit Forensik AI ke seluruh **11 tab pembukuan** di menu Rekapitulasi:
1. **BKP Bank** (Buku Kas Pembantu Bank)
2. **BKP Pembantu Tunai** (Buku Pembantu Kas Tunai)
3. **BKP Umum** (Buku Kas Umum)
4. **BKP Pajak** (Buku Pembantu Pajak)
5. **ROB** (Rincian Objek Belanja)
6. **REG** (Register Penutupan Kas)
7. **Berita Acara** (Berita Acara Pemeriksaan Kas)
8. **Realisasi** (Laporan Realisasi Anggaran)
9. **Rek. Realisasi** (Rekap Realisasi per Rekening Belanja)
10. **BHP** (Buku Pembantu Habis Pakai / Kartu Persediaan)
11. **BHM** (Buku Pembantu Harta Modal / Inventaris Aset)

Sistem ini mendukung pengujian forensik pada 3 cakupan rentang periode:
- **Bulanan** (Januari s.d. Desember)
- **Tahapan** (Tahap 1 [Januari–Juni] dan Tahap 2 [Juli–Desember])
- **Tahunan** (1 Tahun Anggaran Penuh)

Tujuan utamanya adalah mendeteksi secara dini anomali pembukuan, inkonsistensi saldo, ketidakpatuhan perpajakan, deviasi pagu RKAS, dan ketidaksesuaian administrasi aset/persediaan sebelum diperiksa oleh BPK RI (Badan Pemeriksa Keuangan) dan Inspektorat Daerah.

---

## 2. Arsitektur Database & Penyimpanan Log (`bku_audit_logs`)

### 2.1 Perluasan Tabel `bku_audit_logs`
Tabel `bku_audit_logs` dimigrasikan untuk menambahkan kolom metadata tab dan rentang periode:
- `tab_type`: String (30), default `'reg'`. Nilai yang valid:
  `['bkp_bank', 'bkp_pembantu', 'bkp_umum', 'bkp_pajak', 'rob', 'reg', 'ba', 'realisasi', 'rek_realisasi', 'bhp', 'bhm']`
- `periode_type`: String (20), default `'bulanan'`. Nilai yang valid:
  `['bulanan', 'tahapan', 'tahunan']`
- `periode_key`: String (30), default `'januari'`. Contoh nilai:
  `'januari'`, `'februari'`, ..., `'desember'`, `'tahap_1'`, `'tahap_2'`, `'tahunan'`
- `bulan_angka`: Dibuat `nullable` (untuk mengakomodasi periode `tahap_1`, `tahap_2`, dan `tahunan`).

### 2.2 Indeks Pencarian & Kinerja
Indeks komposit baru ditambahkan:
```sql
CREATE INDEX idx_bku_audit_logs_tab_scope 
ON bku_audit_logs (variant, tahun, tab_type, periode_type, periode_key, penganggaran_id);
```

### 2.3 Caching Berbasis Timestamp BKU
Setiap eksekusi audit mencatat `last_bku_updated_at`. Jika pengguna membuka audit untuk tab & periode yang sama, sistem mengecek apakah ada pembaruan transaksi BKU terkait sejak audit terakhir. Jika tidak ada data yang berubah dan pengguna tidak mencentang `force_refresh`, hasil audit dimuat dari cache log database.

---

## 3. Arsitektur Backend Modular (Deep Engine)

### 3.1 Struktur Direktori
```
app/
├── Services/
│   └── Ai/
│       ├── BkuAuditScanner.php                # Deprecated / Wrapper untuk kompatibilitas lama
│       └── Audit/
│           ├── BkuAuditOrchestrator.php       # Entry point pengatur dispatching, caching, & AI call
│           ├── TabAuditScannerInterface.php   # Kontrak standar untuk semua tab scanner
│           ├── BaseTabAuditScanner.php        # Helper bersama (konversi periode, data BKU, hitung skor)
│           └── Scanners/
│               ├── BkpBankAuditScanner.php
│               ├── BkpPembantuAuditScanner.php
│               ├── BkpUmumAuditScanner.php
│               ├── BkpPajakAuditScanner.php
│               ├── BkpRobAuditScanner.php
│               ├── BkpRegAuditScanner.php
│               ├── BkpBaAuditScanner.php
│               ├── RealisasiAuditScanner.php
│               ├── RekRealisasiAuditScanner.php
│               ├── BhpAuditScanner.php
│               └── BhmAuditScanner.php
```

### 3.2 Kontrak Interface (`TabAuditScannerInterface`)
```php
namespace App\Services\Ai\Audit;

use App\Models\User;

interface TabAuditScannerInterface
{
    /**
     * Menjalankan audit deterministik & ekstraksi sampel data untuk tab tertentu
     */
    public function scanDeterministic(
        User $user,
        string $variant,
        int $tahun,
        string $periodeType,
        string $periodeKey,
        $penganggaran
    ): array;

    /**
     * Mendapatkan system prompt audit forensik khusus untuk tab ini
     */
    public function getSystemPrompt(string $variant, int $tahun, string $periodeType, string $periodeKey): string;

    /**
     * Mendapatkan judul label resmi dari buku tab ini
     */
    public function getTabTitle(): string;
}
```

---

## 4. Matriks Aturan Audit Forensik Spesifik (11 Tabs)

### 4.1 BKP Bank (`bkp_bank`)
- **Aturan 1: Rekonsiliasi Saldo Kas Bank vs Rekening Koran**: Saldo akhir kas bank harus sesuai dengan penerimaan dana BOSP dikurangi mutasi penarikan dan biaya bank.
- **Aturan 2: Pencatatan Bunga Bank & Pajak Bunga Bank**: Setiap bulan wajib mencatat bunga bank dan pemotongan pajak bunga (PPh Pasal 4 ayat 2) jika terdapat saldo simpanan giro.
- **Aturan 3: Saldo Bank Tidak Minus Harian**: Menelusuri kronologi penarikan; tidak boleh terjadi penarikan yang melebihi saldo bank tersedia pada tanggal tersebut.
- **Aturan 4: Deteksi Saldo Mengendap**: Menganalisis apakah terdapat dana transfer yang dibiarkan mengendap tanpa realisasi lebih dari 30 hari.

### 4.2 BKP Pembantu Kas Tunai (`bkp_pembantu`)
- **Aturan 1: Saldo Kas Tunai Tidak Boleh Minus Harian**: Saldo brankas tidak boleh negatif pada tanggal transaksi belanja apa pun.
- **Aturan 2: Ambang Batas Simpan Brankas Tunai**: Saldo kas tunai yang tersisa di brankas bendahara pada akhir periode tidak boleh melebihi batas regulasi kas tunai (maksimum Rp 10.000.000 s.d. Rp 20.000.000).
- **Aturan 3: Batas Pembayaran Tunai Non-Tunai**: Pengeluaran tunai dengan nominal > Rp 10.000.000 dalam 1 transaksi ditandai sebagai peringatan kepatuhan transaksi non-tunai.
- **Aturan 4: Sinkronisasi Penarikan vs Pembelanjaan**: Pembelanjaan tunai harus didahului oleh penarikan tunai dari bank persepsi.

### 4.3 BKP Umum (`bkp_umum`)
- **Aturan 1: Kronologi Transaksi & Urutan Nomor Bukti**: Memeriksa kelayakan tanggal transaksi berurutan dan nomor BPU/Nota tidak boleh loncat atau duplikat.
- **Aturan 2: Deteksi Transaksi Duplikasi**: Mengidentifikasi transaksi dengan tanggal, uraian, rekanan, dan nominal yang sama persis (indikasi input ganda).
- **Aturan 3: Indikasi Pemecahan Transaksi (Split-Bill / Smurfing)**: Deteksi transaksi berulang ke toko yang sama dengan nilai masing-masing di bawah Rp 2.000.000 untuk menghindari PPN/PPh atau ambang SIPLah.

### 4.4 BKP Pajak (`bkp_pajak`)
- **Aturan 1: Saldo Pungut vs Setor (Nihil Akhir Masa)**: Pajak yang dipungut dari rekanan wajib disetor ke kas negara; saldo akhir masa pajak harus Rp 0 setelah disetorkan.
- **Aturan 2: Kepatuhan Kode NTPN**: Setiap transaksi potongan pajak yang dilaporkan wajib memiliki nomor valid NTPN (Nomor Transaksi Penerimaan Negara).
- **Aturan 3: Validasi Tarif Pajak**:
  - PPN 11% untuk belanja barang/jasa kena pajak > Rp 2.000.000.
  - PPh 21: ASN sesuai golongan (Gol I/II: 0%, Gol III: 5%, Gol IV: 15%), Non-ASN sesuai tarif progresif/TER PP 58/2023.
  - PPh 22: 1.5% (memiliki NPWP) atau 3% (tanpa NPWP).
  - PPh 23: 2% (memiliki NPWP) atau 4% (tanpa NPWP).
- **Aturan 4: Belanja > Rp 2 Juta Tanpa Pajak**: Mengidentifikasi belanja bernilai besar yang tidak mencatat potongan pajak tanpa keterangan pembebasan.

### 4.5 ROB - Rincian Objek Belanja (`rob`)
- **Aturan 1: Pengendalian Pagu RKAS (Anti Over-Budget)**: Memeriksa apakah realisasi belanja per kode rekening melebihi plafon pagu anggaran yang disahkan pada RKAS.
- **Aturan 2: Belanja Tanpa Pos Anggaran**: Menandai transaksi di BKU yang menggunakan kode rekening belanja yang tidak dianggarkan di RKAS.
- **Aturan 3: Ketepatan Kode Rekening**: Evaluasi kesesuaian uraian barang dengan kode rekening (misal ATK tidak boleh masuk ke belanja jasa atau modal).

### 4.6 REG - Register Penutupan Kas (`reg`)
- **Aturan 1: Selisih Kas Nol (Zero Cash Discrepancy)**: Membandingkan total saldo buku dengan saldo fisik (kas tunai di brankas + kas di bank). Selisih wajib Rp 0.
- **Aturan 2: Kepatuhan Penutupan Kas Berkala**: Pemeriksaan keteraturan tanggal penutupan kas pada akhir bulan berjalan.
- **Aturan 3: Konsistensi Saldo Lalu**: Saldo awal penutupan kas bulan berjalan harus persis sama dengan saldo akhir penutupan kas bulan sebelumnya.

### 4.7 Berita Acara Pemeriksaan Kas (`ba`)
- **Aturan 1: Konsistensi Rincian Fisik Uang**: Total uang kertas, uang logam, saldo rekening bank, dan surat berharga harus cocok dengan saldo penutupan buku.
- **Aturan 2: Kelengkapan Identitas Pejabat Pengesah**: Memastikan nama dan NIP Kepala Sekolah (selaku Kuasa Pengguna Anggaran) dan Bendahara terisi lengkap.
- **Aturan 3: Validasi Kasus Khusus Semesteran**: Evaluasi pemeriksaan kas fisik saat pergantian semester/tahap penyaluran.

### 4.8 Laporan Realisasi Anggaran (`realisasi`)
- **Aturan 1: Evaluasi Tingkat Penyerapan Anggaran**: Analisis persentase serapan belanja (minimal serapan Tahap 1 untuk syarat salur Tahap 2, dan serapan akhir tahun).
- **Aturan 2: Deviasi Belanja per Program SNP**: Memeriksa proporsi belanja pada 8 Standar Nasional Pendidikan.
- **Aturan 3: Indikasi Kegiatan Mangkrak**: Menandai sub-kegiatan prioritas yang tidak memiliki realisasi sama sekali menjelang akhir tahun anggaran.

### 4.9 Rekap Realisasi per Rekening (`rek_realisasi`)
- **Aturan 1: Proporsi Belanja Pegawai, Operasi, dan Modal**: Menguji keselarasan realisasi pada kelompok akun 5.1.01, 5.1.02, dan 5.2.
- **Aturan 2: Deteksi Pergeseran Anggaran Tidak Sah**: Mendeteksi perubahan alokasi antar jenis belanja yang belum dilegalkan melalui RKAS Perubahan.

### 4.10 BHP - Kartu Barang Habis Pakai (`bhp`)
- **Aturan 1: Sinkronisasi Mutasi Masuk Persediaan**: Setiap belanja barang habis pakai di BKU (5.1.02) harus tercatat pada penerimaan buku persediaan.
- **Aturan 2: Saldo Akhir Barang Persediaan**: Memeriksa kewajaran sisa persediaan ATK/bahan di akhir tahap atau akhir tahun.
- **Aturan 3: Deteksi Salah Klasifikasi Aset**: Barang bernilai tahan lama (> 1 tahun) yang salah dibukukan sebagai barang habis pakai.

### 4.11 BHM - Buku Harta Modal (`bhm`)
- **Aturan 1: Kelengkapan Dokumen BAST (Wajib)**: Setiap transaksi Belanja Modal (Akun 5.2) WAJIB memiliki Berita Acara Serah Terima (BAST).
- **Aturan 2: Sinkronisasi ke Kartu Inventaris Barang (KIB)**: Pembelian barang modal harus terdata pada KIB B (Peralatan Mesin), KIB C (Gedung/Bangunan), atau KIB E (Aset Tetap Lainnya/Buku).
- **Aturan 3: Standar Nilai Kapitalisasi Aset**: Memeriksa apakah barang belanja modal memenuhi syarat batas minimal kapitalisasi aset daerah.

---

## 5. Frontend UI/UX & Modal Pra-Audit Dinamis

### 5.1 Integrasi Tombol Audit di Seluruh 11 Tab (`Rekapitulasi.tsx`)
Di setiap tab view, tombol audit diletakkan di samping tombol Cetak/Export:
```tsx
<button
    type="button"
    onClick={() => handleOpenAudit('bkp_bank')}
    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-md font-bold text-xs uppercase tracking-wider shadow-sm transition transform hover:-translate-y-0.5"
>
    <Sparkles className="w-4 h-4 text-purple-200" />
    Pra-Audit AI (DeepSeek-R1)
    {tabAuditScores['bkp_bank'] && (
        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950">
            {tabAuditScores['bkp_bank']}/100
        </span>
    )}
</button>
```

### 5.2 Dynamic Modal `BkuAuditModal.tsx`
Modal ditingkatkan agar mendukung parameter:
- `tabType`: string (`'bkp_bank'`, `'bkp_pembantu'`, dll.)
- `tabTitle`: label buku (misal: "Buku Kas Pembantu Bank")
- **Period Scope Switcher** terpasang di atas modal:
  - 4 Tab Button: `[ Bulanan ]` `[ Tahap 1 ]` `[ Tahap 2 ]` `[ Tahunan ]`
  - Jika `Bulanan` dipilih, muncul dropdown 12 bulan (Januari s.d. Desember).
  - Mengubah scope langsung memicu pemuatan status audit terkait tanpa menutup modal.
- **Tampilan Hasil**:
  - Skor Kepatuhan 0–100 dengan indikator visual.
  - Ringkasan Eksekutif Auditor.
  - Filter Tabs Temuan: `Semua`, `Bahaya (Danger)`, `Peringatan (Warning)`, `Info`.
  - Daftar Temuan lengkap dengan: Kategori, Uraian Fakta, Potensi Pelanggaran BPK, Saran Rekomendasi Perbaikan, dan Transaksi terkait.
  - Tombol **"Cetak Lembar Kerja Audit (PDF)"** yang mengarah ke endpoint export PDF per ID audit.

---

## 6. Format Dokumen Lembar Kerja Audit PDF

Dokumen PDF dihasilkan melalui endpoint `/bku-audit/pdf/{id}` menggunakan view `pdf.bku-audit-report`:
1. **Kop Surat Resmi Sekolah**: Logo daerah/pendidikan, Nama Sekolah, NPSN, Alamat Lengkap.
2. **Judul Dokumen**: `LEMBAR HASIL PENELAAHAN PRA-AUDIT FORENSIK KEUANGAN BOSP`.
3. **Data Identitas Audit**:
   - Jenis Buku / Objek Audit: Nama Tab (misal: Buku Pembantu Pajak / Buku Kas Umum).
   - Periode Pemeriksaan: Bulan / Tahap 1 / Tahap 2 / Tahun Anggaran.
   - Tanggal & Waktu Pemindaian: Format lokal Indonesia.
   - Engine Audit: `DeepSeek-R1 (Forensic Reasoning Engine)`.
4. **Ringkasan Skor & Opini Kepatuhan**: Skor (0–100) dan teks Ringkasan Eksekutif.
5. **Matriks Temuan & Rekomendasi Auditor**:
   Tabel formal:
   - Kolom 1: No
   - Kolom 2: Tingkat Risiko (Bahaya / Peringatan / Info)
   - Kolom 3: Fakta Temuan & Potensi Pelanggaran Regulasi
   - Kolom 4: Rekomendasi Tindak Lanjut Bendahara
   - Kolom 5: Nilai Nominal (Rp)
6. **Daftar Uji Regulasi & Kepatuhan (Compliance Checklist)**.
7. **Tanda Tangan Pengesahan**: Kepala Sekolah selaku Penanggung Jawab KPA dan Bendahara Pengeluaran Pembantu.

---

## 7. Rencana Pengujian & Validasi

1. **Pengujian Database Migration**: Memastikan kolom `tab_type`, `periode_type`, `periode_key` terbuat dengan nilai default aman dan indeks lookup terbentuk.
2. **Pengujian Modular Scanners**: Unit testing pada masing-masing dari 11 sub-scanner untuk periode bulanan, tahapan, dan tahunan.
3. **Pengujian AI Fallback**: Memastikan jika DeepSeek API key kosong atau timeout, sistem tetap menghasilkan skor dan temuan deterministik yang akurat.
4. **Pengujian UI Rekapitulasi**:
   - Memastikan tombol audit muncul di seluruh 11 tab.
   - Memastikan switcher periode di dalam modal berfungsi dengan mulus.
   - Memastikan badge skor ter-update setelah audit dijalankan.
5. **Pengujian Ekspor PDF**: Memastikan PDF terunduh dengan layout rapi dan data lengkap.
