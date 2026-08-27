<div class="table-responsive">
    <table class="table table-bordered table-striped" style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
        <thead style="background-color: #f2f2f2;">
            <tr>
                <th style="border: 1px solid #000; padding: 5px;">Tanggal</th>
                <th style="border: 1px solid #000; padding: 5px;">Kode Rekening</th>
                <th style="border: 1px solid #000; padding: 5px;">No. Bukti</th>
                <th style="border: 1px solid #000; padding: 5px;">Uraian</th>
                <th style="border: 1px solid #000; padding: 5px;">Penerimaan (Kredit)</th>
                <th style="border: 1px solid #000; padding: 5px;">Pengeluaran (Debet)</th>
                <th style="border: 1px solid #000; padding: 5px;">Saldo</th>
            </tr>
        </thead>
        <tbody>
            @php
                $runningBalance = $saldoAwal;
            @endphp
            <!-- Saldo Awal Row -->
            <tr>
                <td style="border: 1px solid #000; padding: 5px;">01-{{ substr($bulan, 0, 3) }}-{{ $tahun }}</td>
                <td style="border: 1px solid #000; padding: 5px;"></td>
                <td style="border: 1px solid #000; padding: 5px;"></td>
                <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">
                    Saldo Awal bulan {{ ucfirst($bulan) }} {{ $tahun }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($saldoAwal, 0, ',', '.') }}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">0</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">{{ number_format($runningBalance, 0, ',', '.') }}</td>
            </tr>

            <!-- Transaction Rows -->
            @foreach($items as $item)
                @php
                    $penerimaan = $item['penerimaan'] ?? 0;
                    $pengeluaran = $item['pengeluaran'] ?? 0;
                    $runningBalance = $runningBalance + $penerimaan - $pengeluaran;
                @endphp
                <tr>
                    <td style="border: 1px solid #000; padding: 5px;">
                        @if(isset($item['tanggal']))
                            {{ \Carbon\Carbon::parse($item['tanggal'])->format('d-m-Y') }}
                        @else
                            -
                        @endif
                    </td>
                    <td style="border: 1px solid #000; padding: 5px;">{{ $item['kode_rekening'] ?? '-' }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">{{ $item['no_bukti'] ?? '-' }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">{{ $item['uraian'] ?? '-' }}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                        {{ $penerimaan > 0 ? number_format($penerimaan, 0, ',', '.') : '-' }}
                    </td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                        {{ $pengeluaran > 0 ? number_format($pengeluaran, 0, ',', '.') : '-' }}
                    </td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                        {{ number_format($runningBalance, 0, ',', '.') }}
                    </td>
                </tr>
            @endforeach
            
            <!-- Footer Totals -->
            <tr style="font-weight: bold; background-color: #f2f2f2;">
                <td colspan="4" style="border: 1px solid #000; padding: 5px; text-align: center;">JUMLAH PENUTUPAN</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($totalPenerimaan + $saldoAwal, 0, ',', '.') }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($totalPengeluaran, 0, ',', '.') }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($saldoAkhir, 0, ',', '.') }}
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Closing Details -->
    <div style="margin-top: 20px;">
        <p>Pada hari ini, ..., tanggal ... {{ ucfirst($bulan) }} {{ $tahun }} Buku Kas Umum ditutup dengan keadaan/posisi sebagai berikut :</p>
        <table style="width: 100%;">
            <tr>
                <td style="width: 200px;">Saldo Buku Kas Umum</td>
                <td>: Rp. {{ number_format($saldoAkhir, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Saldo Bank</td>
                <td>: Rp. {{ number_format($saldoBank, 0, ',', '.') }}</td>
            </tr>
             <tr>
                <td style="padding-left: 20px;">1. Dana Sekolah</td>
                <td>: Rp. {{ number_format($danaSekolah, 0, ',', '.') }}</td>
            </tr>
             <tr>
                <td style="padding-left: 20px;">2. Dana BOSP</td>
                <td>: Rp. {{ number_format($danaBosp, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Saldo Kas Tunai</td>
                <td>: Rp. {{ number_format($saldoTunai, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Jumlah</td>
                <td style="font-weight: bold;">: Rp. {{ number_format($saldoBank + $saldoTunai, 0, ',', '.') }}</td>
            </tr>
        </table>
    </div>
</div>
