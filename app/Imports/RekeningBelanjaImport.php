<?php

namespace App\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use App\Models\RekeningBelanja;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;

class RekeningBelanjaImport implements
    ToModel,
    WithStartRow,
    WithValidation,
    SkipsOnFailure,
    SkipsEmptyRows
{
    use \Maatwebsite\Excel\Concerns\SkipsFailures;

    private $rowCount = 0;
    private $duplicates = [];

    public function startRow(): int
    {
        return 2; // Mulai dari baris ke-2 (abaikan judul dan header)
    }

    public function model(array $row)
    {
        // Skip jika baris kosong
        if (empty($row[0]) && empty($row[1])) {
            return null;
        }

        $kode = Str::trim($row[0]);
        $rincianObjek = Str::trim($row[1]);
        $kategori = Str::trim($row[2]);

        // Cek duplikasi kode
        if (RekeningBelanja::where('kode_rekening', $kode)->exists()) {
            $this->duplicates[] = [
                'row' => $this->rowCount + $this->startRow(),
                'kode_rekening' => $kode,
                'rincian_objek' => $rincianObjek,
                'kategori' => $kategori,
            ];
            return null;
        }

        $this->rowCount++;

        return new RekeningBelanja([
            'kode_rekening' => $kode,
            'rincian_objek' => $rincianObjek,
            'kategori' => $kategori,
        ]);
    }

    public function rules(): array
    {
        return [
            '0' => 'required|string|max:20|unique:rekening_belanjas,kode_rekening',
            '1' => 'required|string|max:255',
            '2' => 'required|string|in:Modal,Operasi',
        ];
    }

    public function customValidationMessages()
    {
        return [
            '0.unique' => 'Kode :input sudah ada pada baris :attribute',
            '0.required' => 'Kolom Kode harus diisi pada baris :attribute',
            '1.required' => 'Kolom Rincian Objek harus diisi pada baris :attribute',
            '2.required' => 'Kolom Kategori harus diisi pada baris :attribute',
        ];
    }

    public function getRowCount(): int
    {
        return $this->rowCount;
    }

    public function getDuplicates(): array
    {
        return $this->duplicates;
    }
}
