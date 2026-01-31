<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Tanda Terima Honor</title>
    <style>
        /* Folio Landscape */
        @page {
            /* Size is handled by Controller */
            margin: 1.5cm;
        }

        body {
            font-family: "Times New Roman", Times, serif;
            font-size: {{ $fontSize ?? '10pt' }};
            line-height: 1.2;
            margin: 0;
            padding: 0;
        }

        .header {
            text-align: center;
            margin-bottom: 3px;
            border-bottom: 2px solid #000;
            padding-bottom: 2px;
            max-width: 100%;
            page-break-inside: always;
        }

        .letterhead {
            width: 60%;
            height: auto;
        }

        .header h2 {
            margin: 0;
            font-size: 1.4em;
            font-weight: bold;
            line-height: 1.3;
        }

        .header p {
            margin: 2px 0;
            font-size: 1.1em;
        }

        .info-section {
            margin-bottom: 15px;
        }

        .info-row {
            display: flex;
            margin-bottom: 5px;
        }

        .info-label {
            width: 150px;
            font-weight: bold;
        }

        .info-value {
            flex: 1;
        }

        .table-container {
            margin: 15px 0;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            font-size: {{ $fontSize ?? '10pt' }};
        }

        .table th {
            border: 1px solid #000;
            padding: 8px 5px;
            text-align: center;
            background-color: #f0f0f0;
            font-weight: bold;
        }

        .table td {
            border: 1px solid #000;
            padding: 20px 5px;
            text-align: left;
        }

        .table td:first-child,
        .table th:first-child {
            text-align: center;
            width: 2%;
        }

        .table td:nth-child(2) {
            width: 15%;
        }

        .table td:nth-child(3),
        .table th:nth-child(3) {
            text-align: center;
            width: 5%;
        }

        .table td:nth-child(4),
        .table th:nth-child(4) {
            text-align: center;
            width: 7%;
        }

        .table td:nth-child(5),
        .table th:nth-child(5) {
            width: 7%;
        }

        .table td:nth-child(6),
        .table th:nth-child(6) {
            width: 7%;
        }

        .table td:nth-child(7),
        .table th:nth-child(7) {
            width: 7%;
        }

        .table td:nth-child(8),
        .table th:nth-child(8) {
            width: 7%;
        }

        .table td:last-child,
        .table th:last-child {
            text-align: center;
            width: 10%;
        }

        .terbilang-section {
            margin: 10px 0;
            padding: 8px;
            border: 1px solid #000;
            background-color: #f8f8f8;
        }

        .footer {
            margin-top: 5px;
        }

        .signature-table {
            width: 100%;
            margin-top: 5px;
        }

        .signature-table td {
            text-align: center;
            vertical-align: top;
            width: 50%;
        }

        .signature-name {
            margin-top: 60px;
            font-weight: bold;
            text-decoration: underline;
        }

        .signature-nip {
            font-size: {{ $fontSize ?? '10pt' }};
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .text-bold {
            font-weight: bold;
        }

        .empty-row {
            height: 40px;
        }

        /* Currency formatting */
        .currency {
            text-align: right;
            padding-right: 10px;
        }

        /* Ensure proper page breaks */
        .page-break {
            page-break-after: always;
        }

        /* Line separator */
        .separator {
        border-top: 3px solid #000;
        margin: 0;
        }
    </style>
</head>

<body>
    <!-- Header -->
    @if ($sekolah && $sekolah->kop_surat)
    <div class="header">
        <img src="{{ public_path('storage/' . $sekolah->kop_surat) }}" class="letterhead" alt="Kop Surat">
    </div>
    @endif

    <div class="separator"></div>

    <!-- Information Section -->
    <div class="info-section">
        <table style="width: 100%; font-size: {{ $fontSize ?? '10pt' }};">
            <tbody>
                <tr>
                    <td>Kode Kegiatan</td>
                    <td>:</td>
                    <td>{{ $kodeKegiatan->kode ?? '-' }}</td>
                    <td>{{ $kodeKegiatan->sub_program ?? '-' }}</td>
                </tr>
                <tr>
                    <td>Kode Rekening</td>
                    <td>:</td>
                    <td>{{ $rekeningBelanja->kode_rekening ?? '-' }}</td>
                    <td>{{ $rekeningBelanja->rincian_objek ?? '-' }}</td>
                </tr>
                <tr>
                    <td>Uraian</td>
                    <td>:</td>
                    <td colspan="2">{{ $tandaTerima->bukuKasUmum->uraian_opsional ?? '-' }}</td>
                    <td></td>
                </tr>
                <tr>
                    <td>Sumber Dana</td>
                    <td>:</td>
                    <td colspan="2">BOSP Reguler</td>
                    <td></td>
                </tr>
            </tbody>>
            <table>
    </div>

    <!-- Table -->
    <div class="table-container">
        <table class="table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Volume</th>
                    <th>Satuan</th>
                    <th>Harga Satuan</th>
                    <th>Jumlah</th>
                    <th>Potongan Pajak</th>
                    <th>Jumlah yang diterima</th>
                    <th>Tanda Tangan</th>
                </tr>
            </thead>
            <tbody>
                <!-- Row 1 - Data utama -->
                <tr>
                    <td class="text-center">1</td>
                    <td>{{ $tandaTerima->bukuKasUmum->nama_penerima_pembayaran ?? '-' }}</td>
                    <td class="text-center">{{ $tandaTerima->bukuKasUmum->uraianDetails->first()->volume ?? '-' }}</td>
                    <td class="text-center">{{ $tandaTerima->bukuKasUmum->uraianDetails->first()->satuan ?? '-' }}</td>
                    <td class="currency" style="text-align: right;">Rp {{
                        number_format($tandaTerima->bukuKasUmum->uraianDetails->first()->harga_satuan ?? 500000, 0, ',',
                        '.') }}</td>
                    <td class="currency" style="text-align: right;">Rp {{ number_format($totalAmount, 0, ',', '.') }}</td>
                    <td class="currency" style="text-align: right;">
                        @if($pajakPusat > 0)
                        Rp {{ number_format($pajakPusat, 0, ',', '.') }}
                        @else
                        -
                        @endif
                    </td>
                    <td class="currency" style="text-align: right;">Rp {{ number_format($jumlahTerima, 0, ',', '.') }}</td>
                    <td class="text-center"></td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Footer Signature -->
    <div class="footer">
        <table class="signature-table">
            <tr>
                <td>
                    Mengetahui,<br>
                    Kepala Sekolah
                    <div class="signature-name">
                        {{ $tandaTerima->penganggaran->kepala_sekolah ?? '-' }}
                    </div>
                    <div class="signature-nip">
                        NIP. {{ $tandaTerima->penganggaran->nip_kepala_sekolah ?? '-' }}
                    </div>
                </td>
                <td>
                    {{ $tanggalLunas }}<br>
                    Bendahara BOSP
                    <div class="signature-name">
                        {{ $tandaTerima->penganggaran->bendahara ?? '-' }}
                    </div>
                    <div class="signature-nip">
                        NIP. {{ $tandaTerima->penganggaran->nip_bendahara ?? '-' }}
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>

</html>
