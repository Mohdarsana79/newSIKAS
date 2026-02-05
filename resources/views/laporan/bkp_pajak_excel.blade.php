<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Pembantu Pajak</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 4px;
            vertical-align: top;
        }
        .border-table th, .border-table td {
            border: 1px solid black;
        }
        .border-table th {
            text-align: center;
            background-color: #f0f0f0; 
            font-weight: bold;
        }
    </style>
</head>
<body>
    @foreach($reportData as $index => $report)

    @if($index > 0)
        <tr><td colspan="12"></td></tr>
        <tr><td colspan="12"></td></tr>
    @endif
    
    <div class="header">
        <table>
            <tr><td colspan="12" class="text-center bold">BUKU PEMBANTU PAJAK</td></tr>
            <tr><td colspan="12" class="text-center bold">BULAN : {{ strtoupper($report['bulan']) }} TAHUN : {{ $report['tahun'] }}</td></tr>
        </table>
    </div>

    <table class="meta-table">
        <tr>
            <td colspan="3">NPSN</td>
            <td>: {{ $report['sekolah']['npsn'] }}</td>
            <td colspan="8"></td>
        </tr>
        <tr>
            <td colspan="3">Nama Sekolah</td>
            <td>: {{ $report['sekolah']['nama_sekolah'] }}</td>
            <td colspan="8"></td>
        </tr>
        <tr>
            <td colspan="3">Desa / Kelurahan</td>
            <td>: {{ $report['sekolah']['kelurahan_desa'] }}</td>
            <td colspan="8"></td>
        </tr>
        <tr>
            <td colspan="3">Kecamatan</td>
            <td>: {{ $report['sekolah']['kecamatan'] }}</td>
            <td colspan="8"></td>
        </tr>
        <tr>
            <td colspan="3">Kabupaten</td>
            <td>: {{ $report['sekolah']['kabupaten_kota'] ?? $report['sekolah']['kabupaten'] }}</td>
            <td colspan="8"></td>
        </tr>
        <tr>
            <td colspan="3">Provinsi</td>
            <td>: {{ $report['sekolah']['provinsi'] }}</td>
            <td colspan="8"></td>
        </tr>
        <tr>
            <td colspan="3">Sumber Dana</td>
            <td>: BOSP Reguler</td>
            <td colspan="8"></td>
        </tr>
    </table>

    <br/>

    <table class="border-table">
        <thead>
            <tr>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Tanggal</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">No. Kode</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">No. Buku</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Uraian</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">PPN</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">PPh 21</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">PPh 22</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">PPh 23</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">PB 1</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">JML</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Pengeluaran (Kredit)</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Saldo</th>
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
                <td class="text-right">{{ isset($item['ppn']) && $item['ppn'] > 0 ? number_format($item['ppn'], 0, '.', ',') : '-' }}</td>
                <td class="text-right">{{ isset($item['pph21']) && $item['pph21'] > 0 ? number_format($item['pph21'], 0, '.', ',') : '-' }}</td>
                <td class="text-right">{{ isset($item['pph22']) && $item['pph22'] > 0 ? number_format($item['pph22'], 0, '.', ',') : '-' }}</td>
                <td class="text-right">{{ isset($item['pph23']) && $item['pph23'] > 0 ? number_format($item['pph23'], 0, '.', ',') : '-' }}</td>
                <td class="text-right">{{ isset($item['pb1']) && $item['pb1'] > 0 ? number_format($item['pb1'], 0, '.', ',') : '-' }}</td>
                <td class="text-right">{{ isset($item['jumlah']) && $item['jumlah'] > 0 ? number_format($item['jumlah'], 0, '.', ',') : '-' }}</td>
                <td class="text-right">{{ isset($item['pengeluaran']) && $item['pengeluaran'] > 0 ? number_format($item['pengeluaran'], 0, '.', ',') : '-' }}</td>
                <td class="text-right">{{ number_format($item['saldo'], 0, '.', ',') }}</td>
            </tr>
            @endforeach

            <!-- Footer Total -->
            <tr class="bold">
                <td colspan="4" class="text-center" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">Jumlah Penutupan</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_pajak']['ppn'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_pajak']['pph21'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_pajak']['pph22'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_pajak']['pph23'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_pajak']['pb1'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_penerimaan'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_pengeluaran'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['saldo_akhir'], 0, '.', ',') }}</td>
            </tr>
        </tbody>
    </table>

    <br/>

    <table>
        <tr>
            <td colspan="6" class="text-center">
                Mengetahui<br>
                Kepala Sekolah
                <br/><br/><br/><br/>
                <span style="font-weight: bold; text-transform: uppercase;">{{ $report['kepala_sekolah']['nama'] ?? '...................' }}</span><br>
                NIP. {{ $report['kepala_sekolah']['nip'] ?? '...................' }}
            </td>
            <td colspan="6" class="text-center">
                {{ $report['sekolah']['kecamatan'] }}, {{ $report['formatAkhirBulanLengkapHari'] }}<br>
                Bendahara
                <br/><br/><br/><br/>
                <span style="font-weight: bold; text-transform: uppercase;">{{ $report['bendahara']['nama'] ?? '...................' }}</span><br>
                NIP. {{ $report['bendahara']['nip'] ?? '...................' }}
            </td>
        </tr>
    </table>
    
    @endforeach
</body>
</html>
