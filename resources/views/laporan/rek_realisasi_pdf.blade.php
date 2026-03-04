<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Rekapitulasi Realisasi LK 2</title>
    <style>
        @page {
            size: Legal landscape;
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
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
            font-size: 10pt;
        }
        .meta-table td {
            vertical-align: top;
            padding: 2px 0;
        }
        .main-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            margin-bottom: 20px;
        }
        .main-table th, .main-table td {
            border: 1px solid black;
            padding: 4px;
            vertical-align: middle;
        }
        .main-table th {
            text-align: center;
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        .signature-section {
            width: 100%;
            margin-top: 30px;
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
    <div class="header">
        <span style="font-size: 1.2em;">{{ $data['sekolah']['nama_unit'] ?? 'DINAS PENDIDIKAN DAN KEBUDAYAAN KABUPATEN TOLITOLI' }}</span><br>
        <span style="font-size: 1.1em;">REKAPITULASI REALISASI LK 2 {{ isset($fase) && strtoupper($fase) != 'TAHUNAN' ? '- ' . strtoupper($fase) : '' }} - TAHUN {{ $tahun }}</span>
    </div>

    <table class="meta-table">
        <tr>
            <td width="150">Wilayah</td>
            <td width="10">:</td>
            <td>{{ $data['sekolah']['kecamatan'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>Status Sekolah</td>
            <td>:</td>
            <td>Swasta</td>
        </tr>
        <tr>
            <td>Bentuk Pendidikan</td>
            <td>:</td>
            <td>SMP</td>
        </tr>
        <tr>
            <td>Sumber Dana</td>
            <td>:</td>
            <td>BOS Reguler</td>
        </tr>
    </table>

    <table class="main-table">
        <thead>
            <tr>
                <th rowspan="3" width="30">No</th>
                <th rowspan="3" width="80">NPSN</th>
                <th rowspan="3">Nama Unit</th>
                <th rowspan="3" width="100">Kecamatan</th>
                <th colspan="5">REALISASI BELANJA</th>
            </tr>
            <tr>
                <th colspan="2">OPERASI</th>
                <th colspan="2">MODAL</th>
                <th rowspan="2" width="100">Jumlah</th>
            </tr>
            <tr>
                <th width="100">PAKAI HABIS</th>
                <th width="100">BARANG & JASA</th>
                <th width="100">PERALATAN & MESIN</th>
                <th width="100">ASET TETAP LAINNYA</th>
            </tr>
            <tr style="background-color: #e0e0e0; font-size: 8pt;">
                <th class="text-center">1</th>
                <th class="text-center">2</th>
                <th class="text-center">3</th>
                <th class="text-center">4</th>
                <th class="text-center">6</th>
                <th class="text-center">7</th>
                <th class="text-center">8</th>
                <th class="text-center">9</th>
                <th class="text-center">10</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-center">1</td>
                <td class="text-center">{{ $data['sekolah']['npsn'] }}</td>
                <td>{{ $data['sekolah']['nama_unit'] }}</td>
                <td>{{ $data['sekolah']['kecamatan'] }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['pakai_habis'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['barang_jasa'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['modal_peralatan'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['modal_aset_lain'], 0, ',', '.') }}</td>
                <td class="text-right bold">{{ number_format($data['realisasi']['total'], 0, ',', '.') }}</td>
            </tr>
            <!-- Total Row -->
            <tr style="background-color: #f5f5f5; font-weight: bold;">
                <td colspan="4" class="text-center">JUMLAH</td>
                <td class="text-right">{{ number_format($data['realisasi']['pakai_habis'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['barang_jasa'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['modal_peralatan'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['modal_aset_lain'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($data['realisasi']['total'], 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td width="40%" class="text-center" style="vertical-align: top;">
                    Menyetujui,<br>
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <span class="bold uppercase" style="border-bottom: 1px solid black; padding-bottom: 2px; display: inline-block;">
                        {{ $data['penanggung_jawab']['kepala_sekolah'] ?? '.........................' }}
                    </span><br>
                    <div style="margin-top: 5px;">NIP. {{ $data['penanggung_jawab']['nip_kepala_sekolah'] ?? '.........................' }}</div>
                </td>
                <td width="20%"></td>
                <td width="40%" class="text-center" style="vertical-align: top;">
                    {{ $data['sekolah']['kecamatan'] ?? '................' }}, {{ \Carbon\Carbon::now()->isoFormat('D MMMM Y') }}<br>
                    Bendahara
                    <div class="signature-space"></div>
                    <span class="bold uppercase" style="border-bottom: 1px solid black; padding-bottom: 2px; display: inline-block;">
                        {{ $data['penanggung_jawab']['bendahara'] ?? '.........................' }}
                    </span><br>
                    <div style="margin-top: 5px;">NIP. {{ $data['penanggung_jawab']['nip_bendahara'] ?? '.........................' }}</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
