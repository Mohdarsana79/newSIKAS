<?php

namespace App\Services\Ai;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class CalkAiGenerator
{
    protected DeepSeekService $deepSeekService;

    public function __construct(DeepSeekService $deepSeekService)
    {
        $this->deepSeekService = $deepSeekService;
    }

    /**
     * Menghasilkan draf dokumen narasi CaLK (Bab I s.d. Bab V) berbasis data finansial riil.
     */
    public function generate(User $user, array $metrics): array
    {
        $apiKey = $user->deepseek_api_key;

        // Jika user belum memasang API key, berikan draf standar terstruktur berbasis angka riil
        if (empty($apiKey)) {
            return $this->generateHeuristicDraft($metrics);
        }

        $systemPrompt = <<<PROMPT
Anda adalah Auditor Ahli Akuntansi Sektor Publik & Perancang Laporan Keuangan Pemerintah Indonesia spesialis Dana BOSP (Bantuan Operasional Satuan Pendidikan) Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI.

TUGAS ANDA:
Menyusun naskah narasi formal CATATAN ATAS LAPORAN KEUANGAN (CaLK) & Laporan Pertanggungjawaban (LPJ) berdasarkan Standar Akuntansi Pemerintahan (SAP) dan Peraturan Menteri Keuangan/Permendikbudristek yang berlaku.

PANDUAN PENULISAN:
1. Gunakan bahasa Indonesia birokrasi pemerintahan yang formal, baku, santun, objektif, dan berwibawa (cocok untuk diaudit oleh BPK RI dan Inspektorat Daerah).
2. JANGAN mengubah atau mengarang angka nominal rupiah yang diberikan. Gunakan angka riil persis seperti yang disediakan dalam data ringkasan.
3. Format teks menggunakan paragraf yang terstruktur rapi, lengkap dengan penomoran sub-bab (A, B, C atau 1, 2, 3) di setiap bab.

STRUKTUR OUTPUT HARUS BERUPA JSON MURNI DENGAN 5 BAB:
{
  "bab_1_pendahuluan": "Teks lengkap Bab I (Latar Belakang, Maksud & Tujuan, Landasan Hukum, Profil Singkat Sekolah)",
  "bab_2_kebijakan_akuntansi": "Teks lengkap Bab II (Basis Akuntansi Kas Menuju Akrual, Pengakuan Pendapatan Transfer BOSP, Pengakuan Belanja, Perlakuan Persediaan & Aset Tetap)",
  "bab_3_analisis_realisasi": "Teks lengkap Bab III (Analisis Perbandingan Pagu vs Realisasi Belanja, Persentase Serapan, Analisis Efisiensi dan Deviasi)",
  "bab_4_penjelasan_pos_keuangan": "Teks lengkap Bab IV (Rincian Belanja Operasi, Belanja Modal, Pemotongan & Penyetoran Pajak, Penjelasan Saldo Kas Bank dan Kas Tunai)",
  "bab_5_penutup": "Teks lengkap Bab V (Capaian Output dan Kinerja Sekolah, Kendala yang Dihadapi dan Solusi, Kesimpulan & Rekomendasi Penutup)"
}
PROMPT;

        $userPrompt = "Berikut adalah data riil keuangan sekolah untuk periode pelaporan:\n\n" . json_encode($metrics, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
        ];

        $response = $this->deepSeekService->callChat($apiKey, $messages, [
            'temperature' => 0.3,
            'response_format' => ['type' => 'json_object'],
            'timeout' => 90,
        ]);

        if (! $response['success']) {
            Log::warning('DeepSeek CaLK generation failed: ' . ($response['message'] ?? 'Unknown error'));
            $fallback = $this->generateHeuristicDraft($metrics);
            $fallback['warning'] = 'Gagal menghubungi DeepSeek API: ' . ($response['message'] ?? 'Koneksi terputus') . '. Sistem menggunakan draf baku otomatis.';
            return $fallback;
        }

        $rawContent = trim($response['content'] ?? '');
        if (str_starts_with($rawContent, '```')) {
            $rawContent = preg_replace('/^```(?:json)?\s*/i', '', $rawContent);
            $rawContent = preg_replace('/\s*```$/', '', $rawContent);
        }

        $parsed = json_decode($rawContent, true);
        if (! is_array($parsed) || empty($parsed['bab_1_pendahuluan'])) {
            Log::warning('DeepSeek CaLK returned invalid format: ' . $rawContent);
            return $this->generateHeuristicDraft($metrics);
        }

        $parsed['is_ai_generated'] = true;
        return $parsed;
    }

    /**
     * Draf heuristik standar ketika DeepSeek API key belum diisi atau sedang offline.
     */
    protected function generateHeuristicDraft(array $metrics): array
    {
        $sek = $metrics['sekolah'];
        $fin = $metrics['finansial'];
        $tahun = $metrics['tahun'];
        $periode = $metrics['periode_label'];

        $formatRp = fn($val) => 'Rp ' . number_format($val, 0, ',', '.');

        $bab1 = <<<TEXT
A. LATAR BELAKANG
Berdasarkan amanat Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional dan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Republik Indonesia tentang Petunjuk Teknis Pengelolaan Dana Bantuan Operasional Satuan Pendidikan (BOSP), {$sek['nama']} berkewajiban menyusun pertanggungjawaban penatausahaan keuangan yang transparan dan akuntabel.

B. MAKSUD DAN TUJUAN
Penyusunan Catatan Atas Laporan Keuangan (CaLK) ini dimaksudkan untuk memberikan penjelasan naratif dan analisis komprehensif atas pelaksanaan anggaran dana BOSP pada {$sek['nama']} selama periode {$periode} Tahun Anggaran {$tahun}. Dokumen ini disusun untuk memenuhi asas keterbukaan informasi dan kepatuhan terhadap regulasi penatausahaan kas sekolah.

C. LANDASAN HUKUM
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. Peraturan Pemerintah Nomor 12 Tahun 2019 tentang Pengelolaan Keuangan Daerah.
3. Peraturan Menteri Keuangan RI terkait Pengalokasian dan Penyaluran Dana Alokasi Khusus Nonfisik Dana BOSP.
4. Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi tentang Petunjuk Teknis Pengelolaan Dana BOSP.

D. PROFIL SATUAN PENDIDIKAN
Nama Sekolah: {$sek['nama']}
Nomor Pokok Sekolah Nasional (NPSN): {$sek['npsn']}
Alamat: {$sek['alamat']}, Kec. {$sek['kecamatan']}, Kab/Kota {$sek['kabupaten']}, Provinsi {$sek['provinsi']}
Kepala Sekolah: {$sek['kepala_sekolah']} (NIP: {$sek['nip_kepala_sekolah']})
Bendahara BOSP: {$sek['bendahara']} (NIP: {$sek['nip_bendahara']})
TEXT;

        $bab2 = <<<TEXT
A. BASIS AKUNTANSI
Laporan Keuangan {$sek['nama']} disusun dengan menerapkan basis kas menuju akrual (cash toward accrual basis) sesuai dengan Kerangka Konseptual Standar Akuntansi Pemerintahan (SAP). Pendapatan dana transfer BOSP diakui pada saat kas diterima di Rekening Kas Satuan Pendidikan, dan belanja diakui pada saat kas dikeluarkan dari kas bank atau kas tunai untuk melunasi kewajiban belanja yang sah.

B. PENGAKUAN PENDAPATAN TRANSFER BOSP
Pendapatan dana BOSP bersumber dari Anggaran Pendapatan dan Belanja Negara (APBN) yang disalurkan secara langsung melalui Kas Umum Negara ke rekening sekolah dalam 2 (dua) tahapan pencairan. Setiap mutasi kredit pada rekening koran dicatat sebagai penambahan ekuitas dana lancar sekolah.

C. PERLAKUAN BELANJA DAN ASET TETAP
1. Belanja Operasi (Belanja Pegawai/Honor dan Belanja Barang & Jasa) diakui saat terjadinya transaksi kas pengeluaran dan didukung oleh bukti pertanggungjawaban (SPJ/Kwitansi) yang sah dan lengkap.
2. Belanja Modal (Peralatan, Mesin, Buku Perpustakaan, dan Aset Tetap) yang memenuhi kriteria nilai kapitalisasi dicatat dan dilaporkan untuk dimasukkan ke dalam Kartu Inventaris Barang (KIB) aset daerah.
TEXT;

        $bab3 = <<<TEXT
A. PERBANDINGAN TARGET PAGU DENGAN REALISASI
Pada Tahun Anggaran {$tahun} periode {$periode}, target alokasi pagu anggaran dan realisasi belanja {$sek['nama']} adalah sebagai berikut:
1. Pagu Anggaran BOSP: {$formatRp($fin['pagu_anggaran'])}
2. Total Penerimaan Dana Masuk: {$formatRp($fin['total_penerimaan'])}
3. Realisasi Pengeluaran Belanja: {$formatRp($fin['total_belanja'])}
4. Sisa Pagu Anggaran: {$formatRp($fin['sisa_anggaran'])}
5. Tingkat Serapan Anggaran: {$fin['persentase_serapan']}%

B. ANALISIS TINGKAT SERAPAN ANGGARAN
Capaian serapan anggaran sebesar {$fin['persentase_serapan']}% mencerminkan kinerja operasional sekolah yang berjalan secara terencana sesuai dengan Rencana Kegiatan dan Anggaran Sekolah (RKAS). Penyerapan anggaran diprioritaskan untuk pemenuhan kebutuhan dasar kegiatan belajar mengajar serta peningkatan mutu layanan pendidikan.
TEXT;

        $bab4 = <<<TEXT
A. RINCIAN POS BELANJA OPERASIONAL
Realisasi belanja selama periode pelaporan terdiri atas beberapa kelompok rekening belanja:
1. Belanja Pegawai (Honor Tenaga Pendidik & Kependidikan Non-ASN): {$formatRp($fin['belanja_pegawai'])}
2. Belanja Barang dan Jasa (Operasional, Bahan Pembelajaran, Daya & Jasa): {$formatRp($fin['belanja_barang_jasa'])}
3. Belanja Modal (Pengadaan Alat Pembelajaran, IT, dan Aset Tetap): {$formatRp($fin['belanja_modal'])}
4. Belanja Pemeliharaan Sarana dan Prasarana: {$formatRp($fin['belanja_pemeliharaan'])}

B. POSISI SALDO KAS AKHIR
Pada akhir periode pelaporan {$periode}, posisi saldo kas {$sek['nama']} tercatat sebesar {$formatRp($fin['saldo_kas_total'])}, dengan rincian:
1. Saldo Kas di Rekening Bank: {$formatRp($fin['saldo_kas_bank'])}
2. Saldo Kas Tunai di Brankas Bendahara: {$formatRp($fin['saldo_kas_tunai'])}
Saldo kas tersebut berada dalam kondisi aman dan tercatat dengan tertib pada Buku Pembantu Kas dan Buku Pembantu Bank.
TEXT;

        $bab5 = <<<TEXT
A. KENDALA DAN UPAYA PENYELESAIAN
Dalam pelaksanaan pengelolaan dana BOSP periode {$periode} Tahun {$tahun}, beberapa kendala administratif seperti penyesuaian regulasi perpajakan dan fluktuasi harga pasar kebutuhan sekolah berhasil diatasi melalui rapat koordinasi Tim Manajemen BOSP Sekolah dan optimalisasi pembelanjaan melalui platform SIPLah.

B. CAPAIAN OUTPUT KEGIATAN
Pengelolaan dana BOSP telah berhasil mendukung pemenuhan Standar Nasional Pendidikan (SNP), terjaminnya pembayaran honorarium tenaga honorer secara tepat waktu, tersedianya alat tulis dan bahan ajar yang memadai, serta terlaksananya kegiatan evaluasi asesmen pembelajaran siswa dengan lancar.

C. PERNYATAAN PENUTUP
Demikian Catatan Atas Laporan Keuangan (CaLK) ini disusun dengan sebenar-benarnya sebagai wujud pertanggungjawaban publik dan keterbukaan informasi penatausahaan keuangan sekolah pada {$sek['nama']}.
TEXT;

        return [
            'bab_1_pendahuluan' => $bab1,
            'bab_2_kebijakan_akuntansi' => $bab2,
            'bab_3_analisis_realisasi' => $bab3,
            'bab_4_penjelasan_pos_keuangan' => $bab4,
            'bab_5_penutup' => $bab5,
            'is_ai_generated' => false,
        ];
    }
}
