# Spesifikasi Desain: Registrasi Penutupan Kas (Formulir BOS-K7B) pada SIKAS AI Copilot

**Tanggal**: 20 Oktober 2026  
**Status**: Disetujui (Approved)  
**Tujuan**: Menyediakan kemampuan bagi SIKAS AI Copilot untuk menyajikan data resmi **Register Penutupan Kas (Formulir BOS-K7B)** per bulan anggaran aktif dengan akurasi matematis 100%, lengkap dengan status tutup buku, posisi kas, rincian pecahan fisik uang kertas/logam, rekonsiliasi selisih kas, serta analisis kepatuhan batas saldo kas tunai.

---

## 1. Latar Belakang & Kebutuhan Pengguna

Di akhir periode pembukuan bulanan, bendahara dan kepala sekolah wajib melakukan pemeriksaan kas dan menutup Buku Kas Umum (BKU). Hasil pemeriksaan kas tersebut dituangkan dalam dokumen resmi **Register Penutupan Kas (Formulir BOS-K7B)** dan **Berita Acara Pemeriksaan Kas**.

Sebelumnya, AI Copilot telah dapat menyajikan:
- Ringkasan Pagu RKAS (`get_budget_pagu_summary`)
- Realisasi Belanja BKU (`get_bku_monthly_realization`)
- Buku Pembantu Bank (`get_bkp_bank_monthly`)
- Buku Pembantu Kas Tunai (`get_bkp_tunai_monthly`)
- Buku Pembantu Pajak (`get_bkp_pajak_monthly`)
- Buku Pembantu Rincian Objek Belanja (`get_bkp_rob_monthly`)

Namun, AI Copilot belum memiliki fungsi untuk mengecek dan menyajikan **Register Penutupan Kas (BOS-K7B)** secara komprehensif. Ketika pengguna bertanya:
- *"Bagaimana posisi penutupan kas bulan Maret 2025?"*
- *"Tampilkan register penutupan kas bulan ini"*
- *"Apakah BKU bulan Februari sudah ditutup? Bagaimana rincian uang kertas dan logamnya?"*
- *"Cek apakah saldo buku dan kas fisik bulan Januari sudah klop?"*

AI memerlukan tool khusus yang mengekstrak data identik dengan laporan resmi K7B SIKAS.

---

## 2. Keputusan Arsitektur & Perilaku Sistem

### 2.1 Re-use `BukuKasService`
Perhitungan angka-angka penutupan kas tidak akan dihitung ulang dengan query kustom mandiri di dalam `CopilotService`, melainkan memanfaatkan instance `App\Services\BukuKasService` yang sudah teruji dan digunakan oleh `RegistrasiPenutupanKasController` serta `BeritaAcaraPenutupanController`.
- Memastikan angka **Saldo Buku**, **Saldo Kas Tunai**, **Saldo Kas Bank**, dan **Denominasi Uang** identik 100% dengan formulir PDF dan Web UI.
- Mendukung multi-varian BOSP (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`) melalui `new BukuKasService($variant)`.

### 2.2 Penanganan Bulan yang Belum Ditutup Resmi
- **Sudah Ditutup Resmi**: Jika di BKU terdapat record `is_bunga_record = true` pada bulan dan tahun bersangkutan, status penutupan adalah `"Resmi Ditutup pada DD MMMM YYYY"` dengan tanggal penutupan riil dari kolom `tanggal_tutup`.
- **Belum Ditutup (Posisi Berjalan / Draft)**: Jika record penutupan belum ada, AI **tetap menyajikan kalkulasi posisi kas berjalan** sebagai simulasi penutupan kas real-time, disertai badge jelas bahwa BKU bulan tersebut belum ditutup resmi di sistem, sehingga bendahara dapat memeriksa fisik kas sebelum menekan tombol tutup buku di BKU.

### 2.3 Penyajian Pecahan Uang Kertas & Logam yang Bersih
- AI menyajikan pecahan uang kertas (Rp 100.000 s/d Rp 1.000) dan uang logam (Rp 1.000 s/d Rp 100) yang memiliki lembar/keping > 0 agar ringkas, bersih, dan tidak memenuhi layar chat.
- Jika saldo kas tunai Rp 0, AI cukup memberikan keterangan informatif: *"Kas Tunai Fisik di Brankas Nihil (Rp 0)"*.

### 2.4 Analisis Cerdas & Pengingat Audit
1. **Analisis Rekonsiliasi (Klop / Seimbang)**: Menegaskan apakah Saldo Buku (A = D - K) klop 100% dengan Total Kas Fisik (Tunai + Bank), atau jika ada selisih, menjelaskan penyebabnya.
2. **Peringatan Batas Kas Tunai Brankas**: Sesuai juknis BOSP, uang tunai di brankas bendahara pada akhir bulan tidak boleh melebihi batas regulasi (Rp 10.000.000). Jika saldo kas tunai > Rp 10.000.000, AI memberikan peringatan ramah untuk menyetorkan kelebihan tunai ke bank.
3. **Pengingat Tutup Buku**: Jika bulan bersangkutan belum ditutup resmi di BKU, ingatkan bendahara untuk menutup BKU setelah memastikan semua kuitansi selesai diinput.
4. **Rekomendasi Lanjutan**: Saran mencetak dokumen fisik formulir BOS-K7B jika pemeriksaan kas sudah rampung.

---

## 3. Spesifikasi Teknis Komponen

### 3.1 Definisi Tool: `get_bkp_registrasi_penutupan_kas_monthly`

Daftarkan tool baru pada array `$tools` di `CopilotService.php`:

```json
{
  "type": "function",
  "function": {
    "name": "get_bkp_registrasi_penutupan_kas_monthly",
    "description": "Mengambil data resmi Register Penutupan Kas (Formulir BOS-K7B) pada bulan tertentu dalam tahun anggaran aktif. Menyajikan status tutup buku BKU, tanggal penutupan kas, ringkasan penerimaan (D), pengeluaran (K), saldo buku (A = D - K), saldo kas tunai (B), rincian pecahan fisik uang kertas dan uang logam, saldo rekening bank (3), total kas fisik (1+2+3), rekonsiliasi selisih kas, dan data pejabat pemeriksa (Kepala Sekolah & Bendahara). Panggil tool ini saat pengguna bertanya tentang Register Penutupan Kas, K7B, penutupan kas bulanan, posisi kas fisik uang brankas/bank, atau berita acara pemeriksaan kas.",
    "parameters": {
      "type": "object",
      "properties": {
        "bulan": {
          "type": "string",
          "enum": ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
          "description": "Nama bulan penutupan kas yang diminta (Januari sampai Desember)."
        },
        "tahun": {
          "type": "integer",
          "description": "Tahun anggaran penutupan kas (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini."
        }
      },
      "required": ["bulan"]
    }
  }
}
```

### 3.2 Data Output dari Backend (`CopilotService::getRegisterPenutupanKasMonthly`)

```php
return [
    'tahun' => $tahun,
    'bulan' => $bulan,
    'status_penutupan' => $isClosed ? 'Sudah Ditutup Resmi' : 'Belum Ditutup (Draft / Posisi Berjalan)',
    'is_closed_officially' => $isClosed,
    'tanggal_penutupan' => $tanggalPenutupan,
    'tanggal_penutupan_lalu' => $tanggalPenutupanLalu,
    'posisi_kas_buku' => [
        'total_penerimaan' => $totalPenerimaan,
        'total_pengeluaran' => $totalPengeluaran,
        'saldo_buku' => $saldoBuku,
    ],
    'posisi_kas_fisik' => [
        'saldo_kas_tunai' => $saldoKas,
        'saldo_kas_bank' => $saldoBank,
        'total_kas_fisik' => $saldoAkhirBuku, // Sub1 + Sub2 + Sub3
    ],
    'rincian_denominasi' => [
        'uang_kertas' => $uangKertasFiltered, // Hanya lembar > 0
        'total_uang_kertas' => $totalUangKertas,
        'uang_logam' => $uangLogamFiltered,   // Hanya keping > 0
        'total_uang_logam' => $totalUangLogam,
        'has_tunai' => $saldoKas > 0,
    ],
    'rekonsiliasi' => [
        'selisih' => $selisih, // saldoBuku - saldoAkhirBuku
        'is_balanced' => abs($selisih) < 0.01,
        'penjelasan_perbedaan' => $penjelasanPerbedaan,
    ],
    'audit_compliance' => [
        'is_cash_limit_exceeded' => $saldoKas > 10000000,
        'cash_limit_amount' => 10000000,
        'bunga_bank' => $bungaRecord ? (float) $bungaRecord->bunga_bank : 0.0,
        'pajak_bunga' => $bungaRecord ? (float) $bungaRecord->pajak_bunga_bank : 0.0,
    ],
    'pejabat' => [
        'nama_bendahara' => $penganggaran->bendahara ?? '-',
        'nip_bendahara' => $penganggaran->nip_bendahara ?? '-',
        'nama_kepala_sekolah' => $penganggaran->kepala_sekolah ?? '-',
        'nip_kepala_sekolah' => $penganggaran->nip_kepala_sekolah ?? '-',
        'kecamatan' => $sekolah->kecamatan ?? '-',
    ],
];
```

### 3.3 Format Tampilan Output Respons AI (Chat UI)

AI menyajikan jawaban dalam format HTML markdown yang rapi:

1. **Header & Status Penutupan:**
   Menyebutkan bulan dan tahun, status tutup buku (Resmi Ditutup pada tanggal X vs Draft Berjalan), nama Bendahara dan Kepala Sekolah.
2. **Ringkasan Posisi Kas (Formulir BOS-K7B):**
   Tabel HTML ringkas:
   - Jumlah Total Penerimaan (D)
   - Jumlah Total Pengeluaran (K)
   - Saldo Buku (A = D - K)
   - Saldo Kas Tunai di Bendahara (B)
   - Saldo Kas Bank (3)
   - Jumlah Kas Fisik Riil (1 + 2 + 3)
   - Perbedaan / Selisih (A - B)
3. **Tabel Rincian Denominasi Uang Fisik:**
   - Menyajikan pecahan uang kertas & logam yang ada isinya (pecahan nominal, jumlah lembar/keping, dan subtotal nominal).
   - Jika saldo kas tunai Rp 0, tampilkan keterangan santai bahwa brankas tunai nihil dan seluruh saldo berada di bank.
4. **Analisis Audit & Rekomendasi:**
   - Kepastian bahwa kas klop/seimbang (Rp 0 selisih).
   - Pengingat batas kas tunai (maksimal Rp 10jt).
   - Pengingat tutup buku jika belum ditutup.
   - Rekomendasi cetak formulir PDF BOS-K7B.

---

## 4. Rencana Pengujian

1. **Verifikasi Bulan yang Sudah Ditutup (Tutup Buku Resmi)**
   - Jalankan pemanggilan untuk bulan yang telah memiliki `is_bunga_record = true` di DB (misal Maret 2025).
   - Pastikan tanggal penutupan riil terbaca dan nominal bunga bank/pajak bunga terlampir.
2. **Verifikasi Bulan yang Belum Ditutup (Draft Posisi Berjalan)**
   - Jalankan pemanggilan untuk bulan yang belum ditutup (misal Februari atau April 2025).
   - Pastikan status tercatat draft berjalan tanpa error, dengan fallback tanggal akhir bulan.
3. **Verifikasi Denominasi Pecahan Uang**
   - Pastikan perhitungan lembar uang kertas dan keping uang logam sesuai dengan saldo kas tunai.
   - Pastikan pecahan bernilai 0 tidak mengotori tabel.
4. **Verifikasi PHP Syntax & Pint**
   - `php -l app/Services/Ai/CopilotService.php`
   - `vendor/bin/pint --dirty`
5. **Git Commit**
   - Simpan perubahan dalam commit bersih.
