<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kwitansi Pembayaran</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Roboto:wght@400;700&display=swap"
        rel="stylesheet">
    <style>
        /* CSS tetap sama seperti sebelumnya */
        body {
            font-family: 'Roboto', 'Arial Narrow', Arial, sans-serif;
            /* background-color: #f0f0f0; */
            display: flex;
            justify-content: center;
            align-items: flex-start;
            /* padding: 20px; */
            font-size: {{ $fontSize ?? '10pt' }};
            line-height: 1.2;
        }

        .kwitansi-container {
            /* width: 210mm;
            min-height: 297mm; */
            background-color: white;
            /* padding: 30px; */
            /* box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); */
            /* border: 1px solid #ccc; */
        }

        .bordered-content {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding-left: 5px;
            padding-right: 5px;
            display: inline-block;
            line-height: 1.2;
        }

        .text-end {
            text-align: right;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin-bottom: 0px;
        }

        .info-table td {
            vertical-align: top;
            padding: 1px 5px;
            border: none;
        }

        .info-table .label-col {
            width: 170px;
            padding-right: 5px;
        }

        .info-table .label-col-right {
            width: 5%;
        }

        .info-table .separator {
            width: 10px;
            text-align: center;
        }

        .info-table .info-content {
            width: auto;
        }

        .info-table .info-code-width {
            width: 20%;
        }

        .kwitansi-title {
            text-align: center;
            margin-bottom: 5px;
        }

        .kwitansi-title h1 {
            font-size: 24pt;
            font-family: 'Cinzel', serif;
            font-weight: 700;
            letter-spacing: 5px;
            color: #059669;
            border: 2px solid #059669;
            display: inline-block;
            padding: 2px 30px;
        }

        .receipt-info {
            margin-bottom: 5px;
            width: 100%;
        }

        .receipt-info .data-row {
            display: flex;
            margin-bottom: 5px;
        }

        .receipt-info .label-col {
            width: 170px;
            flex-shrink: 0;
        }

        .receipt-info .info-col {
            flex-grow: 1;
            font-weight: bold;
        }

        .detail-table-container {
            border: 2px solid #000;
            border-bottom: none;
            margin-bottom: 0px;
        }

        .detail-table-container table {
            width: 100%;
            border-collapse: collapse;
            font-size: {{ $fontSize ?? '10pt' }};
        }

        .detail-table-container th {
            font-weight: bold;
            border-bottom: 1px solid #000;
            background-color: #f5f5f5;
            padding: 4px;
            text-align: center;
        }

        .detail-table-container td {
            padding: 4px;
            border-bottom: 1px solid #e0e0e0;
            vertical-align: middle;
        }

        .detail-table-container tbody tr:last-of-type td {
            border-bottom: none;
        }

        .detail-table-container th:nth-child(1),
        .detail-table-container td:nth-child(1) {
            width: 45%;
            border-right: 1px solid #000;
            text-align: left;
        }

        .detail-table-container th:nth-child(1) {
            text-align: center;
        }

        .detail-table-container th:nth-child(2),
        .detail-table-container td:nth-child(2) {
            width: 8%;
            border-right: 1px solid #000;
            text-align: center;
        }

        .detail-table-container th:nth-child(3),
        .detail-table-container td:nth-child(3) {
            width: 10%;
            border-right: 1px solid #000;
            text-align: center;
        }

        .detail-table-container th:nth-child(4),
        .detail-table-container td:nth-child(4) {
            width: 15%;
            border-right: 1px solid #000;
            text-align: right;
        }

        .detail-table-container th:nth-child(5),
        .detail-table-container td:nth-child(5) {
            width: 22%;
            text-align: right;
        }

        .total-row {
            font-weight: bold;
            border-top: 1px solid #000;
            background-color: #f5f5f5;
        }

        .total-row td {
            border-bottom: none;
            padding-top: 5px;
            padding-bottom: 5px;
            vertical-align: middle;
        }

        .tax-and-total {
            margin-bottom: 30px;
            width: 100%;
            overflow: auto;
            border-top: 2px solid #000;
            padding-top: 10px;
        }

        .tax-section {
            font-size: {{ $fontSize ?? '10pt' }};
        }

        .tax-item {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin-left: 20px;
        }

        .tax-item span:nth-child(1) {
            width: 50px;
        }

        .tax-item span:nth-child(2) {
            margin-right: 2px;
        }

        .total-final-box {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            background-color: #f0f0f0;
            width: 250px;
            display: flex;
            font-size: {{ $fontSize ?? '10pt' }};
            font-weight: bold;
            margin-top: 15px;
            margin-left: 0;
        }

        .total-final-box div {
            padding: 5px;
        }

        .total-final-box div:first-child {
            width: 50%;
        }

        .total-final-box div:last-child {
            width: 50%;
            text-align: right;
        }

        .signature-area {
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: {{ $fontSize ?? '10pt' }};
            width: 100%;
        }

        .signature-block {
            width: auto;
            padding: 0 15px;
        }

        .signature-block p {
            margin: 2px 0;
        }

        .signature-block .role {
            font-weight: bold;
            margin-bottom: 50px;
        }

        .signature-block .name {
            font-weight: bold;
            text-decoration: underline;
        }

        .signature-block .nip {
            font-size: 9pt;
        }

        .kepsek-block {
            text-align: center;
            margin-top: 10px;
            font-size: {{ $fontSize ?? '10pt' }};
        }

        .kepsek-block .role {
            font-weight: bold;
            margin-bottom: 50px;
        }

        .kepsek-block .name {
            font-weight: bold;
            text-decoration: underline;
            margin: 2px 0;
        }

        .kepsek-block .nip {
            font-size: 9pt;
            margin: 2px 0;
        }
    </style>
</head>

<body>
    <div class="kwitansi-container">
        <!-- Bagian Header (Informasi Program dan Anggaran) -->
        <div>
            <table class="info-table">
                <tr>
                    <!-- KIRI -->
                    <td class="label-col">Sumber Dana</td>
                    <td class="separator">:</td>
                    <td class="info-content info-code-width">BOS Pusat</td>

                    <!-- KANAN -->
                    <td class="label-col label-col-right">No</td>
                    <td class="separator">:</td>
                    <td class="info-content">
                        <span class="bordered-content">
                             No : {{ str_pad($kwitansi->id, 3, '0', STR_PAD_LEFT) }}/BOS/{{ $tahapRoman ?? 'THP-I' }}/{{ $kwitansi->penganggaran->tahun_anggaran ?? date('Y') }}
                        </span>
                    </td>
                </tr>
                <!-- ROW 2: Tahun Anggaran / KOSONG -->
                <tr>
                    <!-- KIRI -->
                    <td class="label-col">Tahun Anggaran</td>
                    <td class="separator">:</td>
                    <td class="info-content info-code-width">{{ $kwitansi->penganggaran->tahun_anggaran ?? '-' }}</td>

                    <!-- KANAN: KOSONG -->
                    <td class="label-col label-col-right">&nbsp;</td>
                    <td class="separator">&nbsp;</td>
                    <td class="info-content">&nbsp;</td>
                </tr>
                <!-- ROW 3: Program -->
                <tr>
                    <!-- KIRI -->
                    <td class="label-col">Program</td>
                    <td class="separator">:</td>
                    <td class="info-content info-code-width">{{ $parsedKode['kode_program'] ?? '-' }}</td>

                    <!-- KANAN: Program Description -->
                    <td class="info-content" colspan="3">{{ $parsedKode['program'] ?? '-' }}</td>
                </tr>
                <!-- ROW 4: Kode Sub Program -->
                <tr>
                    <!-- KIRI (Kode Sub Program) -->
                    <td class="label-col">Kode Sub Program</td>
                    <td class="separator">:</td>
                    <td class="info-content info-code-width text-end">{{ $parsedKode['kode_sub_program'] ?? '-' }}
                    </td>

                    <!-- KANAN: Sub Program Description -->
                    <td class="info-content" colspan="3">{{ $parsedKode['sub_program'] ?? '-' }}</td>
                </tr>
                <!-- ROW 5: Kode Uraian/Kegiatan -->
                <tr>
                    <!-- KIRI (Kode Uraian/Kegiatan) -->
                    <td class="label-col">Kode Uraian/Kegiatan</td>
                    <td class="separator">:</td>
                    <td class="info-content info-code-width text-end">{{ $parsedKode['kode_uraian'] ?? '-' }}
                    </td>

                    <!-- KANAN: Uraian Kegiatan Description -->
                    <td class="info-content" colspan="3">{{ $parsedKode['uraian'] ?? '-' }}</td>
                </tr>

                <tr>
                    <!-- KIRI (Kode Rekening Rincian Objek) -->
                    <td class="label-col">Kode Rekening Rincian Objek</td>
                    <td class="separator">:</td>
                    <td class="info-content info-code-width text-end">{{ $kwitansi->rekeningBelanja->kode_rekening ??
                        '-' }}</td>

                    <!-- KANAN: Uraian Rekening -->
                    <td class="info-content" colspan="3">{{ $kwitansi->rekeningBelanja->rincian_objek ?? '-' }}</td>
                </tr>
            </table>
        </div>

        <!-- Judul KWITANSI -->
        <div class="kwitansi-title">
            <h1>KWITANSI</h1>
        </div>

        <!-- Bagian Penerimaan Uang -->
        <div class="receipt-info">
            <div class="data-row">
                <table>
                    <tr>
                        <td width="20%"><span class="label-col">Sudah Terima Dari</span></td>
                        <td widht="2%"><span class="label-col">:</span></td>
                        <td width="78%"><span class="label-col">Bendahara Dana BOSP {{ ucwords(strtolower($kwitansi->sekolah->nama_sekolah ?? '-'))
                        }}</span></td>
                    </tr>
                    <tr>
                        <td><span class="label-col">Uang Sebanyak</span></td>
                        <td><span class="label-col">:</span></td>
                        <td><span class="label-col">{{ ucwords(strtolower($jumlahUangText ?? '-')) }}</span></td>
                    </tr>
                    <tr>
                        <td><span class="label-col">Untuk Pembayaran</span></td>
                        <td><span class="label-col">:</span></td>
                        <td><span class="label-col">{{ $kwitansi->bukuKasUmum->uraian_opsional
                        ?? $kwitansi->bukuKasUmum->uraian }}</span></td>
                    </tr>
                <table>
            </div>
        </div>

        <!-- Bagian Rincian Item - PERBAIKAN DI SINI -->
        <div class="detail-table-container">
            <table>
                <thead>
                    <tr>
                        <th>Rincian</th>
                        <th>Jml</th>
                        <th>Satuan</th>
                        <th>Harga Satuan</th>
                        <th>Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                    $totalAmount = $totalAmount ?? 0;
                    $uraianDetails = $kwitansi->bukuKasUmum->uraianDetails ?? collect([]);
                    @endphp

                    @if($uraianDetails->count() > 0)
                    @foreach($uraianDetails as $detail)
                    @php
                    $subtotal = $detail->subtotal ?? ($detail->volume * $detail->harga_satuan);
                    @endphp
                    <tr>
                        <td>{{ $detail->uraian }}</td>
                        <td>{{ number_format($detail->volume, 0, ',', '.') }}</td>
                        <!-- PERBAIKAN: volume bukan jumlah -->
                        <td>{{ $detail->satuan ?? '-' }}</td> <!-- PERBAIKAN: tampilkan satuan -->
                        <td>{{ number_format($detail->harga_satuan, 0, ',', '.') }}</td>
                        <td>{{ number_format($subtotal, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                    @else
                    <!-- Fallback jika tidak ada uraian details -->

                    <tr>
                        <td>{{ $kwitansi->bukuKasUmum->uraian_opsional ?? $kwitansi->bukuKasUmum->uraian }}</td>
                        <td></td>
                        <td></td>
                        <td>{{ number_format($totalAmount, 0, ',', '.') }}</td>
                        <td>{{ number_format($totalAmount, 0, ',', '.') }}</td>
                    </tr>
                    @endif

                    <!-- Total Jumlah -->
                    <tr class="total-row">
                        <td colspan="3"
                            style="text-align: right; padding-right: 10px; font-weight: bold; border-right: 1px solid #000;">
                            Jumlah
                        </td>
                        <td style="text-align: right; font-weight: bold;" colspan="2">
                            {{ number_format($totalAmount, 0, ',', '.') }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Bagian Pajak dan Total Akhir -->
        <div class="tax-and-total">
            <div class="tax-section">
                <p style="font-weight: bold; margin-bottom: 5px;">Sudah termasuk pajak</p>
                <div class="tax-item">
                    <table style="width: 50%;">
                        <tr>
                            <td style="width: 10%;"><span>PPn</span></td>
                            <td style="width: 2%;"><span>=</span></td>
                            <td><span>Rp {{ number_format($pajakData['ppn'] ?? 0, 0, ',', '.') }}</span></td>
                        </tr>
                        <tr>
                            <td><span>PPh</span></td>
                            <td><span>=</span></td>
                            <td><span>Rp {{number_format($pajakData['pph'] ?? 0, 0, ',', '.') }}</span></td>
                        </tr>
                        <tr>
                            <td><span>PB1</span></td>
                            <td><span>=</span></td>
                            <td><span>Rp {{ number_format($pajakData['pb1'] ?? 0, 0, ',', '.') }}</span></td>
                        </tr>
                    <table>
                </div>

                <!-- Kotak Total Akhir -->
                <div class="total-final-box">
                    <table style="width:100%">
                        <tr>
                            <td>Jumlah</td>
                            <td style="text-align: right;">: Rp {{ number_format($totalAmount, 0, ',', '.') }}</td>
                        </tr>
                    <table>
                </div>
            </div>
        </div>

        <!-- PERBAIKAN: Bagian Tanda Tangan - HAPUS TABEL KOSONG -->
        <div class="signature-area">
            <table style="border: none; border-collapse: collapse; width:100%; text-align:center">
                <tr>
                    <td>
                        <!-- Kolom Kiri: Bendahara BOSP -->
                        <div class="signature-block" style="margin-right: 300px;">
                            <p>{{ $tanggalLunas ?? '-' }}</p>
                            <p class="role">Bendahara BOSP</p>
                            <p class="name">{{$kwitansi->penganggaran->bendahara}}</p>
                            <p class="nip">NIP. {{$kwitansi->penganggaran->nip_bendahara}}</p>
                        </div>
                    </td>
                    <td>
                        <!-- Kolom Kanan: Yang Menerima -->
                        <div class="signature-block">
                            <p>&nbsp;</p>
                            <p class="role">Yang Menerima</p>
                            <p class="name">..........................................</p>
                            <p class="nip">&nbsp;</p>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Area Tanda Tangan Kepala Sekolah -->
        <div class="kepsek-block">
            <p>Mengetahui,</p>
            <p class="role">Kepala Sekolah</p>
            <p class="name">{{$kwitansi->penganggaran->kepala_sekolah}}</p>
            <p class="nip">NIP. {{ $kwitansi->penganggaran->nip_kepala_sekolah }}</p>
        </div>
    </div>
</body>

</html>
