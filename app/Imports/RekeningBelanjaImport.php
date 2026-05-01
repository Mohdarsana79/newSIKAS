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
use Illuminate\Validation\Rule;

class RekeningBelanjaImport implements
    ToModel,
    WithStartRow,
    WithValidation,
    SkipsOnFailure,
    SkipsEmptyRows
{
    use \Maatwebsite\Excel\Concerns\SkipsFailures;

    private int $rowCount = 0;
    private array $duplicates = [];

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

        $parseTax = function($val) {
            $val = strtoupper(trim(strval($val ?? '')));
            return in_array($val, ['TRUE', '1', 'YA', 'Y']);
        };

        $is_ppn = isset($row[3]) ? $parseTax($row[3]) : false;
        $is_pph21 = isset($row[4]) ? $parseTax($row[4]) : false;
        $is_pph22 = isset($row[5]) ? $parseTax($row[5]) : false;
        $is_pph23 = isset($row[6]) ? $parseTax($row[6]) : false;
        $is_pph4 = isset($row[7]) ? $parseTax($row[7]) : false;

        // Cek duplikasi kode
        if (RekeningBelanja::query()->where('kode_rekening', $kode)->exists()) {
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
            'is_ppn' => $is_ppn,
            'is_pph21' => $is_pph21,
            'is_pph22' => $is_pph22,
            'is_pph23' => $is_pph23,
            'is_pph4' => $is_pph4,
        ]);
    }

    public function rules(): array
    {
        return [
            '0' => 'required|string|max:20|unique:rekening_belanjas,kode_rekening',
            '1' => 'required|string|max:255',
            '2' => ['required', 'string', Rule::in(['Operasi', 'Modal Peralatan dan Mesin', 'Modal Jalan, Jaringan, dan Irigasi', 'Modal Aset Tetap Lainnya'])],
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
