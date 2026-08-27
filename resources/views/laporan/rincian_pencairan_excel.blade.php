<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rincian Pencairan</title>
</head>
<body>

    <table>
        <tr>
            <td>Program</td>
            <td>:</td>
            <td colspan="9">BOS REGULER</td>
        </tr>
        <tr>
            <td>Kegiatan</td>
            <td>:</td>
            <td colspan="9">Daftar Rincian Pencairan BOS Reguler Tahap {{ $tahap ?? 1 }} Tahun {{ $anggaran['tahun_anggaran'] ?? '' }}</td>
        </tr>
        <tr>
            <td>Nama Satuan</td>
            <td>:</td>
            <td colspan="9">{{ $anggaran['sekolah']['nama_sekolah'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>NPSN</td>
            <td>:</td>
            <td colspan="9">{{ $anggaran['sekolah']['npsn'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>Kecamatan</td>
            <td>:</td>
            <td colspan="9">{{ $anggaran['sekolah']['kecamatan'] ?? '-' }}</td>
        </tr>
        <tr>
            <td colspan="11"></td>
        </tr>
    </table>

    <table border="1">
        <thead>
            <tr>
                <th rowspan="2">No</th>
                <th rowspan="2">Nama Kegiatan</th>
                <th rowspan="2">Nama Penerima</th>
                <th rowspan="2">Jabatan</th>
                <th rowspan="2">Jumlah Anggaran (Rp)</th>
                <th rowspan="2">Pot. PPN 11%</th>
                <th rowspan="2">Pot. PPH 23 Badan 2%</th>
                <th rowspan="2">Pot. PPH 21</th>
                <th rowspan="2">Jumlah Yang Diterima (Rp)</th>
                <th rowspan="2">Nomor Rekening</th>
                <th rowspan="2">Bank</th>
            </tr>
            <tr></tr>
            <tr>
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
                <th>6</th>
                <th>7</th>
                <th>8</th>
                <th>9</th>
                <th>10</th>
                <th>11</th>
            </tr>
        </thead>
        <tbody>
            @php
                $no = 1;
                $totalAnggaran = 0;
                $totalPpn = 0;
                $totalPph23 = 0;
                $totalPph21 = 0;
                $totalDiterima = 0;
            @endphp

            @foreach($tahapanData as $progCode => $program)
                @if(isset($program['sub_programs']))
                    @foreach($program['sub_programs'] as $subCode => $subProgram)
                        @if(isset($subProgram['uraian_programs']))
                            @foreach($subProgram['uraian_programs'] as $urCode => $urProgram)
                                @if(isset($urProgram['items']))
                                    @foreach($urProgram['items'] as $item)
                                        @php
                                            $tahap = $tahap ?? 1;
                                            $jumlahAnggaran = $tahap == 1 ? ($item['tahap1'] ?? 0) : ($item['tahap2'] ?? 0);
                                        @endphp
                                        @if($jumlahAnggaran > 0)
                                            @php
                                                $ppn = isset($item['pot_ppn']) && is_numeric($item['pot_ppn']) ? (float)$item['pot_ppn'] : 0;
                                                $pph23 = isset($item['pot_pph23']) && is_numeric($item['pot_pph23']) ? (float)$item['pot_pph23'] : 0;
                                                $pph21 = isset($item['pot_pph21']) && is_numeric($item['pot_pph21']) ? (float)$item['pot_pph21'] : 0;
                                                $diterima = $jumlahAnggaran - $ppn - $pph23 - $pph21;

                                                $totalAnggaran += $jumlahAnggaran;
                                                $totalPpn += $ppn;
                                                $totalPph23 += $pph23;
                                                $totalPph21 += $pph21;
                                                $totalDiterima += $diterima;
                                            @endphp
                                        <tr>
                                            <td align="center">{{ $no++ }}</td>
                                            <td>{{ $item['uraian'] ?? '-' }}</td>
                                            <td>{{ $item['nama_penerima'] ?? '-' }}</td>
                                            <td>{{ $item['jabatan'] ?? '-' }}</td>
                                            <td align="right">{{ $jumlahAnggaran > 0 ? $jumlahAnggaran : 0 }}</td>
                                            <td align="right">{{ $ppn > 0 ? $ppn : 0 }}</td>
                                            <td align="right">{{ $pph23 > 0 ? $pph23 : 0 }}</td>
                                            <td align="right">{{ $pph21 > 0 ? $pph21 : 0 }}</td>
                                            <td align="right">{{ $diterima > 0 ? $diterima : 0 }}</td>
                                            <td style="mso-number-format:\@;">{{ $item['nomor_rekening'] ?? '-' }}</td>
                                            <td align="center">{{ $item['bank'] ?? '-' }}</td>
                                        </tr>
                                        @endif
                                    @endforeach
                                @endif
                            @endforeach
                        @endif
                    @endforeach
                @endif
            @endforeach

            <tr style="font-weight: bold;">
                <td colspan="4" align="center">Jumlah</td>
                <td align="right">{{ $totalAnggaran }}</td>
                <td align="right">{{ $totalPpn }}</td>
                <td align="right">{{ $totalPph23 }}</td>
                <td align="right">{{ $totalPph21 }}</td>
                <td align="right">{{ $totalDiterima }}</td>
                <td colspan="2"></td>
            </tr>

        </tbody>
    </table>

</body>
</html>
