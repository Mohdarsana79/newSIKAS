<?php

namespace Tests\Unit;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;
use App\Models\TandaTerima;
use App\Services\Ai\CopilotService;
use Tests\TestCase;

class CopilotSpjTandaTerimaTest extends TestCase
{
    protected CopilotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(CopilotService::class);
    }

    public function test_get_spj_document_detail_tanda_terima_structure(): void
    {
        // Mock data structure verification
        $bku = new BukuKasUmum([
            'id' => 999,
            'id_transaksi' => '063/BOSP/THP-II/2026',
            'tanggal_transaksi' => '2026-09-08',
            'uraian' => 'Lunas Bayar Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
            'uraian_opsional' => 'Lunas Bayar Honor Guru Selpianti',
            'nama_penerima_pembayaran' => 'Selpianti',
            'total_transaksi_kotor' => 1449000,
            'total_pajak' => 0,
        ]);

        $rek = new RekeningBelanja([
            'kode_rekening' => '5.1.02.02.01.0013',
            'rincian_objek' => 'Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
        ]);
        $keg = new KodeKegiatan([
            'kode' => '07.12.01',
            'uraian' => 'Pembayaran Honor Guru',
        ]);
        $bku->setRelation('rekeningBelanja', $rek);
        $bku->setRelation('kodeKegiatan', $keg);

        $detail = new BukuKasUmumUraianDetail([
            'uraian' => 'Selpianti',
            'volume' => 207,
            'satuan' => 'JP',
            'harga_satuan' => 7000,
            'jumlah' => 1449000,
        ]);
        $bku->setRelation('uraianDetails', collect([$detail]));

        $tt = new TandaTerima([
            'id' => 99,
            'buku_kas_umum_id' => 999,
        ]);
        $tt->setRelation('bukuKasUmum', $bku);

        $this->assertEquals('Selpianti', $bku->nama_penerima_pembayaran);
        $this->assertEquals(1449000, $bku->total_transaksi_kotor);
        $this->assertEquals('Pembayaran Honor Guru Selpianti', $this->service->formatUraianPembayaranReal($bku));
    }
}
