<?php

namespace Tests\Unit;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Services\Ai\CopilotService;
use Tests\TestCase;

class CopilotSpjUraianRealTest extends TestCase
{
    protected CopilotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(CopilotService::class);
    }

    public function test_format_uraian_multi_item_barang(): void
    {
        $bku = new BukuKasUmum([
            'uraian' => 'Lunas Bayar Belanja Pemeliharaan Bangunan Gedung',
            'uraian_opsional' => 'Lunas Bayar Belanja Pemeliharaan Prasarana Lahan, Bangunan, dan Ruang',
        ]);

        $detail1 = new BukuKasUmumUraianDetail(['uraian' => 'Kuas Biasa']);
        $detail2 = new BukuKasUmumUraianDetail(['uraian' => 'Cat Tembok Nippon Paint']);
        $detail3 = new BukuKasUmumUraianDetail(['uraian' => 'Kuas Roll']);

        $bku->setRelation('uraianDetails', collect([$detail1, $detail2, $detail3]));

        $result = $this->service->formatUraianPembayaranReal($bku);

        $this->assertEquals('Pembayaran Belanja Kuas Biasa, Cat Tembok Nippon Paint, Kuas Roll', $result);
    }

    public function test_format_uraian_single_item_barang(): void
    {
        $bku = new BukuKasUmum([
            'uraian' => 'Lunas Bayar Belanja Bahan-Bahan Kimia',
            'uraian_opsional' => 'Lunas Bayar Belanja Racun Rumput',
        ]);

        $detail1 = new BukuKasUmumUraianDetail(['uraian' => 'Racun Rumput']);
        $bku->setRelation('uraianDetails', collect([$detail1]));

        $result = $this->service->formatUraianPembayaranReal($bku);

        $this->assertEquals('Pembayaran Belanja Racun Rumput', $result);
    }

    public function test_format_uraian_honorarium(): void
    {
        $bku = new BukuKasUmum([
            'uraian' => 'Lunas Bayar Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
            'uraian_opsional' => 'Lunas Bayar Honor Guru Selpianti',
        ]);

        $detail1 = new BukuKasUmumUraianDetail(['uraian' => 'Selpianti']);
        $bku->setRelation('uraianDetails', collect([$detail1]));

        $result = $this->service->formatUraianPembayaranReal($bku);

        $this->assertEquals('Pembayaran Honor Guru Selpianti', $result);
    }

    public function test_format_uraian_fallback_without_details(): void
    {
        $bku = new BukuKasUmum([
            'uraian' => 'Lunas Bayar Belanja Operasional Kantor',
            'uraian_opsional' => 'Lunas Bayar Belanja Kebersihan',
        ]);
        $bku->setRelation('uraianDetails', collect([]));

        $result = $this->service->formatUraianPembayaranReal($bku);

        $this->assertEquals('Pembayaran Belanja Kebersihan', $result);
    }

    public function test_format_uraian_null_or_empty(): void
    {
        $this->assertEquals('-', $this->service->formatUraianPembayaranReal(null));

        $bku = new BukuKasUmum([]);
        $this->assertEquals('Pembayaran Belanja Kas', $this->service->formatUraianPembayaranReal($bku));
    }
}
