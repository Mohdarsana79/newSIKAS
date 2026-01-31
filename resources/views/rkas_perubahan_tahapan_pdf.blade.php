<!DOCTYPE html>
<html lang="id">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cetak RKAS Perubahan Tahapan</title>
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

            .bg-teal {
                background-color: #96f2d7;
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
            <h3 class="uppercase font-bold">KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS PERUBAHAN) PER TAHAP
            </h3>
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
            <tr>
                <td>Tahap</td>
                <td>:</td>
                <td>I dan II</td>
            </tr>
        </table>

        <!-- A. Penerimaan -->
        <div style="margin-bottom: 20px;">
            <div class="font-bold uppercase" style="margin-bottom: 5px;">A. PENERIMAAN</div>
            <div style="margin-bottom: 5px; font-style: italic;">Sumber Dana :</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 120px;" class="text-center">No Kode</th>
                        <th class="text-center">Penerimaan</th>
                        <th style="width: 150px;" class="text-center">Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>4.3.1.01.</td>
                        <td>BOS Reguler</td>
                        <td class="text-right">Rp. {{ number_format($anggaran['pagu_anggaran'], 0, ',', '.') }}</td>
                    </tr>
                    <tr class="bg-grey font-bold">
                        <td colspan="2" class="text-center">Total Penerimaan</td>
                        <td class="text-right">Rp. {{ number_format($anggaran['pagu_anggaran'], 0, ',', '.') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- B. Belanja -->
        <div>
            <div class="font-bold uppercase" style="margin-bottom: 5px;">B. BELANJA</div>
            <table>
                <thead>
                    <tr>
                        <th rowspan="2" class="text-center" style="width: 30px;">No.</th>
                        <th rowspan="2" class="text-center" style="width: 80px;">Kode Rekening</th>
                        <th rowspan="2" class="text-center" style="width: 60px;">Kode Prog</th>
                        <th rowspan="2" class="text-center">Uraian</th>
                        <th colspan="4" class="text-center">Rincian Perhitungan Sebelum Perubahan</th>
                        <th colspan="4" class="text-center">Rincian Perhitungan Sesudah Perubahan</th>
                        <th rowspan="2" class="text-center" style="width: 60px;">Bertambah</th>
                        <th rowspan="2" class="text-center" style="width: 60px;">Berkurang</th>
                        <th colspan="2" class="text-center">Tahap</th>
                    </tr>
                    <tr>
                        <th class="text-center" style="width: 30px;">Vol</th>
                        <th class="text-center" style="width: 40px;">Sat</th>
                        <th class="text-center" style="width: 60px;">Tarif</th>
                        <th class="text-center" style="width: 70px;">Jumlah</th>

                        <th class="text-center" style="width: 30px;">Vol</th>
                        <th class="text-center" style="width: 40px;">Sat</th>
                        <th class="text-center" style="width: 60px;">Tarif</th>
                        <th class="text-center" style="width: 70px;">Jumlah</th>

                        <th class="text-center" style="width: 60px;">1</th>
                        <th class="text-center" style="width: 60px;">2</th>
                    </tr>
                </thead>
                <tbody>
                    @php $no = 1; @endphp
                    @foreach ($tahapanData as $programKode => $program)
                        <!-- Program Row -->
                        <tr class="bg-orange">
                            <td class="text-center font-bold">{{ $no++ }}</td>
                            <td></td>
                            <td class="text-center font-bold">{{ $programKode }}</td>
                            <td class="font-bold">{{ $program['uraian'] }}</td>
                            <!-- Sebelum -->
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-right font-bold">
                                {{ number_format($program['jumlah_murni'] ?? 0, 0, ',', '.') }}</td>
                            <!-- Sesudah -->
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-right font-bold">{{ number_format($program['jumlah'], 0, ',', '.') }}</td>
                            <!-- Diff -->
                            <td class="text-right font-bold">
                                {{ $program['jumlah'] > ($program['jumlah_murni'] ?? 0) ? number_format($program['jumlah'] - ($program['jumlah_murni'] ?? 0), 0, ',', '.') : '-' }}
                            </td>
                            <td class="text-right font-bold">
                                {{ ($program['jumlah_murni'] ?? 0) > $program['jumlah'] ? number_format(($program['jumlah_murni'] ?? 0) - $program['jumlah'], 0, ',', '.') : '-' }}
                            </td>

                            <td class="text-right font-bold">{{ number_format($program['tahap1'], 0, ',', '.') }}</td>
                            <td class="text-right font-bold">{{ number_format($program['tahap2'], 0, ',', '.') }}</td>
                        </tr>

                        <!-- SubPrograms (Kegiatan) -->
                        @if (!empty($program['sub_programs']))
                            @foreach ($program['sub_programs'] as $subProgramKode => $subProgram)
                                <tr class="bg-green">
                                    <td class="text-center font-bold">{{ $no++ }}</td>
                                    <td></td>
                                    <td class="text-center font-bold">{{ $subProgramKode }}</td>
                                    <td class="font-bold">{{ $subProgram['uraian'] }}</td>
                                    <!-- Sebelum -->
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-right font-bold">
                                        {{ number_format($subProgram['jumlah_murni'] ?? 0, 0, ',', '.') }}</td>
                                    <!-- Sesudah -->
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-right font-bold">
                                        {{ number_format($subProgram['jumlah'], 0, ',', '.') }}</td>
                                    <!-- Diff -->
                                    <td class="text-right font-bold">
                                        {{ $subProgram['jumlah'] > ($subProgram['jumlah_murni'] ?? 0) ? number_format($subProgram['jumlah'] - ($subProgram['jumlah_murni'] ?? 0), 0, ',', '.') : '-' }}
                                    </td>
                                    <td class="text-right font-bold">
                                        {{ ($subProgram['jumlah_murni'] ?? 0) > $subProgram['jumlah'] ? number_format(($subProgram['jumlah_murni'] ?? 0) - $subProgram['jumlah'], 0, ',', '.') : '-' }}
                                    </td>

                                    <td class="text-right font-bold">
                                        {{ number_format($subProgram['tahap1'], 0, ',', '.') }}</td>
                                    <td class="text-right font-bold">
                                        {{ number_format($subProgram['tahap2'], 0, ',', '.') }}</td>
                                </tr>

                                <!-- UraianPrograms (Sub Kegiatan) -->
                                @if (!empty($subProgram['uraian_programs']))
                                    @foreach ($subProgram['uraian_programs'] as $uraianKode => $uraianProgram)
                                        <tr class="bg-teal">
                                            <td class="text-center font-bold">{{ $no++ }}</td>
                                            <td></td>
                                            <td class="text-center font-bold">{{ $uraianKode }}</td>
                                            <td class="font-bold">{{ $uraianProgram['uraian'] }}</td>
                                            <!-- Sebelum -->
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-right font-bold">
                                                {{ number_format($uraianProgram['jumlah_murni'] ?? 0, 0, ',', '.') }}
                                            </td>
                                            <!-- Sesudah -->
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-right font-bold">
                                                {{ number_format($uraianProgram['jumlah'], 0, ',', '.') }}</td>
                                            <!-- Diff -->
                                            <td class="text-right font-bold">
                                                {{ $uraianProgram['jumlah'] > ($uraianProgram['jumlah_murni'] ?? 0) ? number_format($uraianProgram['jumlah'] - ($uraianProgram['jumlah_murni'] ?? 0), 0, ',', '.') : '-' }}
                                            </td>
                                            <td class="text-right font-bold">
                                                {{ ($uraianProgram['jumlah_murni'] ?? 0) > $uraianProgram['jumlah'] ? number_format(($uraianProgram['jumlah_murni'] ?? 0) - $uraianProgram['jumlah'], 0, ',', '.') : '-' }}
                                            </td>

                                            <td class="text-right font-bold">
                                                {{ number_format($uraianProgram['tahap1'], 0, ',', '.') }}</td>
                                            <td class="text-right font-bold">
                                                {{ number_format($uraianProgram['tahap2'], 0, ',', '.') }}</td>
                                        </tr>

                                        <!-- Items -->
                                        @if (!empty($uraianProgram['items']))
                                            @foreach ($uraianProgram['items'] as $item)
                                                <tr>
                                                    <td class="text-center">{{ $no++ }}</td>
                                                    <td class="text-center">{{ $item['kode_rekening'] }}</td>
                                                    <td class="text-center">{{ $item['program_code'] ?? '-' }}</td>
                                                    <td>{{ $item['uraian'] }}</td>

                                                    <!-- Sebelum -->
                                                    <td class="text-center">
                                                        {{ ($item['volume_murni'] ?? 0) > 0 ? $item['volume_murni'] : '-' }}
                                                    </td>
                                                    <td class="text-center">
                                                        {{ ($item['volume_murni'] ?? 0) > 0 ? $item['satuan'] : '-' }}
                                                    </td>
                                                    <td class="text-right">
                                                        {{ ($item['volume_murni'] ?? 0) > 0 ? number_format($item['tarif'], 0, ',', '.') : '-' }}
                                                    </td>
                                                    <td class="text-right">
                                                        {{ ($item['jumlah_murni'] ?? 0) > 0 ? number_format($item['jumlah_murni'] ?? 0, 0, ',', '.') : '-' }}
                                                    </td>

                                                    <!-- Sesudah -->
                                                    <td class="text-center">
                                                        {{ ($item['volume'] ?? 0) > 0 ? $item['volume'] : '-' }}</td>
                                                    <td class="text-center">
                                                        {{ ($item['volume'] ?? 0) > 0 ? $item['satuan'] : '-' }}</td>
                                                    <td class="text-right">
                                                        {{ ($item['volume'] ?? 0) > 0 ? number_format($item['tarif'], 0, ',', '.') : '-' }}
                                                    </td>
                                                    <td class="text-right font-bold">
                                                        {{ ($item['jumlah'] ?? 0) > 0 ? number_format($item['jumlah'], 0, ',', '.') : '-' }}
                                                    </td>

                                                    <!-- Diff -->
                                                    <td class="text-right font-bold">
                                                        {{ $item['jumlah'] > ($item['jumlah_murni'] ?? 0) ? number_format($item['jumlah'] - ($item['jumlah_murni'] ?? 0), 0, ',', '.') : '-' }}
                                                    </td>
                                                    <td class="text-right font-bold">
                                                        {{ ($item['jumlah_murni'] ?? 0) > $item['jumlah'] ? number_format(($item['jumlah_murni'] ?? 0) - $item['jumlah'], 0, ',', '.') : '-' }}
                                                    </td>

                                                    <td class="text-right">
                                                        {{ $item['tahap1'] > 0 ? number_format($item['tahap1'], 0, ',', '.') : '0' }}
                                                    </td>
                                                    <td class="text-right">
                                                        {{ $item['tahap2'] > 0 ? number_format($item['tahap2'], 0, ',', '.') : '0' }}
                                                    </td>
                                                </tr>
                                            @endforeach
                                        @endif
                                    @endforeach
                                @endif
                            @endforeach
                        @endif
                    @endforeach

                    <!-- Grand Total -->
                    <tr class="bg-grey font-bold" style="border-top: 2px solid black;">
                        <td colspan="11" class="text-center uppercase">Jumlah Total</td>
                        <td class="text-right">
                            @php
                                $totalSesudah = 0;
                                $totalBertambah = 0;
                                $totalBerkurang = 0;
                                $totalTahap1 = 0;
                                $totalTahap2 = 0;

                                foreach ($tahapanData as $prog) {
                                    $totalSesudah += $prog['jumlah'];
                                    $totalBertambah += max(0, $prog['jumlah'] - ($prog['jumlah_murni'] ?? 0));
                                    $totalBerkurang += max(0, ($prog['jumlah_murni'] ?? 0) - $prog['jumlah']);
                                    $totalTahap1 += $prog['tahap1'];
                                    $totalTahap2 += $prog['tahap2'];
                                }
                            @endphp
                            {{ number_format($totalSesudah, 0, ',', '.') }}
                        </td>
                        <td class="text-right">{{ number_format($totalBertambah, 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($totalBerkurang, 0, ',', '.') }}</td>

                        <td class="text-right">{{ number_format($totalTahap1, 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($totalTahap2, 0, ',', '.') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

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
                    {{ isset($anggaran['tanggal_perubahan']) ? \Carbon\Carbon::parse($anggaran['tanggal_perubahan'])->locale('id')->translatedFormat('d F Y') : '....................' }}
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
