<!DOCTYPE html>
<html lang="id">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Lembar Pra-Audit Forensik AI - {{ $tabTitle ?? 'BKU' }} - {{ $periodeLabel ?? $audit->periode_key }} {{ $audit->tahun }}</title>
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
            margin-bottom: 14px;
        }
        .school-name {
            font-size: 13pt;
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
            font-size: 11.5pt;
            font-weight: bold;
            margin-top: 6px;
            text-transform: uppercase;
            text-decoration: underline;
        }
        .doc-subtitle {
            text-align: center;
            font-size: 9pt;
            font-weight: bold;
            color: #4338ca;
            margin-top: 2px;
            margin-bottom: 12px;
            text-transform: uppercase;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 12px;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 3px 6px;
            font-size: 8.5pt;
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
            margin-bottom: 12px;
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
            font-size: 8.5pt;
            text-align: justify;
            color: #334155;
            padding-left: 12px;
            vertical-align: middle;
        }

        .section-title {
            font-size: 9.5pt;
            font-weight: bold;
            margin-top: 12px;
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
            font-size: 8pt;
            font-weight: bold;
            padding: 5px 4px;
            border: 1px solid #cbd5e1;
            text-align: center;
        }
        .table-data td {
            font-size: 8pt;
            padding: 5px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
        }

        .badge {
            display: inline-block;
            padding: 2px 4px;
            font-size: 7pt;
            font-weight: bold;
            border-radius: 3px;
            text-transform: uppercase;
            text-align: center;
        }
        .badge-danger { background-color: #fee2e2; color: #991b1b; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .badge-info { background-color: #e0f2fe; color: #075985; }

        .checklist-item {
            font-size: 8pt;
            color: #334155;
            margin-bottom: 2px;
        }

        .signature-section {
            margin-top: 20px;
            width: 100%;
            page-break-inside: avoid;
        }
        .signature-table {
            width: 100%;
            text-align: center;
            font-size: 8.5pt;
        }
        .signature-space {
            height: 55px;
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
    <div class="doc-title">LEMBAR HASIL PENELAAHAN PRA-AUDIT FORENSIK KEUANGAN BOSP</div>
    <div class="doc-subtitle">{{ $tabTitle ?? 'BUKU KAS PEMBANTU' }}</div>

    <!-- Metadata Periode -->
    <table class="meta-table">
        <tr>
            <td class="meta-label">Objek Buku</td>
            <td class="meta-val">: {{ $tabTitle ?? 'Buku Kas Umum' }}</td>
            <td class="meta-label">Sumber Dana</td>
            <td class="meta-val">: {{ $variantTitle }}</td>
        </tr>
        <tr>
            <td class="meta-label">Periode Audit</td>
            <td class="meta-val">: {{ $periodeLabel ?? $audit->periode_key }} {{ $audit->tahun }}</td>
            <td class="meta-label">Waktu Pemindaian</td>
            <td class="meta-val">: {{ $audit->created_at->format('d/m/Y H:i') }} WIB</td>
        </tr>
        <tr>
            <td class="meta-label">Engine Audit</td>
            <td class="meta-val">: {{ $audit->metadata['model_used'] ?? 'DeepSeek-R1 (Forensic Reasoner)' }}</td>
            <td class="meta-label">Status Caching</td>
            <td class="meta-val">: Hasil Analisis Terverifikasi Sistem</td>
        </tr>
    </table>

    <!-- Kartu Skor & Ringkasan Eksekutif -->
    @php
        $score = $audit->compliance_score ?? 100;
        $scoreClass = $score >= 85 ? 'score-green' : ($score >= 60 ? 'score-yellow' : 'score-red');
        $statusText = $score >= 85 ? 'Kepatuhan Sangat Baik' : ($score >= 60 ? 'Perlu Perhatian / Catatan' : 'Risiko Temuan BPK Tinggi');
    @endphp

    <div class="score-card">
        <table class="score-flex">
            <tr>
                <td style="width: 110px; text-align: center; border-right: 1px solid #cbd5e1;">
                    <div class="score-num {{ $scoreClass }}">{{ $score }}</div>
                    <div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;" class="{{ $scoreClass }}">
                        {{ $statusText }}
                    </div>
                </td>
                <td class="summary-text">
                    <strong>Opini & Ringkasan Eksekutif Auditor:</strong><br/>
                    {!! nl2br(e($audit->executive_summary)) !!}
                </td>
            </tr>
        </table>
    </div>

    <!-- Tabel Daftar Temuan Audit -->
    <div class="section-title">Matriks Temuan & Rekomendasi Tindak Lanjut</div>
    <table class="table-data">
        <thead>
            <tr>
                <th style="width: 4%;">No</th>
                <th style="width: 10%;">Tingkat</th>
                <th style="width: 15%;">Kategori</th>
                <th style="width: 37%;">Fakta Temuan & Potensi Pelanggaran</th>
                <th style="width: 34%;">Saran Rekomendasi Solusi</th>
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
                    <td style="text-align: center; font-size: 7.5pt; text-transform: capitalize;">
                        {{ str_replace('_', ' ', $f['category'] ?? '-') }}
                    </td>
                    <td>
                        <strong>{{ $f['title'] ?? '-' }}</strong><br/>
                        @if(!empty($f['transaction_ref']))
                            <div style="margin-top: 3px; margin-bottom: 3px; font-size: 7pt; color: #3730a3; background-color: #eef2ff; padding: 2px 4px; border-radius: 2px; border: 1px solid #c7d2fe;">
                                <strong>Rujukan Transaksi/Rekening:</strong> {{ $f['transaction_ref'] }}
                            </div>
                        @endif
                        <span style="color: #4b5563;">{{ $f['description'] ?? '-' }}</span>
                        @if(!empty($f['amount']) && $f['amount'] > 0)
                            <br/><strong style="font-size: 7pt; color: #1e293b;">Nominal Terkait: Rp {{ number_format($f['amount'], 0, ',', '.') }}</strong>
                        @endif
                    </td>
                    <td style="color: #1e293b;">
                        {{ $f['recommendation'] ?? 'Lakukan konfirmasi bukti SPJ sebelum penutupan kas.' }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center; color: #15803d; padding: 10px;">
                        <strong>✓ Tidak ditemukan indikasi ketidakpatuhan atau anomali pada objek buku dan periode ini.</strong>
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Daftar Kepatuhan Aturan yang Diuji -->
    @if(!empty($audit->rules_checked))
        <div class="section-title">Daftar Kepatuhan Regulasi & Standar yang Diuji</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
            @foreach(array_chunk($audit->rules_checked, 2) as $row)
                <tr>
                    @foreach($row as $rule)
                        <td style="width: 50%; font-size: 7.5pt; color: #374151; padding: 2px 4px;">
                            ✓ {{ $rule }}
                        </td>
                    @endforeach
                    @if(count($row) === 1)
                        <td style="width: 50%;"></td>
                    @endif
                </tr>
            @endforeach
        </table>
    @endif

    <!-- Tanda Tangan -->
    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td style="width: 50%;">
                    Mengetahui / Mengesahkan,<br/>
                    Kepala Sekolah (Kuasa Pengguna Anggaran)<br/>
                    <div class="signature-space"></div>
                    <strong><u>{{ $penganggaran->kepala_sekolah ?? $sekolah->nama_kepala_sekolah ?? '....................................' }}</u></strong><br/>
                    NIP. {{ $penganggaran->nip_kepala_sekolah ?? $sekolah->nip_kepala_sekolah ?? '........................' }}
                </td>
                <td style="width: 50%;">
                    {{ $sekolah->kecamatan ?? 'Kecamatan' }}, {{ now()->locale('id')->translatedFormat('d F Y') }}<br/>
                    Bendahara Pengeluaran Pembantu BOSP<br/>
                    <div class="signature-space"></div>
                    <strong><u>{{ $penganggaran->bendahara ?? $sekolah->nama_bendahara ?? '....................................' }}</u></strong><br/>
                    NIP. {{ $penganggaran->nip_bendahara ?? $sekolah->nip_bendahara ?? '........................' }}
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
