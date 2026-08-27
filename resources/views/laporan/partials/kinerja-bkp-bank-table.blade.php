<div class="table-responsive">
    <table class="table table-bordered table-striped" style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
        <thead style="background-color: #f2f2f2;">
            <tr>
                <th style="border: 1px solid #000; padding: 5px;">Tanggal</th>
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
                <td style="border: 1px solid #000; padding: 5px;">01-{{ $bulanAngka < 10 ? '0'.$bulanAngka : $bulanAngka }}-{{ $tahun }}</td>
                <td style="border: 1px solid #000; padding: 5px;"></td>
                <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">
                    Saldo Awal bulan {{ ucfirst($bulan) }} {{ $tahun }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($saldoAwal, 0, ',', '.') }}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">0</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">{{ number_format($runningBalance, 0, ',', '.') }}</td>
            </tr>

            <!-- Penerimaan Dana (Kredit) -->
            @foreach($penerimaanDanas as $dana)
                @php
                    $runningBalance += $dana->jumlah_dana;
                @endphp
                <tr>
                    <td style="border: 1px solid #000; padding: 5px;">{{ \Carbon\Carbon::parse($dana->tanggal_terima)->format('d-m-Y') }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">STS-{{ $dana->id }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">Penerimaan Dana Tahap {{ $dana->tahap }}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($dana->jumlah_dana, 0, ',', '.') }}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">0</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($runningBalance, 0, ',', '.') }}</td>
                </tr>
            @endforeach

            <!-- Penarikan Tunai (Debet) -->
            @foreach($penarikanTunais as $tarik)
                @php
                    $runningBalance -= $tarik->jumlah_penarikan;
                @endphp
                <tr>
                    <td style="border: 1px solid #000; padding: 5px;">{{ \Carbon\Carbon::parse($tarik->tanggal_penarikan)->format('d-m-Y') }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">BPU-{{ $tarik->id }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">Penarikan Tunai</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">0</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($tarik->jumlah_penarikan, 0, ',', '.') }}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($runningBalance, 0, ',', '.') }}</td>
                </tr>
            @endforeach

            <!-- Bunga Bank (Kredit) -->
            @if($bungaRecord && $bungaRecord->bunga_bank > 0)
                @php
                    $runningBalance += $bungaRecord->bunga_bank;
                @endphp
                <tr>
                    <td style="border: 1px solid #000; padding: 5px;">{{ \Carbon\Carbon::parse($bungaRecord->tanggal_transaksi)->format('d-m-Y') }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">-</td>
                    <td style="border: 1px solid #000; padding: 5px;">Bunga Bank</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($bungaRecord->bunga_bank, 0, ',', '.') }}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">0</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($runningBalance, 0, ',', '.') }}</td>
                </tr>
            @endif

            <!-- Pajak Bunga (Debet) -->
            @if($bungaRecord && $bungaRecord->pajak_bunga_bank > 0)
                @php
                    $runningBalance -= $bungaRecord->pajak_bunga_bank;
                @endphp
                <tr>
                    <td style="border: 1px solid #000; padding: 5px;">{{ \Carbon\Carbon::parse($bungaRecord->tanggal_transaksi)->format('d-m-Y') }}</td>
                    <td style="border: 1px solid #000; padding: 5px;">-</td>
                    <td style="border: 1px solid #000; padding: 5px;">Pajak Bunga Bank</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">0</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($bungaRecord->pajak_bunga_bank, 0, ',', '.') }}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($runningBalance, 0, ',', '.') }}</td>
                </tr>
            @endif
            
            <!-- Footer Totals -->
            <tr style="font-weight: bold; background-color: #f2f2f2;">
                <td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: center;">JUMLAH</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($totalPenerimaan, 0, ',', '.') }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($totalPengeluaran, 0, ',', '.') }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($currentSaldo, 0, ',', '.') }}
                </td>
            </tr>
        </tbody>
    </table>
</div>
