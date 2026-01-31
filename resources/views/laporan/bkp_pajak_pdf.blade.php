<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Pembantu Pajak</title>
    <style>
        @page {
            size: {{ $paperSize ?? 'A4' }} {{ $orientation ?? 'landscape' }};
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: {{ $fontSize ?? '10pt' }};
            line-height: 1.3;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
            border: none;
            font-size: {{ $fontSize ?? '10pt' }};
        }
        .meta-table td {
            padding: 2px;
            vertical-align: top;
        }
        .meta-label {
            width: 150px;
        }
        .border-table {
            width: 100%;
            border-collapse: collapse;
            font-size: {{ $fontSize ?? '9pt' }}; /* Slightly smaller for many columns */
            margin-bottom: 15px;
        }
        .border-table th, .border-table td {
            border: 1px solid black;
            padding: 4px;
        }
        .border-table th {
            text-align: center;
            background-color: #f0f0f0;
            font-weight: bold;
            vertical-align: middle;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        .footer-text {
            margin-top: 15px;
            font-size: {{ $fontSize ?? '10pt' }};
        }
        
        .signature-section {
            margin-top: 30px;
            width: 100%;
            font-size: {{ $fontSize ?? '10pt' }};
        }
        .signature-table {
            width: 100%;
            text-align: center;
        }
        .signature-space {
            height: 70px;
        }
    </style>
</head>
<body>
    @foreach($reportData as $report)
    <div class="header">
        BUKU PEMBANTU PAJAK<br>
        BULAN : {{ strtoupper($report['bulan']) }} TAHUN : {{ $report['tahun'] }}
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">NPSN</td>
            <td width="10">:</td>
            <td>{{ $report['sekolah']['npsn'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Nama Sekolah</td>
            <td>:</td>
            <td>{{ $report['sekolah']['nama_sekolah'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Desa / Kelurahan</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kelurahan_desa'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kecamatan</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kecamatan'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kabupaten</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kabupaten_kota'] ?? $report['sekolah']['kabupaten'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Provinsi</td>
            <td>:</td>
            <td>{{ $report['sekolah']['provinsi'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Sumber Dana</td>
            <td>:</td>
            <td>BOSP Reguler</td>
        </tr>
    </table>

    <table class="border-table">
        <thead>
            <tr>
                <th width="70">Tanggal</th>
                <th width="60">No. Kode</th>
                <th width="100">No. Buku</th>
                <th>Uraian</th>
                <th width="40">PPN</th>
                <th width="40">PPh 21</th>
                <th width="40">PPh 22</th>
                <th width="40">PPh 23</th>
                <th width="40">PB 1</th>
                <th width="50">JML</th>
                <th width="60">Pengeluaran (Kredit)</th>
                <th width="60">Saldo</th>
            </tr>
        </thead>
        <tbody>
            @foreach($report['items'] as $item)
            <tr>
                <td class="text-center">
                    {{ isset($item['is_saldo_awal']) ? \Carbon\Carbon::parse($item['tanggal'])->format('j-n-Y') : \Carbon\Carbon::parse($item['tanggal'])->format('d-m-Y') }}
                </td>
                <td class="text-center">{{ $item['no_kode'] ?? '-' }}</td>
                <td class="text-center">{{ $item['no_buku'] ?? '-' }}</td>
                <td>{{ $item['uraian'] }}</td>
                <td class="text-right">{{ isset($item['ppn']) && $item['ppn'] > 0 ? number_format($item['ppn'], 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ isset($item['pph21']) && $item['pph21'] > 0 ? number_format($item['pph21'], 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ isset($item['pph22']) && $item['pph22'] > 0 ? number_format($item['pph22'], 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ isset($item['pph23']) && $item['pph23'] > 0 ? number_format($item['pph23'], 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ isset($item['pb1']) && $item['pb1'] > 0 ? number_format($item['pb1'], 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ isset($item['jumlah']) && $item['jumlah'] > 0 ? number_format($item['jumlah'], 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ isset($item['pengeluaran']) && $item['pengeluaran'] > 0 ? number_format($item['pengeluaran'], 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ number_format($item['saldo'], 0, ',', '.') }}</td>
            </tr>
            @endforeach

            <!-- Footer Total -->
            <tr class="bold" style="background-color: #e0e0e0;">
                <td colspan="4" class="text-center">Jumlah Penutupan</td>
                <td class="text-right">{{ number_format($report['data']['total_pajak']['ppn'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['total_pajak']['pph21'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['total_pajak']['pph22'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['total_pajak']['pph23'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['total_pajak']['pb1'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['total_penerimaan'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['total_pengeluaran'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['saldo_akhir'], 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td width="50%">
                    Mengetahui<br>
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <span style="font-weight: bold; text-transform: uppercase;">{{ $report['kepala_sekolah']['nama'] ?? '...................' }}</span><br>
                    NIP. {{ $report['kepala_sekolah']['nip'] ?? '...................' }}
                </td>
                <td width="50%">
                    {{ $report['sekolah']['kecamatan'] }}, {{ $report['formatAkhirBulanLengkapHari'] }}<br>
                    Bendahara
                    <div class="signature-space"></div>
                    <span style="font-weight: bold; text-transform: uppercase;">{{ $report['bendahara']['nama'] ?? '...................' }}</span><br>
                    NIP. {{ $report['bendahara']['nip'] ?? '...................' }}
                </td>
            </tr>
        </table>
    </div>

    @if(!$loop->last)
        <div style="page-break-after: always;"></div>
    @endif
    
    @endforeach
</body>
</html>
