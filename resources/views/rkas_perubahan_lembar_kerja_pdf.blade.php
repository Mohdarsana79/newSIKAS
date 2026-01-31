<!DOCTYPE html>
<html lang="id">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cetak Lembar Kerja RKAS Perubahan</title>
        <style>
            @page {
                size: {{ $paper_size ?? 'A4' }} {{ $orientation ?? 'portrait' }};
                margin: 1cm;
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
                table-layout: fixed;
            }

            th,
            td {
                border: 1px solid #000;
                padding: 4px 6px;
                vertical-align: top;
                word-wrap: break-word;
            }

            thead th {
                background-color: #f0f0f0;
                /* Optional: light grey header like typical forms */
            }

            .no-border-table td {
                border: none;
                padding: 2px 4px;
            }

            .header-title {
                text-align: center;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 20px;
            }

            .header-title h2 {
                margin: 0;
                font-size: 1.2em;
            }

            .header-title h3 {
                margin: 0;
                font-size: 1em;
            }

            .section-title {
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: 5px;
            }

            .signature-section {
                margin-top: 30px;
                text-align: right;
                page-break-inside: avoid;
            }

            .signature-box {
                display: inline-block;
                text-align: center;
                width: 250px;
            }

            .total-row td {
                font-weight: bold;
            }
        </style>
    </head>

    <body>
        <div class="header-title">
            <h2>LEMBAR KERTAS KERJA</h2>
            <h3>TAHUN ANGGARAN {{ $anggaran['tahun_anggaran'] }}</h3>
        </div>

        <table class="no-border-table" style="width: 100%; margin-bottom: 10px;">
            <tr>
                <td style="width: 150px;">Urusan Pemerintahan</td>
                <td style="width: 10px;">:</td>
                <td>1.01 - PENDIDIKAN</td>
            </tr>
            <tr>
                <td>Organisasi</td>
                <td>:</td>
                <td>{{ $anggaran['sekolah']['nama_sekolah'] }}</td>
            </tr>
        </table>

        <!-- Indikator Section -->
        <div class="section-title">Indikator & Tolok Ukur Kinerja Belanja Langsung</div>
        <table>
            <thead>
                <tr>
                    <th class="text-left" style="width: 25%;">Indikator</th>
                    <th class="text-left" style="width: 50%;">Tolok Ukur Kinerja</th>
                    <th class="text-left" style="width: 25%;">Target Kinerja</th>
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
                    <td class="text-right">{{ $anggaran['pagu_total'] }}</td>
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

        <!-- Rincian Section -->
        <div class="section-title">Rincian Anggaran Belanja Langsung Menurut Program dan Per Kegiatan Unit Kerja</div>
        <table>
            <thead>
                <tr>
                    <th rowspan="2" class="text-left" style="width: 15%;">Kode Rekening</th>
                    <th rowspan="2" class="text-left" style="width: 35%;">Uraian</th>
                    <th colspan="3" class="text-center" style="width: 35%;">Rincian Perhitungan</th>
                    <th rowspan="2" class="text-right" style="width: 15%;">Jumlah (Rp)</th>
                </tr>
                <tr>
                    <th class="text-center" style="width: 10%;">Volume</th>
                    <th class="text-center" style="width: 12%;">Satuan</th>
                    <th class="text-right" style="width: 13%;">Harga Satuan</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($lembarData as $item)
                    @if ($item['type'] === 'header')
                        <!-- Header Rows (Program, Kegiatan, etc.) -->
                        <tr>
                            @if (empty($item['kode_rekening']))
                                <td class="font-bold">{{ $item['sort_key'] ?? '' }}</td>
                            @else
                                <td class="font-bold">{{ $item['kode_rekening'] }}</td>
                            @endif
                            <td class="font-bold" colspan="5">{{ $item['uraian'] }}</td>
                        </tr>
                    @else
                        <!-- Data Items -->
                        <tr>
                            <td>{{ $item['kode_rekening'] }}</td>
                            <td>{{ $item['uraian'] }}</td>
                            <td class="text-center">{{ $item['volume'] ?? '' }}</td>
                            <td class="text-center">{{ $item['satuan'] ?? '' }}</td>
                            <td class="text-right">
                                {{ isset($item['harga_satuan']) ? number_format($item['harga_satuan'], 0, ',', '.') : '' }}
                            </td>
                            <td class="text-right">{{ number_format($item['jumlah'], 0, ',', '.') }}</td>
                        </tr>
                    @endif
                @endforeach
                <!-- Footer Total -->
                <tr class="total-row">
                    <td colspan="5" class="text-right">Jumlah</td>
                    <td class="text-right">{{ $anggaran['pagu_total'] }}</td>
                    <!-- Using string formatted total from controller if available, or calculate -->
                </tr>
            </tbody>
        </table>

        <!-- Signature -->
        <div class="signature-section">
            <div class="signature-box">
                <p>{{ $anggaran['sekolah']['kecamatan'] }},
                    {{ isset($anggaran['tanggal_perubahan']) ? \Carbon\Carbon::parse($anggaran['tanggal_perubahan'])->locale('id')->translatedFormat('d F Y') : '8 Desember 2025' }}
                </p>
                <p>Mengetahui,</p>
                <p>Kepala Sekolah</p>
                <div style="height: 60px;"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['kepala_sekolah'] ?? 'Dra. MASITAH ABDULLAH' }}</p>
                <p>NIP. {{ $anggaran['nip_kepala_sekolah'] ?? '196909172007012017' }}</p>
            </div>
        </div>
    </body>

</html>
