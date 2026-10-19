<!DOCTYPE html>
<html lang="id">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>CaLK BOSP - {{ $sekolah['nama'] ?? 'Sekolah' }} - TA {{ $report->tahun_anggaran }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 1.5cm 1.8cm 1.5cm 1.8cm;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9.5pt;
            line-height: 1.45;
            color: #111827;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 14px;
        }
        .school-name {
            font-size: 13.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .school-address {
            font-size: 8pt;
            color: #374151;
            line-height: 1.3;
        }
        .doc-title {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 14px;
            margin-bottom: 2px;
        }
        .doc-subtitle {
            text-align: center;
            font-size: 9pt;
            color: #4b5563;
            margin-bottom: 16px;
        }
        .section-header {
            font-size: 10pt;
            font-weight: bold;
            background-color: #f3f4f6;
            padding: 5px 8px;
            border-left: 3.5px solid #2563eb;
            margin-top: 14px;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .chapter-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #1e3a8a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 3px;
            margin-top: 16px;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .narrative-box {
            font-size: 9pt;
            text-align: justify;
            white-space: pre-line;
            margin-bottom: 10px;
            line-height: 1.5;
        }
        .table-custom {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-top: 8px;
            margin-bottom: 12px;
        }
        .table-custom th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: bold;
            text-align: center;
            border: 1px solid #94a3b8;
            padding: 5px 6px;
        }
        .table-custom td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .font-bold {
            font-weight: bold;
        }
        .sign-table {
            width: 100%;
            margin-top: 25px;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        .sign-table td {
            width: 50%;
            text-align: center;
            vertical-align: top;
            font-size: 9pt;
        }
        .sign-space {
            height: 60px;
        }
        .footer-note {
            margin-top: 15px;
            font-size: 7.5pt;
            color: #6b7280;
            border-top: 0.5px solid #e5e7eb;
            padding-top: 4px;
            text-align: center;
        }
    </style>
</head>
<body>

    <!-- Kop Surat -->
    <div class="header">
        <div class="school-name">{{ $sekolah['nama'] ?? 'SATUAN PENDIDIKAN' }}</div>
        <div class="school-address">
            NPSN: {{ $sekolah['npsn'] ?? '-' }} • Alamat: {{ $sekolah['alamat'] ?? '-' }}<br>
            Kecamatan {{ $sekolah['kecamatan'] ?? '-' }}, {{ $sekolah['kabupaten'] ?? '-' }}, Provinsi {{ $sekolah['provinsi'] ?? '-' }}
        </div>
    </div>

    <!-- Judul Dokumen -->
    <div class="doc-title">CATATAN ATAS LAPORAN KEUANGAN (CaLK)</div>
    <div class="doc-subtitle">
        BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) {{ strtoupper($report->variant) }}<br>
        {{ $metrics['periode_label'] ?? 'Tahun Anggaran' }} {{ $report->tahun_anggaran }}
    </div>

    <!-- Tabel Ringkasan Realisasi -->
    <div class="section-header">IKHTISAR RINGKASAN REALISASI KEUANGAN</div>
    <table class="table-custom">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 45%;">Pos Akun Anggaran & Belanja</th>
                <th style="width: 25%;">Target Pagu / Penerimaan</th>
                <th style="width: 25%;">Realisasi Pengeluaran</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-center font-bold">1</td>
                <td class="font-bold">Total Pagu Anggaran BOSP</td>
                <td class="text-right font-bold">Rp {{ number_format($finansial['pagu_anggaran'] ?? 0, 0, ',', '.') }}</td>
                <td class="text-center">-</td>
            </tr>
            <tr>
                <td class="text-center">2</td>
                <td>Penerimaan Dana Transfer BOSP Masuk</td>
                <td class="text-right">Rp {{ number_format($finansial['total_penerimaan'] ?? 0, 0, ',', '.') }}</td>
                <td class="text-center">-</td>
            </tr>
            <tr>
                <td class="text-center">3</td>
                <td>Belanja Pegawai (Honorarium Non-ASN)</td>
                <td class="text-center">-</td>
                <td class="text-right">Rp {{ number_format($finansial['belanja_pegawai'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td class="text-center">4</td>
                <td>Belanja Barang dan Jasa (Operasional & Bahan Ajar)</td>
                <td class="text-center">-</td>
                <td class="text-right">Rp {{ number_format($finansial['belanja_barang_jasa'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td class="text-center">5</td>
                <td>Belanja Modal (Peralatan, IT, & Aset Tetap)</td>
                <td class="text-center">-</td>
                <td class="text-right">Rp {{ number_format($finansial['belanja_modal'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
                <td class="text-center font-bold" colspan="2">TOTAL REALISASI BELANJA KAS</td>
                <td class="text-center font-bold">-</td>
                <td class="text-right font-bold" style="color: #1e3a8a;">Rp {{ number_format($finansial['total_belanja'] ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td class="text-center font-bold" colspan="2">PERSENTASE TINGKAT SERAPAN ANGGARAN</td>
                <td class="text-center font-bold" colspan="2" style="color: #059669;">{{ $finansial['persentase_serapan'] ?? 0 }}%</td>
            </tr>
            <tr style="background-color: #f0fdf4;">
                <td class="text-center font-bold" colspan="2">SISA SALDO KAS AKHIR (KAS BANK + TUNAI)</td>
                <td class="text-center font-bold" colspan="2">Rp {{ number_format($finansial['saldo_kas_total'] ?? 0, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <!-- BAB I: Pendahuluan -->
    <div class="chapter-title">BAB I: PENDAHULUAN</div>
    <div class="narrative-box">
        {{ $report->bab_1_pendahuluan }}
    </div>

    <!-- BAB II: Kebijakan Akuntansi -->
    <div class="chapter-title">BAB II: KEBIJAKAN AKUNTANSI</div>
    <div class="narrative-box">
        {{ $report->bab_2_kebijakan_akuntansi }}
    </div>

    <!-- BAB III: Analisis Realisasi Anggaran -->
    <div class="chapter-title">BAB III: ANALISIS REALISASI ANGGARAN & CAPAIAN TARGET</div>
    <div class="narrative-box">
        {{ $report->bab_3_analisis_realisasi }}
    </div>

    <!-- BAB IV: Penjelasan Pos Keuangan -->
    <div class="chapter-title">BAB IV: PENJELASAN POS-POS LAPORAN KEUANGAN</div>
    <div class="narrative-box">
        {{ $report->bab_4_penjelasan_pos_keuangan }}
    </div>

    <!-- BAB V: Penutup -->
    <div class="chapter-title">BAB V: PENUTUP & KESIMPULAN</div>
    <div class="narrative-box">
        {{ $report->bab_5_penutup }}
    </div>

    <!-- Lembar Pengesahan Tanda Tangan -->
    <table class="sign-table">
        <tr>
            <td>
                Mengetahui,<br>
                Kepala Satuan Pendidikan<br>
                <strong>{{ $sekolah['nama'] ?? 'Sekolah' }}</strong>
                <div class="sign-space"></div>
                <strong><u>{{ $sekolah['kepala_sekolah'] ?? 'Kepala Sekolah' }}</u></strong><br>
                NIP. {{ $sekolah['nip_kepala_sekolah'] ?? '-' }}
            </td>
            <td>
                {{ $sekolah['kabupaten'] ?? 'Ditetapkan' }}, {{ $tanggalCetak }}<br>
                Bendahara BOSP
                <div class="sign-space"></div>
                <strong><u>{{ $sekolah['bendahara'] ?? 'Bendahara BOSP' }}</u></strong><br>
                NIP. {{ $sekolah['nip_bendahara'] ?? '-' }}
            </td>
        </tr>
    </table>

    <div class="footer-note">
        Dokumen Catatan Atas Laporan Keuangan (CaLK) ini dihasilkan secara terkomputerisasi melalui Sistem Informasi Keuangan Sekolah (newSIKAS) bertenaga DeepSeek-V3 AI.
    </div>

</body>
</html>
