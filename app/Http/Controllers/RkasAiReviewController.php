<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\DeepSeekService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class RkasAiReviewController extends Controller
{
    protected string $variant;

    protected DeepSeekService $deepSeekService;

    public function __construct(DeepSeekService $deepSeekService)
    {
        $this->deepSeekService = $deepSeekService;

        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';

            return $next($request);
        });
    }

    /**
     * Menghasilkan ringkasan telaah eksekutif anggaran RKAS dengan DeepSeek AI.
     */
    public function review(Request $request, $id)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi pengguna tidak valid.',
            ], 401);
        }

        $apiKey = $user->deepseek_api_key;
        if (empty($apiKey)) {
            $bendaharaKey = User::whereNotNull('deepseek_api_key')->value('deepseek_api_key');
            $apiKey = $bendaharaKey ?: env('DEEPSEEK_API_KEY');
        }

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Kunci API DeepSeek belum dikonfigurasi. Silakan atur API Key pada menu Pengaturan Profil Bendahara.',
            ], 422);
        }

        $isPerubahan = $request->boolean('is_perubahan', false);
        $penganggaranModel = VariantConfig::getModelClass('penganggaran', $this->variant);
        $penganggaran = $penganggaranModel::with('sekolah')->findOrFail($id);

        $concept = $isPerubahan ? 'rkas_perubahan' : 'rkas';
        $rkasModel = VariantConfig::getModelClass($concept, $this->variant);
        if (! $rkasModel) {
            $rkasModel = VariantConfig::getModelClass('rkas', $this->variant);
        }

        $fk = VariantConfig::penganggaranFk($this->variant);
        $rkasItems = $rkasModel::where($fk, $id)
            ->with(['kodeKegiatan', 'rekeningBelanja', 'reviews'])
            ->get();

        if ($rkasItems->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada data belanja pada penganggaran ini untuk dianalisis.',
            ], 422);
        }

        // Kalkulasi Statistik Anggaran
        $totalPagu = (float) $penganggaran->pagu_anggaran;
        $totalBelanja = $rkasItems->sum(function ($item) {
            return (float) ($item->harga_satuan * $item->jumlah);
        });
        $selisihPagu = $totalPagu - $totalBelanja;
        $persenSerapan = $totalPagu > 0 ? round(($totalBelanja / $totalPagu) * 100, 1) : 0;

        // Belanja Operasional (5.1) vs Modal (5.2) & Distribusi Semester
        $totalOperasional = 0;
        $totalModal = 0;
        $semester1Months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $totalSemester1 = 0;
        $totalSemester2 = 0;

        foreach ($rkasItems as $item) {
            $subtotal = (float) ($item->harga_satuan * $item->jumlah);
            $kodeRekening = $item->rekeningBelanja->kode_rekening ?? '';

            if (str_starts_with($kodeRekening, '5.2')) {
                $totalModal += $subtotal;
            } else {
                $totalOperasional += $subtotal;
            }

            if (in_array($item->bulan, $semester1Months, true)) {
                $totalSemester1 += $subtotal;
            } else {
                $totalSemester2 += $subtotal;
            }
        }

        $persenOperasional = $totalBelanja > 0 ? round(($totalOperasional / $totalBelanja) * 100, 1) : 0;
        $persenModal = $totalBelanja > 0 ? round(($totalModal / $totalBelanja) * 100, 1) : 0;
        $persenSem1 = $totalBelanja > 0 ? round(($totalSemester1 / $totalBelanja) * 100, 1) : 0;
        $persenSem2 = $totalBelanja > 0 ? round(($totalSemester2 / $totalBelanja) * 100, 1) : 0;

        // Distribusi per Rekening Belanja
        $distribusiRekening = $rkasItems->groupBy(function ($item) {
            return $item->rekeningBelanja->rincian_objek ?? 'Lain-lain';
        })->map(function ($group) {
            return $group->sum(function ($i) {
                return (float) ($i->harga_satuan * $i->jumlah);
            });
        })->sortDesc()->take(5);

        // 5 Belanja Terbesar
        $topBelanjaList = $rkasItems->sortByDesc(function ($item) {
            return (float) ($item->harga_satuan * $item->jumlah);
        })->take(5)->map(function ($i) use ($totalPagu) {
            $total = (float) ($i->harga_satuan * $i->jumlah);
            $persen = $totalPagu > 0 ? round(($total / $totalPagu) * 100, 2) : 0;

            return "- {$i->uraian} ({$i->bulan}): Rp ".number_format($total, 0, ',', '.')." ({$persen}% pagu) [{$i->jumlah} {$i->satuan} @ Rp ".number_format($i->harga_satuan, 0, ',', '.').']';
        })->implode("\n");

        // Status Telaah Saat Ini
        $totalItem = $rkasItems->count();
        $disetujuiCount = 0;
        $revisiCount = 0;
        foreach ($rkasItems as $item) {
            $latest = $item->reviews->last();
            if ($latest) {
                if ($latest->status === 'disetujui') {
                    $disetujuiCount++;
                } elseif ($latest->status === 'perlu_revisi') {
                    $revisiCount++;
                }
            }
        }
        $belumDitelaahCount = $totalItem - ($disetujuiCount + $revisiCount);

        // Evaluasi Keseimbangan
        if ($selisihPagu == 0) {
            $statusKeseimbanganText = 'Seimbang Tepat (100% Pagu Terdistribusi)';
            $statusKeseimbanganBadge = 'SEIMBANG';
        } elseif ($selisihPagu > 0) {
            $statusKeseimbanganText = 'Surplus / Sisa Pagu Belum Dialokasikan Rp '.number_format($selisihPagu, 0, ',', '.');
            $statusKeseimbanganBadge = 'SURPLUS';
        } else {
            $statusKeseimbanganText = 'Defisit / Melebihi Pagu Anggaran Rp '.number_format(abs($selisihPagu), 0, ',', '.');
            $statusKeseimbanganBadge = 'DEFISIT';
        }

        $promptData = '
DATA RINGKASAN PENGANGGARAN ('.VariantConfig::title($this->variant)." - Tahun {$penganggaran->tahun_anggaran}):
- Sekolah: ".($penganggaran->sekolah->nama_sekolah ?? 'Sekolah').'
- Jenis Dokumen: '.($isPerubahan ? 'RKAS Perubahan' : 'RKAS Murni').'
- Pagu Total Anggaran: Rp '.number_format($totalPagu, 0, ',', '.').'
- Total Belanja Direncanakan: Rp '.number_format($totalBelanja, 0, ',', '.')." ({$persenSerapan}% dari Pagu)
- Status Keseimbangan: {$statusKeseimbanganText} (Badge: {$statusKeseimbanganBadge})
- Rasio Belanja: Operasional Rp ".number_format($totalOperasional, 0, ',', '.')." ({$persenOperasional}%) vs Modal Rp ".number_format($totalModal, 0, ',', '.')." ({$persenModal}%)
- Distribusi Waktu: Semester 1 Rp ".number_format($totalSemester1, 0, ',', '.')." ({$persenSem1}%) vs Semester 2 Rp ".number_format($totalSemester2, 0, ',', '.')." ({$persenSem2}%)
- Total Baris Item Belanja: {$totalItem} item
- Status Telaah Kepala Sekolah Saat Ini: {$disetujuiCount} Disetujui, {$revisiCount} Perlu Revisi, {$belumDitelaahCount} Belum Ditelaah

5 ALOKASI BELANJA TERBESAR:
{$topBelanjaList}

5 KELOMPOK REKENING BELANJA TERBESAR:
".collect($distribusiRekening)->map(fn ($val, $key) => "- {$key}: Rp ".number_format($val, 0, ',', '.'))->implode("\n");

        $systemPrompt = 'Anda adalah Penasihat Keuangan Sekolah & Auditor Ahli Pengelolaan Dana BOSP (Kemendikbudristek RI).
Tugas Anda adalah menghasilkan Dokumen Laporan Telaah Eksekutif Resmi yang komprehensif dan mendalam untuk Kepala Sekolah sebelum menandatangani/mengesahkan dokumen RKAS.

PANDUAN STRUKTUR & OUTPUT (WAJIB DIIKUTI):
1. HASILKAN PURE HTML DENGAN KELAS TAILWIND CSS. JANGAN gunakan tag pembungkus markdown (JANGAN gunakan ```html atau ```). Mulai langsung dari elemen <div> pembuka.
2. STANDAR TIPOGRAFI & KONTRAS TINGGI (HIGH CONTRAST):
   - Judul utama: class="text-xl font-extrabold text-gray-900 dark:text-white"
   - Subjudul bagian: class="text-base font-bold text-gray-900 dark:text-white"
   - Teks isi narasi & paragraf: class="text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
   - DILARANG KERAS menggunakan teks pucat seperti "text-emerald-100", "text-emerald-200", "text-gray-200", atau "text-gray-300" pada latar terang.
   - Badge status wajib jelas dan pekat, contoh: class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200".

3. STRUKTUR LAPORAN HARUS MEMILIKI 5 BAGIAN LENGKAP DENGAN TEKS PENJELASAN NARATIF:

   BAGIAN 1: RINGKASAN EKSEKUTIF NARATIF & KARTU KPI
   - Buka dengan 1-2 paragraf narasi evaluasi umum tentang postur RKAS tahun ini (apakah dokumen sudah matang, proporsional, dan siap dievaluasi).
   - Tampilkan Grid 4 Kartu KPI kontras tinggi (<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">):
     * Kartu 1: Status Keseimbangan Anggaran (Tampilkan status SEIMBANG / SURPLUS / DEFISIT dengan badge tegas dan nominal selisih).
     * Kartu 2: Serapan Pagu (Total Belanja vs Pagu & Persentase serapan).
     * Kartu 3: Rasio Belanja (Operasional % vs Modal % & Semester 1 % vs Semester 2 %).
     * Kartu 4: Kesiapan Telaah (Progres telaah Kepala Sekolah: Disetujui, Perlu Revisi, Belum).

   BAGIAN 2: ULASAN NARATIF ANALISIS POSTUR & RASIO ANGGARAN (<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">)
   - Uraikan secara naratif mendalam:
     * Analisis mengenai rasio belanja operasional terhadap belanja modal. Apakah porsi belanja modal sudah memadai untuk investasi jangka panjang mutu pembelajaran sekolah atau terlalu minim?
     * Evaluasi distribusi waktu alokasi (Semester 1 vs Semester 2). Apakah ada penumpukan belanja di akhir tahun yang berisiko terhadap kelancaran penatausahaan kas BKU?

   BAGIAN 3: TABEL 5 BELANJA TERBESAR & ULASAN NARATIF PER BELANJA (<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">)
   - Judul bagian yang jelas dengan ikon emoji.
   - Tampilkan TABEL LENGKAP dengan tag <table>, <thead>, dan <tbody> yang tertutup sempurna berisi 5 baris belanja terbesar (Kolom: No, Uraian Belanja, Bulan Alokasi, Volume & Satuan, Total Biaya, dan Persentase terhadap Pagu).
   - DI BAWAH TABEL, berikan PARAGRAF NARASI TELAAH KRITIS per item belanja terbesar tersebut: analisis apakah biaya tersebut wajar sesuai standar harga pasar/SIPLAH, apakah volumenya rasional, dan apakah ada potensi efisiensi.

   BAGIAN 4: EVALUASI RISIKO KRITIS & KEPATUHAN REGULASI (<div class="rounded-xl border p-5 mb-6 ...">)
   - Kotak peringatan terstruktur dengan latar kontekstual (misal border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-700).
   - Uraikan secara naratif risiko temuan audit (Inspektorat daerah / BPK), kepatuhan juknis BOSP terbaru, dan rambu-rambu larangan belanja.

   BAGIAN 5: REKOMENDASI TINDAKAN & INSTRUKSI RESMI KEPALA SEKOLAH (<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">)
   - Berikan arahan tertulis resmi dari Kepala Sekolah: kesimpulan apakah RKAS sudah layak disetujui/disahkan atau memerlukan revisi tertentu terlebih dahulu.
   - Buat checklist instruksi konkrit yang harus diverifikasi Bendahara sebelum pengesahan final.

Gunakan bahasa Indonesia resmi, analitis, berwibawa, lugas, dan solutif.';

        try {
            $messages = [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => "Berikut adalah data RKAS untuk ditelaah:\n\n{$promptData}\n\nMohon susun Dokumen Laporan Telaah Eksekutif Kepala Sekolah secara lengkap dan mendalam."],
            ];

            $response = $this->deepSeekService->callChat($apiKey, $messages, [
                'model' => $user->deepseek_model_chat ?: 'deepseek-chat',
                'max_tokens' => 5000,
            ]);

            if (! ($response['success'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => $response['message'] ?? 'Gagal menghubungi layanan DeepSeek AI.',
                ], 500);
            }

            $analysisContent = $response['content'] ?? '';
            // Bersihkan pembungkus markdown jika ada
            $analysisContent = preg_replace('/^```(?:html)?\s*/i', '', trim($analysisContent));
            $analysisContent = preg_replace('/\s*```$/i', '', $analysisContent);

            return response()->json([
                'success' => true,
                'analysis' => $analysisContent,
                'summary' => [
                    'total_pagu' => $totalPagu,
                    'total_belanja' => $totalBelanja,
                    'selisih' => $selisihPagu,
                    'persen_serapan' => $persenSerapan,
                    'total_operasional' => $totalOperasional,
                    'total_modal' => $totalModal,
                    'total_semester_1' => $totalSemester1,
                    'total_semester_2' => $totalSemester2,
                    'total_items' => $totalItem,
                    'disetujui' => $disetujuiCount,
                    'perlu_revisi' => $revisiCount,
                    'belum_ditelaah' => $belumDitelaahCount,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('RkasAiReviewController error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menganalisis anggaran: '.$e->getMessage(),
            ], 500);
        }
    }
}
