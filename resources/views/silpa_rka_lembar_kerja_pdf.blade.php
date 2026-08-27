<!DOCTYPE html>
<html lang="id">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cetak Lembar Kerja 221</title>
        <style>
            @page {
                size: {{ $paper_size ?? 'A4' }} {{ $orientation ?? 'portrait' }};
                margin: 1.5cm;
                margin-top: 1cm;
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
                padding: 2px 4px;
            }

            .header {
                text-align: center;
                margin-bottom: 25px;
            }

            .header h3,
            .header h4 {
                margin: 5px 0;
                font-weight: bold;
            }

            .section-title {
                font-weight: bold;
                margin-bottom: 5px;
                margin-top: 10px;
            }

            .bg-grey {
                background-color: #f2f2f2;
            }

            .signature-section {
                width: 100%;
                margin-top: 20px;
                page-break-inside: avoid;
                text-align: right;
            }

            .signature-box {
                display: inline-block;
                width: 40%;
                text-align: center;
                vertical-align: top;
            }

            .signature-space {
                height: 70px;
            }
        </style>
    </head>

    <body>
        <div class="header">
            <h3 class="uppercase">LEMBAR KERTAS KERJA</h3>
            <h4 class="uppercase">TAHUN ANGGARAN {{ $anggaran['tahun_anggaran'] }}</h4>
        </div>

        <!-- Info Block -->
        <table class="no-border_table" style="width: auto; margin-bottom: 15px;">
            <tr>
                <td style="width: 160px;">Urusan Pemerintahan</td>
                <td style="width: 10px;">:</td>
                <td>1.01 - PENDIDIKAN</td>
            </tr>
            <tr>
                <td>Organisasi</td>
                <td>:</td>
                <td class="uppercase">{{ $anggaran['sekolah']['nama_sekolah'] ?? '-' }}</td>
            </tr>
        </table>

        <!-- Indikator Section -->
        <div class="section-title">Indikator & Tolok Ukur Kinerja Belanja Langsung</div>
        <table style="margin-bottom: 20px;">
            <thead>
                <tr>
                    <th class="text-left" style="width: 30%;">Indikator</th>
                    <th class="text-left" style="width: 40%;">Tolok Ukur Kinerja</th>
                    <th class="text-left" style="width: 30%;">Target Kinerja</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Capaian Program</td>
                    <td></td>
                    <td class="text-right">-</td>
                </tr>
                <tr>
                    <td>Masukan</td>
                    <td>Dana</td>
                    <td class="text-right">{{ number_format((float) ($anggaran['pagu_anggaran'] ?? 0), 0, ',', '.') }}
                    </td>
                </tr>
                <tr>
                    <td>Keluaran</td>
                    <td></td>
                    <td class="text-right">-</td>
                </tr>
                <tr>
                    <td>Hasil</td>
                    <td></td>
                    <td class="text-right">-</td>
                </tr>
                <tr>
                    <td>Sasaran Keg</td>
                    <td></td>
                    <td class="text-right">-</td>
                </tr>
            </tbody>
        </table>

        <!-- Rincian Anggaran Section -->
        <div class="section-title">Rincian Anggaran Belanja Langsung Menurut Program dan Per Kegiatan Unit Kerja</div>
        <table>
            <thead>
                <tr>
                    <th rowspan="2" class="text-center" style="width: 120px; vertical-align: middle;">Kode Rekening
                    </th>
                    <th rowspan="2" class="text-center" style="vertical-align: middle;">Uraian</th>
                    <th colspan="3" class="text-center">Rincian Perhitungan</th>
                    <th rowspan="2" class="text-center" style="width: 100px; vertical-align: middle;">Jumlah (Rp)
                    </th>
                </tr>
                <tr>
                    <th class="text-center" style="width: 60px;">Volume</th>
                    <th class="text-center" style="width: 80px;">Satuan</th>
                    <th class="text-center" style="width: 100px;">Harga Satuan</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($lembarData as $item)
                    @if ($item['type'] === 'header')
                        <tr class="bg-grey font-bold">
                            <td>{{ $item['kode_rekening'] }}</td>
                            <td colspan="4">{{ $item['uraian'] }}</td>
                            <td class="text-right">{{ number_format((float) $item['jumlah'], 0, ',', '.') }}</td>
                        </tr>
                    @else
                        <tr>
                            <td class="text-center">{{ $item['kode_rekening'] }}</td>
                            <td>{{ $item['uraian'] }}</td>
                            <td class="text-center">{{ $item['volume'] }}</td>
                            <td class="text-center">{{ $item['satuan'] }}</td>
                            <td class="text-right">
                                {{ isset($item['harga_satuan']) ? number_format((float) $item['harga_satuan'], 0, ',', '.') : '' }}
                            </td>
                            <td class="text-right">{{ number_format((float) $item['jumlah'], 0, ',', '.') }}</td>
                        </tr>
                    @endif
                @endforeach

                <!-- Grand Total Row -->
                <tr class="bg-grey font-bold">
                    <td colspan="5" class="text-right">Jumlah</td>
                    <td class="text-right">
                        {{ number_format((float) ($anggaran['pagu_anggaran'] ?? 0), 0, ',', '.') }}
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Signature -->
        <div class="signature-section">
            <div class="signature-box">
                <!-- Dynamic Date: Tolitoli, [Date] -->
                <p>Tolitoli,
                    {{ isset($anggaran['tanggal_cetak']) ? \Carbon\Carbon::parse($anggaran['tanggal_cetak'])->locale('id')->translatedFormat('d F Y') : now()->locale('id')->translatedFormat('d F Y') }}
                </p>
                <p>Kepala Sekolah,</p>
                <div class="signature-space"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['kepala_sekolah'] ?? '....................' }}
                </p>
                <p>NIP. {{ $anggaran['nip_kepala_sekolah'] ?? '-' }}</p>
            </div>
        </div>

    </body>

</html>
