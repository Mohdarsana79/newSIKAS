<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

class BkpUmumExport implements FromView, ShouldAutoSize, WithTitle
{
    protected $reportData;

    public function __construct($reportData)
    {
        $this->reportData = $reportData;
    }

    public function view(): View
    {
        return view('laporan.bkp_umum_excel', [
            'reportData' => $this->reportData
        ]);
    }

    public function title(): string
    {
        return 'BKP Umum';
    }
}
