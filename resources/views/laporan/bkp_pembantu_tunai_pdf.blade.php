<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Pembantu Tunai</title>
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
    </style>
</head>
<body>
    @foreach($reportData as $report)
    <div class="header">
        BUKU KAS PEMBANTU TUNAI<br>
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
            <td class="meta-label">Kelurahan / Desa</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kelurahan_desa'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kecamatan</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kecamatan'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kabupaten / Kota</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kabupaten'] }}</td>
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
            {{-- Calculate Penarikan First --}}
            {{-- Calculate Penarikan First --}}
            @php
                $totalPenarikan = $report['data']['totalPenarikan'] ?? 0;
                $saldoAwal = $report['data']['saldoAwalTunai'];
                $saldoWithPenarikan = $saldoAwal + $totalPenarikan;
                $filteredItems = $report['items'];
            @endphp

            {{-- Saldo Kas Tunai Row (Merged with Penarikan Tunai) --}}
            <tr>
                <td class="text-center">01-{{ $report['bulanAngkaStr'] }}-{{ $report['tahun'] }}</td>
                <td class="text-center">-</td>
                <td class="text-center">-</td>
                <td>Saldo Kas Tunai</td>
                <td class="text-right">{{ $totalPenarikan > 0 ? number_format($totalPenarikan, 0, ',', '.') : '0' }}</td>
                <td class="text-right">-</td>
                <td class="text-right">{{ number_format($saldoWithPenarikan, 0, ',', '.') }}</td>
            </tr>

            @php $currentSaldo = $saldoWithPenarikan; @endphp
            @foreach($filteredItems as $item)
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
                    <td class="text-right">{{ $penerimaan > 0 ? number_format($penerimaan, 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ $pengeluaran > 0 ? number_format($pengeluaran, 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ number_format($currentSaldo, 0, ',', '.') }}</td>
                </tr>
            @endforeach

            {{-- Footer Total --}}
            <tr class="bold">
                <td colspan="4" class="text-center">Jumlah Penutupan</td>
                <td class="text-right">{{ number_format($report['data']['totalPenerimaan'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['totalPengeluaran'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($report['data']['currentSaldo'], 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-text">
        Pada hari ini {{ $report['formatAkhirBulanLengkapHari'] }}, Buku Kas Pembantu Tunai ditutup dengan keadaan/posisi sebagai berikut :<br>
        <strong>Saldo Kas Tunai : {{ number_format($report['data']['currentSaldo'], 0, ',', '.') }}</strong>
    </div>

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
