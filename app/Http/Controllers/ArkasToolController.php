<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class ArkasToolController extends Controller
{
    public function index()
    {
        return Inertia::render('ArkasTools/Index');
    }

    public function search(Request $request)
    {
        $keyword = $request->input('keyword');
        $year = $request->input('year', '2026');

        if ($keyword !== '__ALL__' && (empty($keyword) || strlen($keyword) < 3)) {
            return response()->json(['status' => 'error', 'message' => 'Keyword minimal 3 karakter']);
        }

        $pythonPath = storage_path('app/arkas_engine/python.exe');
        $scriptPath = storage_path('app/arkas_engine/query.py');
        
        if (!file_exists($pythonPath) || !file_exists($scriptPath)) {
             return response()->json(['status' => 'error', 'message' => 'Arkas Engine tidak ditemukan.']);
        }


        $env = $_SERVER;
        unset($env['OPENSSL_CONF']);
        
        // OpenSSL & SQLCipher di Windows sangat bergantung pada environment variable dasar sistem.
        // Saat dijalankan via web server (Laragon/Apache), variable ini sering terhapus/hilang.
        $env['SystemRoot'] = $env['SystemRoot'] ?? 'C:\\Windows';
        $env['SystemDrive'] = $env['SystemDrive'] ?? 'C:';
        $env['USERPROFILE'] = $env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi';
        $env['APPDATA'] = $env['APPDATA'] ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming';
        $env['LOCALAPPDATA'] = $env['LOCALAPPDATA'] ?? 'C:\\Users\\Digitalisasi\\AppData\\Local';
        $env['TEMP'] = $env['TEMP'] ?? 'C:\\Users\\Digitalisasi\\AppData\\Local\\Temp';
        $env['TMP'] = $env['TMP'] ?? 'C:\\Users\\Digitalisasi\\AppData\\Local\\Temp';

        $process = new Process([$pythonPath, $scriptPath, $keyword, $year], null, $env);
        $process->setTimeout(120);
        $process->run();

        if (!$process->isSuccessful()) {
             return response()->json(['status' => 'error', 'message' => 'Gagal mengeksekusi engine ARKAS. ' . $process->getErrorOutput()]);
        }

        $output = $process->getOutput();
        $result = json_decode($output, true);

        if (isset($result['error'])) {
            return response()->json(['status' => 'error', 'message' => $result['error']]);
        }

        return response()->json(['status' => 'success', 'data' => $result['data'] ?? []]);
    }
}
