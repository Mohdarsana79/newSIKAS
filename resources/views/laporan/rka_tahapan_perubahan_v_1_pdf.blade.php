<!DOCTYPE html>
<html lang="id">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cetak RKAS Perubahan Tahapan V.1</title>
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
                table-layout: fixed; /* Ensures column widths are respected and table fits 100% */
                word-wrap: break-word; /* Allows long text to wrap */
            }

            th,
            td {
                border: 1px solid #000;
                padding: 2px 3px; /* Reduced padding for compact layout */
                vertical-align: top;
                font-size: 0.9em; /* Slightly smaller font for table content specifically */
                overflow: hidden; /* Hide overflow */
            }

            thead th {
                background-color: #f0f0f0;
                font-size: 0.8em; /* Even smaller for headers to fit text */
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
            <h3 class="uppercase font-bold">KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS PERUBAHAN) PER TAHAP</h3>
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
                        <th rowspan="3" class="text-center" style="width: 2%;">No.</th>
                        <th rowspan="3" class="text-center" style="width: 6%;">Kode Rekening</th>
                        <th rowspan="3" class="text-center" style="width: 5%;">Kode Kegiatan</th>
                        <th rowspan="3" class="text-center">Uraian</th>
                        
                        <th colspan="5" class="text-center">Rincian Perhitungan Sebelum Perubahan</th>
                        <th rowspan="3" class="text-center" style="width: 6%;">Jumlah</th>

                        <th colspan="5" class="text-center">Rincian Perhitungan Sesudah Perubahan</th>
                        <th rowspan="3" class="text-center" style="width: 6%;">Jumlah</th>

                        <th rowspan="3" class="text-center" style="width: 6%;">Bertambah</th>
                        <th rowspan="3" class="text-center" style="width: 6%;">Berkurang</th>

                        <th colspan="2" rowspan="2" class="text-center">Tahap</th>
                    </tr>
                    <tr>
                        <!-- Sebelum -->
                        <th rowspan="2" class="text-center" style="width: 3%;">Vol</th>
                        <th colspan="2" class="text-center">Tahap</th>
                        <th rowspan="2" class="text-center" style="width: 4%;">Satuan</th>
                        <th rowspan="2" class="text-center" style="width: 5%;">Tarif Harga</th>

                        <!-- Sesudah -->
                        <th rowspan="2" class="text-center" style="width: 3%;">Vol</th>
                        <th colspan="2" class="text-center">Tahap</th>
                        <th rowspan="2" class="text-center" style="width: 4%;">Satuan</th>
                        <th rowspan="2" class="text-center" style="width: 5%;">Tarif Harga</th>
                    </tr>
                    <tr>
                        <!-- Tahap Sebelum -->
                        <th class="text-center" style="width: 3%;">T1</th>
                        <th class="text-center" style="width: 3%;">T2</th>

                        <!-- Tahap Sesudah -->
                        <th class="text-center" style="width: 3%;">T1</th>
                        <th class="text-center" style="width: 3%;">T2</th>

                        <!-- Tahap Footer -->
                        <th class="text-center" style="width: 5%;">T1</th>
                        <th class="text-center" style="width: 5%;">T2</th>
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
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-right font-bold">{{ number_format($program['jumlah_murni'] ?? 0, 0, ',', '.') }}</td>

                            <!-- Sesudah -->
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-right font-bold">{{ number_format($program['jumlah'], 0, ',', '.') }}</td>

                            <!-- Selisih -->
                            <td class="text-right font-bold">{{ number_format(max(0, $program['jumlah'] - ($program['jumlah_murni'] ?? 0)), 0, ',', '.') }}</td>
                            <td class="text-right font-bold">{{ number_format(max(0, ($program['jumlah_murni'] ?? 0) - $program['jumlah']), 0, ',', '.') }}</td>

                            <!-- Tahap -->
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
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-right font-bold">{{ number_format($subProgram['jumlah_murni'] ?? 0, 0, ',', '.') }}</td>

                                    <!-- Sesudah -->
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-center">-</td>
                                    <td class="text-right font-bold">{{ number_format($subProgram['jumlah'], 0, ',', '.') }}</td>

                                    <!-- Selisih -->
                                    <td class="text-right font-bold">{{ number_format(max(0, $subProgram['jumlah'] - ($subProgram['jumlah_murni'] ?? 0)), 0, ',', '.') }}</td>
                                    <td class="text-right font-bold">{{ number_format(max(0, ($subProgram['jumlah_murni'] ?? 0) - $subProgram['jumlah']), 0, ',', '.') }}</td>

                                    <!-- Tahap -->
                                    <td class="text-right font-bold">{{ number_format($subProgram['tahap1'], 0, ',', '.') }}</td>
                                    <td class="text-right font-bold">{{ number_format($subProgram['tahap2'], 0, ',', '.') }}</td>
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
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-right font-bold">{{ number_format($uraianProgram['jumlah_murni'] ?? 0, 0, ',', '.') }}</td>

                                            <!-- Sesudah -->
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-center">-</td>
                                            <td class="text-right font-bold">{{ number_format($uraianProgram['jumlah'], 0, ',', '.') }}</td>

                                            <!-- Selisih -->
                                            <td class="text-right font-bold">{{ number_format(max(0, $uraianProgram['jumlah'] - ($uraianProgram['jumlah_murni'] ?? 0)), 0, ',', '.') }}</td>
                                            <td class="text-right font-bold">{{ number_format(max(0, ($uraianProgram['jumlah_murni'] ?? 0) - $uraianProgram['jumlah']), 0, ',', '.') }}</td>

                                            <!-- Tahap -->
                                            <td class="text-right font-bold">{{ number_format($uraianProgram['tahap1'], 0, ',', '.') }}</td>
                                            <td class="text-right font-bold">{{ number_format($uraianProgram['tahap2'], 0, ',', '.') }}</td>
                                        </tr>

                                        <!-- Items -->
                                        @if (!empty($uraianProgram['items']))
                                            @foreach ($uraianProgram['items'] as $item)
                                                @php
                                                    // Calculate per-stage volumes
                                                    $monthsT1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                                                    $monthsT2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                                    $volT1 = 0;
                                                    $volT2 = 0;
                                                    
                                                    if(isset($item['bulanan'])) {
                                                        foreach($monthsT1 as $m) {
                                                            if(isset($item['bulanan'][$m])) {
                                                                $volT1 += $item['bulanan'][$m]['volume'] ?? 0;
                                                            }
                                                        }
                                                        foreach($monthsT2 as $m) {
                                                            if(isset($item['bulanan'][$m])) {
                                                                $volT2 += $item['bulanan'][$m]['volume'] ?? 0;
                                                            }
                                                        }
                                                    }
                                                    $volTotal = $volT1 + $volT2;
                                                @endphp
                                                <tr>
                                                    <td class="text-center">{{ $no++ }}</td>
                                                    <td class="text-center">{{ $item['kode_rekening'] }}</td>
                                                    <td class="text-center">{{ $uraianKode }}</td>
                                                    <td>{{ $item['uraian'] }}</td>
                                                    
                                                    <!-- Sebelum -->
                                                    <td class="text-center">{{ $item['murni']['volume'] ?? 0 }}</td>
                                                    <td class="text-center">-</td>
                                                    <td class="text-center">-</td>
                                                    <td class="text-center">{{ $item['murni']['satuan'] ?? $item['satuan'] }}</td>
                                                    <td class="text-right">{{ number_format($item['murni']['harga_satuan'] ?? $item['harga_satuan'] ?? 0, 0, ',', '.') }}</td>
                                                    <td class="text-right font-bold">{{ number_format($item['murni']['jumlah'] ?? 0, 0, ',', '.') }}</td>

                                                    <!-- Sesudah -->
                                                    <td class="text-center">{{ $volTotal }}</td>
                                                    <td class="text-center">{{ $volT1 }}</td>
                                                    <td class="text-center">{{ $volT2 }}</td>
                                                    <td class="text-center">{{ $item['satuan'] }}</td>
                                                    <td class="text-right">{{ number_format($item['harga_satuan'] ?? 0, 0, ',', '.') }}</td>
                                                    <td class="text-right font-bold">{{ number_format($item['jumlah'], 0, ',', '.') }}</td>

                                                    <!-- Selisih -->
                                                    <td class="text-right">{{ number_format(max(0, $item['jumlah'] - ($item['murni']['jumlah'] ?? 0)), 0, ',', '.') }}</td>
                                                    <td class="text-right">{{ number_format(max(0, ($item['murni']['jumlah'] ?? 0) - $item['jumlah']), 0, ',', '.') }}</td>

                                                    <!-- Tahap -->
                                                    <td class="text-right">{{ number_format($item['tahap1'], 0, ',', '.') }}</td>
                                                    <td class="text-right">{{ number_format($item['tahap2'], 0, ',', '.') }}</td>
                                                </tr>
                                            @endforeach
                                        @endif
                                    @endforeach
                                @endif
                            @endforeach
                        @endif
                    @endforeach

                    <!-- Grand Total -->
                    @php
                        $grandTotalMurni = 0;
                        $grandTotal = 0;
                        $grandTotalT1 = 0;
                        $grandTotalT2 = 0;

                         foreach ($tahapanData as $prog) {
                             $grandTotalMurni += $prog['jumlah_murni'] ?? 0;
                             $grandTotal += $prog['jumlah'];
                             $grandTotalT1 += $prog['tahap1'];
                             $grandTotalT2 += $prog['tahap2'];
                         }
                    @endphp
                    <tr class="bg-grey font-bold" style="border-top: 2px solid black;">
                        <td colspan="9" class="text-center uppercase">Jumlah Total</td>
                        <td class="text-right">{{ number_format($grandTotalMurni, 0, ',', '.') }}</td>
                        <td colspan="5" class="text-right"></td>
                        <td class="text-right">{{ number_format($grandTotal, 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format(max(0, $grandTotal - $grandTotalMurni), 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format(max(0, $grandTotalMurni - $grandTotal), 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($grandTotalT1, 0, ',', '.') }}</td>
                        <td class="text-right">{{ number_format($grandTotalT2, 0, ',', '.') }}</td>
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
