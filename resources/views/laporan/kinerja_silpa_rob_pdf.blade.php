<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Pembantu Rincian Objek Belanja</title>
    <style>
        @page {
            size: {{ $printSettings['ukuran_kertas'] ?? 'A4' }} {{ $printSettings['orientasi'] ?? 'portrait' }};
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: {{ $printSettings['font_size'] ?? '10pt' }};
            line-height: 1.3;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .uppercase {
            text-transform: uppercase;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
            border: none;
            font-size: {{ $printSettings['font_size'] ?? '10pt' }};
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
            font-size: {{ $printSettings['font_size'] ?? '10pt' }};
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
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        .bg-gray { background-color: #f0f0f0; }
        
        .signature-section {
            margin-top: 30px;
            width: 100%;
            font-size: {{ $printSettings['font_size'] ?? '10pt' }};
            page-break-inside: avoid;
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
    @foreach($reports as $report)
    <div class="header uppercase">
        BUKU PEMBANTU RINCIAN OBJEK BELANJA<br>
        Bulan {{ $report['bulan'] }} Tahun {{ $report['tahun'] }}
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">NPSN</td>
            <td width="10">:</td>
            <td>{{ $report['sekolah']->npsn ?? '-' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Nama Sekolah</td>
            <td>:</td>
            <td>{{ $report['sekolah']->nama_sekolah ?? '-' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Desa / Kelurahan</td>
            <td>:</td>
            <td>{{ $report['sekolah']->kelurahan_desa ?? '-' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kecamatan</td>
            <td>:</td>
            <td>{{ $report['sekolah']->kecamatan ?? '-' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kabupaten / Kota</td>
            <td>:</td>
            <td>{{ $report['sekolah']->kabupaten_kota ?? '-' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Provinsi</td>
            <td>:</td>
            <td>{{ $report['sekolah']->provinsi ?? '-' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Anggaran Belanja</td>
            <td>:</td>
            <td class="bold">Rp {{ number_format($report['saldoAwal'], 0, ',', '.') }}</td>
        </tr>
    </table>

    <table class="border-table">
        <thead>
            <tr>
                <th width="12%">Tanggal</th>
                <th width="15%">No Bukti</th>
                <th>Uraian</th>
                <th width="13%">Realisasi</th>
                <th width="13%">Jumlah</th>
                <th width="13%">Sisa Anggaran</th>
            </tr>
        </thead>
        <tbody>
            @php 
                $grandTotalRealisasi = 0;
            @endphp
            
            @forelse($report['robData'] as $kode => $data)
                {{-- Group Header --}}
                <tr class="bg-gray bold">
                    <td colspan="6" class="text-left">
                        {{ $kode }} - {{ $data['nama_rekening'] }}
                    </td>
                </tr>

                @foreach($data['transaksi'] as $item)
                    <tr>
                        <td class="text-center">{{ $item['tanggal'] }}</td>
                        <td>{{ $item['no_bukti'] }}</td>
                        <td>{{ $item['uraian'] }}</td>
                        <td class="text-right">Rp {{ number_format($item['realisasi'], 0, ',', '.') }}</td>
                        <td class="text-right">Rp {{ number_format($item['jumlah'], 0, ',', '.') }}</td>
                        <td class="text-right">Rp {{ number_format($item['sisa_anggaran'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
                
                @php 
                    $grandTotalRealisasi += $data['total_realisasi'];
                @endphp
            @empty
                <tr>
                    <td colspan="6" class="text-center">Tidak ada data transaksi untuk bulan ini.</td>
                </tr>
            @endforelse

            {{-- Footer Total --}}
            <tr class="bold bg-gray">
                <td colspan="3" class="text-center">Jumlah</td>
                <td class="text-right">Rp {{ number_format($grandTotalRealisasi, 0, ',', '.') }}</td>
                <td class="text-right">Rp {{ number_format($grandTotalRealisasi, 0, ',', '.') }}</td>
                <td class="text-right">Rp {{ number_format($report['sisaAnggaran'], 0, ',', '.') }}</td>
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
                    <span class="bold uppercase">{{ $report['penganggaran']->kepala_sekolah ?? '.........................' }}</span><br>
                    NIP. {{ $report['penganggaran']->nip_kepala_sekolah ?? '.........................' }}
                </td>
                <td width="50%">
                    {{ $report['sekolah']->kecamatan ?? '................' }}, {{ $report['tanggal_penutupan'] }}<br>
                    Bendahara
                    <div class="signature-space"></div>
                    <span class="bold uppercase">{{ $report['penganggaran']->bendahara ?? '.........................' }}</span><br>
                    NIP. {{ $report['penganggaran']->nip_bendahara ?? '.........................' }}
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
