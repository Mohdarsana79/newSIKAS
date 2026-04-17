<!DOCTYPE html>
<html lang="id">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cetak RKAS Rincian</title>
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
                margin-bottom: 10px;
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

            .bg-orange {
                background-color: #ffd8a8;
            }

            .bg-green {
                background-color: #b2f2bb;
            }

            .strict-border {
                border-collapse: collapse;
            }
            .strict-border,
            .strict-border th,
            .strict-border td {
                border: 1px solid #000;
            }
            .accounting {
                mso-number-format: "\#\,\#\#0";
                text-align: right;
                white-space: nowrap;
            }
            .text-string {
                mso-number-format: "\@";
            }
            .signature-space {
                height: 80px;
            }
        </style>
    </head>

    <body>
        <div class="header">
            <h3 class="uppercase font-bold">KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS) RINCIAN</h3>
            <h4 class="uppercase font-bold">TAHUN ANGGARAN : {{ $anggaran['tahun_anggaran'] }}
                @if(isset($tahap) && $tahap !== 'tahunan')
                    - TAHAP {{ $tahap }}
                @endif
            </h4>
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

        <div>
            <div class="font-bold uppercase" style="margin-bottom: 5px;">A. RINCIAN BELANJA</div>
            <table class="strict-border">
                <thead>
                    <tr>
                        <th class="text-center" style="width: 5%;">No.</th>
                        <th class="text-center" style="width: 80%;">Uraian Rekening</th>
                        <th class="text-center" style="width: 15%;">Jumlah Total</th>
                    </tr>
                </thead>
                <tbody>
                    @php $no = 1; @endphp
                    @foreach ($rincianData as $index => $group)
                        <tr class="bg-orange">
                            <td class="text-center font-bold" style="text-align: center; vertical-align: middle;">{{ $no++ }}</td>
                            <td class="font-bold">{{ $group['sub_program'] ?? 'Lainnya' }}</td>
                            @if ($is_excel ?? false)
                                <td class="accounting font-bold">{{ number_format($group['total'], 0, '.', ',') }}</td>
                            @else
                                <td class="text-right font-bold">{{ number_format($group['total'], 0, ',', '.') }}</td>
                            @endif
                        </tr>
                        @foreach ($group['items'] ?? [] as $item)
                        <tr>
                            <td class="text-center"></td>
                            <td>{{ $item['uraian'] ?? '-' }}</td>
                            @if ($is_excel ?? false)
                                <td class="accounting">{{ number_format($item['jumlah'], 0, '.', ',') }}</td>
                            @else
                                <td class="text-right">{{ number_format($item['jumlah'], 0, ',', '.') }}</td>
                            @endif
                        </tr>
                        @endforeach
                    @endforeach

                    <!-- Grand Total -->
                    <tr class="bg-grey font-bold" style="border-top: 2px solid black;">
                        @php
                            $totalKeseluruhan = collect($rincianData)->sum('total');
                        @endphp
                        <td colspan="2" class="text-center uppercase">Jumlah Keseluruhan Rincian</td>
                        @if ($is_excel ?? false)
                            <td class="accounting">{{ number_format($totalKeseluruhan, 0, '.', ',') }}</td>
                        @else
                            <td class="text-right">Rp. {{ number_format($totalKeseluruhan, 0, ',', '.') }}</td>
                        @endif
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Signatures -->
        <table class="no-border_table" style="width: 100%; margin-top: 30px; page-break-inside: avoid;">
            <tr>
                <td class="text-center" style="width: 50%; vertical-align: top;">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah,</p>
                    <div class="signature-space"></div>
                    <p class="font-bold" style="text-decoration: underline;">
                        {{ $anggaran['kepala_sekolah'] ?? '....................' }}</p>
                    <p>NIP. {{ $anggaran['nip_kepala_sekolah'] ?? '-' }}</p>
                </td>
                <td class="text-center" style="width: 50%; vertical-align: top;">
                    <p>Kec. {{ $anggaran['sekolah']['kecamatan'] ?? '...' }},
                        {{ isset($anggaran['tanggal_cetak']) ? \Carbon\Carbon::parse($anggaran['tanggal_cetak'])->locale('id')->translatedFormat('d F Y') : '....................' }}
                    </p>
                    <p>Bendahara,</p>
                    <div class="signature-space"></div>
                    <p class="font-bold" style="text-decoration: underline;">
                        {{ $anggaran['bendahara'] ?? '....................' }}</p>
                    <p>NIP. {{ $anggaran['nip_bendahara'] ?? '-' }}</p>
                </td>
            </tr>
        </table>

    </body>

</html>
