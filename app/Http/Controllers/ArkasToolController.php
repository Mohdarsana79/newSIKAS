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

        $appdata = $env['APPDATA'] ?? null;
        $userprofile = $env['USERPROFILE'] ?? null;

        if (empty($appdata)) {
            $appdata = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('ApplicationData')\""));
        }

        if (empty($userprofile)) {
            $userprofile = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('UserProfile')\""));
        }

        if (empty($userprofile) && !empty($appdata)) {
            $userprofile = dirname(dirname($appdata));
        }

        if (empty($appdata) && !empty($userprofile)) {
            $appdata = $userprofile . '\\AppData\\Roaming';
        }

        // Pastikan path dasar Windows tersedia (Sangat Penting untuk Python & SQLCipher)
        $env['SystemRoot']    = $env['SystemRoot']    ?? 'C:\\Windows';
        $env['SystemDrive']   = $env['SystemDrive']   ?? 'C:';
        $env['USERPROFILE']   = !empty($userprofile) ? $userprofile : ($env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi');
        $env['APPDATA']       = !empty($appdata)     ? $appdata     : ($env['APPDATA']     ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming');
        $env['LOCALAPPDATA']  = $env['LOCALAPPDATA']  ?? (empty($userprofile) ? '' : $userprofile . '\\AppData\\Local');
        $env['TEMP']          = $env['TEMP']           ?? (empty($userprofile) ? '' : $userprofile . '\\AppData\\Local\\Temp');
        $env['TMP']           = $env['TMP']            ?? $env['TEMP'];

        Log::info('ArkasEngine ENV Final', [
            'APPDATA'    => $env['APPDATA'],
            'USERPROFILE'=> $env['USERPROFILE'],
            'SystemDrive'=> $env['SystemDrive']
        ]);

        $dbPathManual = env('ARKAS_DB_PATH', '');
        // Pastikan tidak ada spasi di awal/akhir atau tanda petik ganda, dan gunakan forward slash
        $dbPathManual = trim($dbPathManual, '"\' ');
        $dbPathManual = str_replace('\\', '/', $dbPathManual);

        $process = new Process([$pythonPath, $scriptPath, $keyword, $year, $dbPathManual], null, $env);
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
