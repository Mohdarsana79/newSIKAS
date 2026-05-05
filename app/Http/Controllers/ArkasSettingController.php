<?php
 
namespace App\Http\Controllers;
 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Artisan;
 
class ArkasSettingController extends Controller
{
    /**
     * Mengambil path arkas saat ini dari .env
     */
    public function getPath()
    {
        return response()->json([
            'path' => env('ARKAS_DB_PATH', '')
        ]);
    }
 
    /**
     * Menyimpan path arkas baru ke .env
     */
    public function savePath(Request $request)
    {
        $request->validate([
            'path' => 'nullable|string'
        ]);
 
        // Trim quotes, whitespace, and convert backslashes to forward slashes
        $path = trim($request->input('path', ''), '"\' ');
        $path = str_replace('\\', '/', $path);
        
        try {
            $this->updateDotEnv('ARKAS_DB_PATH', $path);
            
            // Opsional: Jika user mengalami masalah cache, mereka bisa clear manual.
            // Namun kita tidak jalankan Artisan::call('config:clear') di sini 
            // untuk menghindari server restart yang memicu error koneksi di browser.
 
            return response()->json([
                'status' => 'success',
                'message' => 'Path Arkas berhasil diperbarui.',
                'path' => $path
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui file konfigurasi: ' . $e->getMessage()
            ], 500);
        }
    }
 
    /**
     * Helper untuk memperbarui nilai di file .env secara aman
     */
    protected function updateDotEnv($key, $value)
    {
        $envPath = base_path('.env');
 
        if (!File::exists($envPath)) {
            return;
        }
 
        $lines = file($envPath, FILE_IGNORE_NEW_LINES);
        $keyExists = false;
        
        // Bungkus dengan tanda petik jika mengandung spasi
        if (strpos($value, ' ') !== false) {
            $value = '"' . $value . '"';
        }
 
        foreach ($lines as $i => $line) {
            // Cari baris yang dimulai dengan KEY=
            if (strpos($line, "{$key}=") === 0) {
                $lines[$i] = "{$key}={$value}";
                $keyExists = true;
                break;
            }
        }
 
        if (!$keyExists) {
            $lines[] = "{$key}={$value}";
        }
 
        File::put($envPath, implode("\n", $lines) . "\n");
    }
}
