<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Kas Umum</title>
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
            font-size: {{ $fontSize ?? '10pt' }};
            margin-bottom: 15px;
        }
        .border-table th, .border-table td {
            border: 1px solid black;
            padding: 4px;
        }
        .border-table th {
            text-align: center;
            background-color: transparent;
            font-weight: bold;
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
        .closing-table {
            width: 100%;
            font-size: {{ $fontSize ?? '10pt' }};
            margin-top: 10px;
        }
        .closing-table td {
            padding: 2px;
        }
        .dots-underline {
            border-bottom: 1px dotted #000;
        }
    </style>
</head>
<body>
    @foreach($reportData as $report)
    <div class="header">
        BUKU KAS UMUM<br>
        BULAN : {{ strtoupper($report['bulan']) }} TAHUN : {{ $report['tahun'] }}
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Nama Sekolah</td>
            <td width="10">:</td>
            <td>{{ $report['sekolah']['nama_sekolah'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Desa/Kecamatan</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kelurahan_desa'] }} / {{ $report['sekolah']['kecamatan'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kabupaten</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kabupaten'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Provinsi</td>
            <td>:</td>
            <td>{{ $report['sekolah']['provinsi'] }}</td>
        </tr>
    </table>

    <table class="border-table">
        <thead>
            <tr>
                <th>Tanggal</th>
                <th>Kode Rekening</th>
                <th>No. Bukti</th>
                <th>Uraian</th>
                <th>Penerimaan (Kredit)</th>
                <th>Pengeluaran (Debet)</th>
                <th>Saldo</th>
            </tr>
        </thead>
        <tbody>
@php
    // Debugging check: ensure items exist and have Saldo Awal
    if(count($report['items']) > 0 && strpos($report['items'][0]['uraian'], 'Saldo Awal') === false) {
         // This would imply sorting or data loss issue
    }
@endphp
            {{-- Items Loop --}}
            @php $currentSaldo = 0; @endphp
            @foreach($report['items'] as $item)
                @php
                    $penerimaan = $item['penerimaan'] ?? 0;
                    $pengeluaran = $item['pengeluaran'] ?? 0;
                    $currentSaldo = $currentSaldo + $penerimaan - $pengeluaran;
                @endphp
                <tr>
                    <td class="text-center">{{ \Carbon\Carbon::parse($item['tanggal'])->format('d-m-Y') }}</td>
                    <td class="text-center">{{ $item['kode_rekening'] ?? '-' }}</td>
                    <td class="text-center">{{ $item['no_bukti'] ?? '-' }}</td>
                    <td>{{ $item['uraian'] }}</td>
                    <td class="text-right">{{ $penerimaan != 0 ? number_format($penerimaan, 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ $pengeluaran != 0 ? number_format($pengeluaran, 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ number_format($currentSaldo, 0, ',', '.') }}</td>
                </tr>
            @endforeach

            {{-- Footer Total --}}
            <tr class="bold" style="background-color: #ccc;">
                <td colspan="4" class="text-center">Jumlah Penutupan</td>
                <td class="text-right">{{ number_format($report['data']['total_penerimaan'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['total_pengeluaran'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['saldo_akhir'], 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-text">
        Pada hari ini, {{ $report['formatAkhirBulanLengkapHari'] }} Buku Kas Umum ditutup dengan keadaan/posisi sebagai berikut :
    </div>

    <table class="closing-table">
        <tr>
            <td width="200">Saldo Buku Kas Umum</td>
            <td width="10">:</td>
            <td class="dots-underline" width="200">Rp. {{ number_format($report['data']['saldo_bku'], 0, ',', '.') }}</td>
            <td></td>
        </tr>
        <tr>
            <td>Saldo Bank</td>
            <td>:</td>
            <td class="dots-underline">Rp. {{ number_format($report['data']['saldo_bank'] ?? 0, 0, ',', '.') }}</td>
            <td></td>
        </tr>
         <tr>
            <td style="padding-left: 20px;">1. Dana Sekolah</td>
            <td>:</td>
            <td class="dots-underline">Rp. {{ number_format($report['data']['dana_sekolah'] ?? 0, 0, ',', '.') }}</td>
            <td></td>
        </tr>
        <tr>
            <td style="padding-left: 20px;">2. Dana BOSP</td>
            <td>:</td>
            <td class="dots-underline">Rp. {{ number_format($report['data']['dana_bosp'] ?? 0, 0, ',', '.') }}</td>
            <td></td>
        </tr>
        <tr>
            <td>Saldo Kas Tunai</td>
            <td>:</td>
            <td class="dots-underline">Rp. {{ number_format($report['data']['saldo_tunai'] ?? 0, 0, ',', '.') }}</td>
            <td></td>
        </tr>
        <tr class="bold">
            <td>Jumlah</td>
            <td>:</td>
            <td class="dots-underline">Rp. {{ number_format($report['data']['saldo_bku'], 0, ',', '.') }}</td>
            <td></td>
        </tr>
    </table>

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td width="50%">
                    Menyetujui,<br>
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <span style="text-decoration: underline; font-weight: bold; text-transform: uppercase;">{{ $report['kepala_sekolah']['nama'] ?? '...................' }}</span><br>
                    NIP. {{ $report['kepala_sekolah']['nip'] ?? '...................' }}
                </td>
                <td width="50%">
                    {{ $report['sekolah']['kecamatan'] }}, {{ $report['formatTanggalAkhirBulanLengkap'] }}<br>
                    Bendahara,
                    <div class="signature-space"></div>
                    <span style="text-decoration: underline; font-weight: bold; text-transform: uppercase;">{{ $report['bendahara']['nama'] ?? '...................' }}</span><br>
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
