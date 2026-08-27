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
                $runningBalance = $data['saldoAwalTunai'];
            @endphp
            <!-- Saldo Awal Row -->
            <tr>
                <td style="border: 1px solid #000; padding: 5px;">01-{{ $bulanAngka < 10 ? '0'.$bulanAngka : $bulanAngka }}-{{ $tahun }}</td>
                <td style="border: 1px solid #000; padding: 5px;"></td>
                <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">
                    Saldo Awal bulan {{ ucfirst($bulan) }} {{ $tahun }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">{{ number_format($data['saldoAwalTunai'], 0, ',', '.') }}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">0</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">{{ number_format($runningBalance, 0, ',', '.') }}</td>
            </tr>

            @foreach($items as $item)
                @php
                    $penerimaan = $item['penerimaan'] ?? 0;
                    $pengeluaran = $item['pengeluaran'] ?? 0;
                    $runningBalance = $runningBalance + $penerimaan - $pengeluaran;
                @endphp
                <tr>
                    <td style="border: 1px solid #000; padding: 5px;">
                        {{ \Carbon\Carbon::parse($item['tanggal'])->format('d-m-Y') }}
                    </td>
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
                <td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: center;">JUMLAH</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($data['totalPenerimaan'] + $data['saldoAwalTunai'], 0, ',', '.') }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($data['totalPengeluaran'], 0, ',', '.') }}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">
                    {{ number_format($data['currentSaldo'], 0, ',', '.') }}
                </td>
            </tr>
        </tbody>
    </table>
</div>
