<?php

namespace Database\Seeders;

use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class ReferensiKodeSeeder extends Seeder
{
    /**
     * Jalankan seeder untuk mengisi 313 Kode Kegiatan dan 280 Rekening Belanja standar ARKAS.
     */
    public function run(): void
    {
        $this->seedKegiatan();
        $this->seedRekening();
    }

    protected function seedKegiatan(): void
    {
        $jsonPath = database_path('data/arkas_kode_kegiatan.json');
        if (! File::exists($jsonPath)) {
            $this->command?->warn("File {$jsonPath} tidak ditemukan, melewati seeding kegiatan.");

            return;
        }

        $tahun = 2026;
        $items = json_decode(File::get($jsonPath), true) ?? [];
        $existing = KodeKegiatan::forYear($tahun)->pluck('id', 'kode')->toArray();
        $inserts = [];

        foreach ($items as $item) {
            $kode = $item['id_kode'];
            if (! isset($existing[$kode])) {
                $inserts[] = [
                    'tahun' => $tahun,
                    'kode' => $kode,
                    'program' => $item['program'] ?? '',
                    'sub_program' => $item['sub_program'] ?? '',
                    'uraian' => $item['uraian_kode'] ?? '',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            } else {
                KodeKegiatan::forYear($tahun)->where('kode', $kode)->update([
                    'program' => $item['program'] ?? '',
                    'sub_program' => $item['sub_program'] ?? '',
                    'uraian' => $item['uraian_kode'] ?? '',
                    'updated_at' => now(),
                ]);
            }
        }

        if (! empty($inserts)) {
            foreach (array_chunk($inserts, 200) as $chunk) {
                KodeKegiatan::insert($chunk);
            }
        }

        $total = KodeKegiatan::forYear($tahun)->count();
        $this->command?->info("Kode Kegiatan ARKAS ({$tahun}) selesai di-seed. Total: {$total} data.");
    }

    protected function seedRekening(): void
    {
        $jsonPath = database_path('data/arkas_rekening_belanja.json');
        if (! File::exists($jsonPath)) {
            $this->command?->warn("File {$jsonPath} tidak ditemukan, melewati seeding rekening.");

            return;
        }

        $tahun = 2026;
        $items = json_decode(File::get($jsonPath), true) ?? [];
        $existing = RekeningBelanja::forYear($tahun)->pluck('id', 'kode_rekening')->toArray();
        $inserts = [];

        foreach ($items as $item) {
            $kode = $item['kode_rekening'];
            $prefix = substr($kode, 0, 6);
            if ($prefix === '5.2.02') {
                $kategori = 'Modal Peralatan dan Mesin';
            } elseif ($prefix === '5.2.04') {
                $kategori = 'Modal Jalan, Jaringan, dan Irigasi';
            } elseif ($prefix === '5.2.05') {
                $kategori = 'Modal Aset Tetap Lainnya';
            } else {
                $kategori = 'Operasi';
            }

            $payload = [
                'tahun' => $tahun,
                'kode_rekening' => $kode,
                'rincian_objek' => $item['rekening'] ?? '',
                'kategori' => $kategori,
                'is_ppn' => ! empty($item['is_ppn']) ? 1 : 0,
                'is_pph21' => ! empty($item['is_pph21']) ? 1 : 0,
                'is_pph22' => ! empty($item['is_pph22']) ? 1 : 0,
                'is_pph23' => ! empty($item['is_pph23']) ? 1 : 0,
                'is_pph4' => ! empty($item['is_pph4']) ? 1 : 0,
            ];

            if (! isset($existing[$kode])) {
                $payload['created_at'] = now();
                $payload['updated_at'] = now();
                $inserts[] = $payload;
            } else {
                $payload['updated_at'] = now();
                RekeningBelanja::forYear($tahun)->where('kode_rekening', $kode)->update($payload);
            }
        }

        if (! empty($inserts)) {
            foreach (array_chunk($inserts, 200) as $chunk) {
                RekeningBelanja::insert($chunk);
            }
        }

        $total = RekeningBelanja::forYear($tahun)->count();
        $this->command?->info("Rekening Belanja ARKAS ({$tahun}) selesai di-seed. Total: {$total} data.");
    }
}
