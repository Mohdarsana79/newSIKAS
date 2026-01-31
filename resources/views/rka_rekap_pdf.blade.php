<!DOCTYPE html>
<html lang="id">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cetak RKAS Rekapitulasi</title>
        <style>
            @page {
                size: {{ $paper_size ?? 'A4' }} {{ $orientation ?? 'portrait' }};
                margin: 1.5cm;
            }

            body {
                font-family: Arial, sans-serif;
                font-size: {{ $font_size ?? '11pt' }};
                line-height: 1.3;
            }

            .text-center {
                text-align: center;
            }

            .text-right {
                text-align: right;
            }

            .text-left {
                text-align: left;
            }

            .font-bold {
                font-weight: bold;
            }

            .uppercase {
                text-transform: uppercase;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }

            th,
            td {
                border: 1px solid #000;
                padding: 4px 6px;
                vertical-align: top;
            }

            thead th {
                background-color: #f0f0f0;
            }

            .no-border_table,
            .no-border_table td {
                border: none;
            }

            .header {
                text-align: center;
                margin-bottom: 20px;
            }

            .header h2,
            .header h3 {
                margin: 5px 0;
            }

            .bg-grey {
                background-color: #f2f2f2;
            }

            .section-title {
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 10px;
                margin-top: 15px;
            }

            .signature-section {
                display: table;
                width: 100%;
                margin-top: 30px;
                page-break-inside: avoid;
            }

            .signature-box {
                display: table-cell;
                width: 33%;
                text-align: center;
                vertical-align: top;
            }

            .signature-space {
                height: 80px;
            }
        </style>
    </head>

    <body>
        <div class="header">
            <h3 class="uppercase font-bold">REKAPITULASI RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS)</h3>
            <h4 class="uppercase font-bold">TAHUN ANGGARAN : {{ $anggaran['tahun_anggaran'] }}</h4>
        </div>

        <!-- School Profile -->
        <table class="no-border_table" style="width: auto; margin-bottom: 15px;">
            <tr>
                <td style="width: 150px;">NPSN</td>
                <td style="width: 10px;">:</td>
                <td>{{ $anggaran['sekolah']['npsn'] ?? '-' }}</td>
            </tr>
            <tr>
                <td>Nama Sekolah</td>
                <td>:</td>
                <td>{{ $anggaran['sekolah']['nama_sekolah'] ?? '-' }}</td>
            </tr>
            <tr>
                <td>Alamat</td>
                <td>:</td>
                <td>{{ $anggaran['sekolah']['alamat'] ?? '-' }}</td>
            </tr>
            <tr>
                <td>Kabupaten/Kota</td>
                <td>:</td>
                <td>{{ $anggaran['sekolah']['kabupaten_kota'] ?? '-' }}</td>
            </tr>
            <tr>
                <td>Provinsi</td>
                <td>:</td>
                <td>{{ $anggaran['sekolah']['provinsi'] ?? '-' }}</td>
            </tr>
        </table>

        <!-- B. REKAPITULASI ANGGARAN -->
        <div class="section-title">B. REKAPITULASI ANGGARAN</div>
        <table>
            <thead>
                <tr>
                    <th class="text-left" style="width: 150px;">Kode</th>
                    <th class="text-left">Uraian</th>
                    <th class="text-right" style="width: 150px;">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($rekapData as $item)
                    <tr class="{{ strlen($item['kode_rekening']) <= 1 ? 'bg-grey font-bold' : '' }}">
                        <td>{{ $item['kode_rekening'] }}</td>
                        <td>{{ $item['uraian'] }}</td>
                        <td class="text-right">{{ number_format((float) $item['jumlah'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
                <!-- Logic to sum specific rows matching '5' logic from controller if needed, but rekapData supposedly contains totals -->
                <tr class="bg-grey font-bold">
                    <td colspan="2" class="text-center">JUMLAH BELANJA</td>
                    <td class="text-right">
                        {{ number_format(collect($rekapData)->firstWhere('kode_rekening', '5')['jumlah'] ?? 0, 0, ',', '.') }}
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- C. RENCANA PELAKSANAAN ANGGARAN PER TAHAP -->
        <div class="section-title">C. RENCANA PELAKSANAAN ANGGARAN PER TAHAP</div>
        <table>
            <thead>
                <tr>
                    <th class="text-center" style="width: 50px;">No</th>
                    <th class="text-left">Uraian</th>
                    <th class="text-right">Tahap 1</th>
                    <th class="text-right">Tahap 2</th>
                    <th class="text-right">Jumlah Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($perTahapData as $row)
                    <tr>
                        <td class="text-center">{{ $row['no'] }}</td>
                        <td>{{ $row['uraian'] }}</td>
                        <td class="text-right">{{ number_format($row['tahap1'], 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($row['tahap2'], 0, ',', '.') }}</td>
                        <td class="text-right font-bold">{{ number_format($row['total'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-box">
                <p>Mengetahui,</p>
                <p>Komite Sekolah,</p>
                <div class="signature-space"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['komite'] ?? '....................' }}</p>
            </div>

            <div class="signature-box">
                <p>Mengetahui,</p>
                <p>Kepala Sekolah,</p>
                <div class="signature-space"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['kepala_sekolah'] ?? '....................' }}</p>
                <p>NIP. {{ $anggaran['nip_kepala_sekolah'] ?? '-' }}</p>
            </div>

            <div class="signature-box">
                <p>Kec. {{ $anggaran['sekolah']['kecamatan'] ?? '...' }},
                    {{ isset($anggaran['tanggal_cetak']) ? \Carbon\Carbon::parse($anggaran['tanggal_cetak'])->locale('id')->translatedFormat('d F Y') : '....................' }}
                </p>
                <p>Bendahara,</p>
                <div class="signature-space"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['bendahara'] ?? '....................' }}</p>
                <p>NIP. {{ $anggaran['nip_bendahara'] ?? '-' }}</p>
            </div>
        </div>
    </body>

</html>
