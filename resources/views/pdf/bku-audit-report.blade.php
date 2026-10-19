<!DOCTYPE html>
<html lang="id">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Lembar Pra-Audit AI BKU - {{ $audit->bulan }} {{ $audit->tahun }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 1.2cm 1.5cm;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9.5pt;
            line-height: 1.35;
            color: #1f2937;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .school-name {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .school-address {
            font-size: 8.5pt;
            color: #4b5563;
            margin-top: 2px;
        }
        .doc-title {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin-top: 10px;
            text-transform: uppercase;
            text-decoration: underline;
        }
        .doc-subtitle {
            text-align: center;
            font-size: 8.5pt;
            color: #4b5563;
            margin-bottom: 14px;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 12px;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 3px 6px;
            font-size: 9pt;
        }
        .meta-label {
            width: 18%;
            font-weight: bold;
            color: #374151;
        }
        .meta-val {
            width: 32%;
        }

        .score-card {
            background-color: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
        }
        .score-flex {
            width: 100%;
        }
        .score-num {
            font-size: 26pt;
            font-weight: bold;
            text-align: center;
            width: 90px;
        }
        .score-green { color: #15803d; }
        .score-yellow { color: #b45309; }
        .score-red { color: #b91c1c; }

        .summary-text {
            font-size: 9pt;
            text-align: justify;
            color: #334155;
            padding-left: 12px;
            vertical-align: middle;
        }

        .section-title {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 14px;
            margin-bottom: 6px;
            text-transform: uppercase;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
        }

        .table-data {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .table-data th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-size: 8.5pt;
            font-weight: bold;
            padding: 6px 5px;
            border: 1px solid #cbd5e1;
            text-align: center;
        }
        .table-data td {
            font-size: 8.5pt;
            padding: 5px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
        }

        .badge {
            display: inline-block;
            padding: 2px 5px;
            font-size: 7.5pt;
            font-weight: bold;
            border-radius: 3px;
            text-transform: uppercase;
            text-align: center;
        }
        .badge-danger { background-color: #fee2e2; color: #991b1b; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .badge-info { background-color: #e0f2fe; color: #075985; }

        .signature-section {
            margin-top: 25px;
            width: 100%;
            page-break-inside: avoid;
        }
        .signature-table {
            width: 100%;
            text-align: center;
        }
        .signature-space {
            height: 60px;
        }
    </style>
</head>
<body>

    <!-- Kop Sekolah -->
    <div class="header">
        <div class="school-name">{{ $sekolah->nama_sekolah ?? 'PEMERINTAH DAERAH SATUAN PENDIDIKAN' }}</div>
        <div class="school-address">
            NPSN: {{ $sekolah->npsn ?? '-' }} | Alamat: {{ $sekolah->alamat ?? '-' }}, 
            Kec. {{ $sekolah->kecamatan ?? '-' }}, {{ $sekolah->kabupaten_kota ?? '-' }}, Prov. {{ $sekolah->provinsi ?? '-' }}
        </div>
    </div>

    <!-- Judul Dokumen -->
    <div class="doc-title">LEMBAR KERJA PRA-AUDIT KEPATUHAN BUKU KAS UMUM</div>
    <div class="doc-subtitle">Pemeriksaan Kepatuhan Berbasis Penalaran AI (DeepSeek-R1) Sebelum Penutupan Kas</div>

    <!-- Metadata Periode -->
    <table class="meta-table">
        <tr>
            <td class="meta-label">Tahun Anggaran</td>
            <td class="meta-val">: {{ $audit->tahun }}</td>
            <td class="meta-label">Sumber Dana</td>
            <td class="meta-val">: {{ $variantTitle }}</td>
        </tr>
        <tr>
            <td class="meta-label">Bulan Pembukuan</td>
            <td class="meta-val">: {{ $audit->bulan }} {{ $audit->tahun }}</td>
            <td class="meta-label">Waktu Audit</td>
            <td class="meta-val">: {{ $audit->created_at->format('d/m/Y H:i') }} WIB</td>
        </tr>
    </table>

    <!-- Kartu Skor & Ringkasan Eksekutif -->
    @php
        $score = $audit->compliance_score ?? 100;
        $scoreClass = $score >= 85 ? 'score-green' : ($score >= 60 ? 'score-yellow' : 'score-red');
        $statusText = $score >= 85 ? 'Kepatuhan Sangat Baik' : ($score >= 60 ? 'Perlu Perhatian / Catatan' : 'Risiko Temuan Tinggi');
    @endphp

    <div class="score-card">
        <table class="score-flex">
            <tr>
                <td style="width: 110px; text-align: center; border-right: 1px solid #cbd5e1;">
                    <div class="score-num {{ $scoreClass }}">{{ $score }}</div>
                    <div style="font-size: 7.5pt; font-weight: bold; text-transform: uppercase;" class="{{ $scoreClass }}">
                        {{ $statusText }}
                    </div>
                </td>
                <td class="summary-text">
                    <strong>Ringkasan Eksekutif Auditor AI:</strong><br/>
                    {!! nl2br(e($audit->executive_summary)) !!}
                </td>
            </tr>
        </table>
    </div>

    <!-- Tabel Daftar Temuan Audit -->
    <div class="section-title">Rincian Temuan & Rekomendasi Tindak Lanjut</div>
    <table class="table-data">
        <thead>
            <tr>
                <th style="width: 4%;">No</th>
                <th style="width: 10%;">Tingkat</th>
                <th style="width: 14%;">Kategori</th>
                <th style="width: 38%;">Uraian Temuan</th>
                <th style="width: 34%;">Rekomendasi Perbaikan</th>
            </tr>
        </thead>
        <tbody>
            @forelse($audit->findings ?? [] as $idx => $f)
                @php
                    $sev = strtolower($f['severity'] ?? 'info');
                    $badgeClass = $sev === 'danger' ? 'badge-danger' : ($sev === 'warning' ? 'badge-warning' : 'badge-info');
                    $sevLabel = $sev === 'danger' ? 'BAHAYA' : ($sev === 'warning' ? 'PERINGATAN' : 'INFO');
                @endphp
                <tr>
                    <td style="text-align: center;">{{ $idx + 1 }}</td>
                    <td style="text-align: center;">
                        <span class="badge {{ $badgeClass }}">{{ $sevLabel }}</span>
                    </td>
                    <td style="text-align: center; font-size: 8pt; text-transform: capitalize;">
                        {{ str_replace('_', ' ', $f['category'] ?? '-') }}
                    </td>
                    <td>
                        <strong>{{ $f['title'] ?? '-' }}</strong><br/>
                        <span style="color: #4b5563;">{{ $f['description'] ?? '-' }}</span>
                        @if(!empty($f['amount']) && $f['amount'] > 0)
                            <br/><strong style="font-size: 7.5pt; color: #1e293b;">Nominal: Rp {{ number_format($f['amount'], 0, ',', '.') }}</strong>
                        @endif
                    </td>
                    <td style="color: #1e293b;">
                        {{ $f['recommendation'] ?? 'Lakukan konfirmasi bukti SPJ.' }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center; color: #15803d; padding: 12px;">
                        <strong>✓ Tidak ditemukan indikasi pelanggaran atau anomali fatal pada pembukuan bulan ini.</strong>
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Tanda Tangan -->
    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td style="width: 50%;">
                    Mengetahui,<br/>
                    Kepala Sekolah<br/>
                    <div class="signature-space"></div>
                    <strong><u>{{ $penganggaran->kepala_sekolah ?? $sekolah->nama_kepala_sekolah ?? '....................................' }}</u></strong><br/>
                    NIP. {{ $penganggaran->nip_kepala_sekolah ?? $sekolah->nip_kepala_sekolah ?? '........................' }}
                </td>
                <td style="width: 50%;">
                    {{ $sekolah->kecamatan ?? 'Kecamatan' }}, {{ now()->locale('id')->translatedFormat('d F Y') }}<br/>
                    Bendahara Pengeluaran BOSP<br/>
                    <div class="signature-space"></div>
                    <strong><u>{{ $penganggaran->bendahara ?? $sekolah->nama_bendahara ?? '....................................' }}</u></strong><br/>
                    NIP. {{ $penganggaran->nip_bendahara ?? $sekolah->nip_bendahara ?? '........................' }}
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
