<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Config\VariantConfig;

class RekapitulasiController extends Controller
{
    public function index(Request $request)
    {
        $tahun = $request->input('tahun');
        $bulan = $request->input('bulan');

        return $this->renderVariant('Penatausahaan/Rekapitulasi', [
            'tahun' => $tahun,
            'bulan' => $bulan,
        ]);
    }

    protected function renderVariant($component, $props = [])
    {
        $var = $this->variant ?? (request()->route() ? (request()->route()->parameter('variant') ?? request()->get('_variant', 'reguler')) : 'reguler');
        if (app()->bound('variant')) {
            $var = app('variant');
        }
        return \Inertia\Inertia::render(VariantConfig::pagePrefix($var) . $component, array_merge($props, [
            'variant' => $var,
            'routePrefix' => VariantConfig::routePrefix($var)
        ]));
    }
}
