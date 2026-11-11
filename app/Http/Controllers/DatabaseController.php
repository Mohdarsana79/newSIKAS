<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use ZipArchive;

class DatabaseController extends Controller
{
    public function index()
    {
        $backupFiles = $this->getBackupFiles();

        // Hitung total data dalam database
        $totalRecords = 0;
        $dbSize = 0;
        $dbName = config('database.connections.pgsql.database');

        try {
            // Hitung total record
            $tables = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            foreach ($tables as $table) {
                try {
                    $totalRecords += DB::table($table->table_name)->count();
                } catch (Exception $e) {
                    // Ignore errors for tables that might be tricky to count
                }
            }

            // Hitung ukuran database
            $dbSizeResult = DB::selectOne("SELECT pg_database_size('$dbName') as size");
            $dbSize = $dbSizeResult->size;
        } catch (Exception $e) {
            Log::error('Error counting database records:', ['error' => $e->getMessage()]);
        }

        // Hitung ukuran total backup
        $totalBackupSize = 0;
        foreach ($backupFiles as $file) {
            $totalBackupSize += filesize($file['path']); // Logic untuk path perlu dicek ulang jika pakai Storage
        }

        // Hitung persentase kapasitas (asumsikan 5GB)
        $maxStorage = 5368709120; // 5GB in bytes
        $storagePercentage = round(($totalBackupSize / $maxStorage) * 100, 2);

        return Inertia::render('Backup/Index', [
            'backupFiles' => $backupFiles,
            'stats' => [
                'totalRecords' => $totalRecords,
                'dbSize' => $this->formatBytes($dbSize),
                'totalBackupSize' => $this->formatBytes($totalBackupSize),
                'storagePercentage' => $storagePercentage,
                'lastBackupDate' => count($backupFiles) > 0 ? $backupFiles[0]['created_at'] : '-',
            ],
            'currentNpsn' => env('APP_NPSN_CODE', ''),
        ]);
    }

    /**
     * Validasi password user sebelum reset database
     */
    public function validatePassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        try {
            $user = Auth::user();

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                ], 401);
            }

            if (! Hash::check($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Password yang Anda masukkan salah',
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Password valid',
            ]);
        } catch (Exception $e) {
            Log::error('Password validation error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat validasi password',
            ], 500);
        }
    }

    /**
     * Reset database - menghapus semua data KECUALI tabel users
     */
    public function reset(Request $request)
    {
        try {
            Log::info('Starting database reset process (preserve users) - User: '.Auth::id());

            // Mulai transaksi database
            DB::beginTransaction();

            // Dapatkan semua tabel dalam database
            $tables = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");

            // Disable foreign key checks untuk PostgreSQL
            DB::statement('SET session_replication_role = replica;');

            // Daftar tabel yang akan di-skip (tidak direset)
            $excludedTables = ['users', 'migrations', 'personal_access_tokens', 'password_reset_tokens', 'failed_jobs', 'sessions'];

            // Hapus data dari semua tabel kecuali yang dikecualikan
            foreach ($tables as $table) {
                $tableName = $table->table_name;

                // Skip tabel yang dikecualikan
                if (in_array($tableName, $excludedTables)) {
                    Log::info("Skipped table: {$tableName}");

                    continue;
                }

                try {
                    // Truncate table dengan restart identity untuk reset auto increment
                    DB::statement("TRUNCATE TABLE \"{$tableName}\" RESTART IDENTITY CASCADE");
                    Log::info("Truncated table: {$tableName}");
                } catch (Exception $e) {
                    Log::warning("Failed to truncate table {$tableName}: ".$e->getMessage());
                    // Jika truncate gagal, coba delete
                    try {
                        DB::table($tableName)->delete();
                        Log::info("Deleted all records from table: {$tableName}");
                    } catch (Exception $e2) {
                        Log::error("Failed to delete from table {$tableName}: ".$e2->getMessage());

                        // Lewati tabel yang bermasalah, lanjut ke tabel berikutnya
                        continue;
                    }
                }
            }

            // Re-enable foreign key checks
            DB::statement('SET session_replication_role = DEFAULT;');

            // Commit transaksi SEBELUM reset sequences (agar sequences bisa dihandle terpisah)
            DB::commit();

            // Reset sequence untuk tabel yang penting (kecuali users) - TANPA TRANSACTION
            $this->resetSequences();

            Log::info('Database reset completed successfully (users preserved)');

            // Return response sukses - TIDAK logout user
            return response()->json([
                'success' => true,
                'message' => 'Database berhasil direset. Semua data telah dihapus kecuali data user.',
                'redirect_url' => url('/dashboard'),
            ], 200);
        } catch (Exception $e) {
            // Rollback transaksi jika ada error
            DB::rollback();

            Log::error('Database reset failed: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Reset database gagal: '.$e->getMessage(),
            ], 500);
        }
    }

    private function resetSequences()
    {
        // Dapatkan semua sequence yang ada
        $existingSequences = DB::select("
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    ");

        $existingSequenceNames = array_map(function ($seq) {
            return $seq->sequence_name;
        }, $existingSequences);

        // Reset SEMUA sequences yang ditemukan
        foreach ($existingSequenceNames as $sequence) {
            try {
                // Dapatkan nama tabel dari sequence
                $tableName = str_replace('_id_seq', '', $sequence);

                // Skip jika tabel user/excluded
                if (in_array($tableName, ['users', 'migrations'])) {
                    continue;
                }

                // Reset sequence berdasarkan MAX(id) dari tabel
                $maxId = DB::table($tableName)->max('id') ?? 0;
                $newStart = $maxId + 1;

                DB::statement("SELECT setval('$sequence', $newStart, false);");
            } catch (Exception $e) {
                Log::warning("Failed to reset sequence {$sequence}: ".$e->getMessage());

                continue;
            }
        }
    }

    /**
     * Melakukan backup database PostgreSQL dan seluruh berkas fisik unggahan (storage)
     */
    public function backup(Request $request)
    {
        $request->validate([
            'backup_name' => 'nullable|string|max:255|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        @ini_set('max_execution_time', '600');
        @ini_set('memory_limit', '1024M');

        $tempDir = storage_path('app/temp/backup_'.uniqid());
        $sqlTempFile = $tempDir.'/database.sql';

        try {
            $dbConfig = Config::get('database.connections.pgsql');

            // Membuat nama file backup
            $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
            $backupBaseName = $request->backup_name ? $request->backup_name.'_'.$timestamp : 'backup_'.$timestamp;
            $fileName = $backupBaseName.'.rsv';

            // Path untuk menyimpan backup
            $backupPath = storage_path('app/backups');
            if (! file_exists($backupPath)) {
                mkdir($backupPath, 0755, true);
            }

            if (! file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $fullPath = $backupPath.'/'.$fileName;

            // Gunakan executable pg_dump
            $pgDumpPath = $this->getPostgresBinaryPath('pg_dump');
            if (! file_exists($pgDumpPath)) {
                return back()->with('error', "Executable pg_dump tidak ditemukan di server: {$pgDumpPath}. Pastikan path PostgreSQL terkonfigurasi dengan benar.");
            }

            // Dump database ke file temporary database.sql
            $command = sprintf(
                '"%s" -h %s -p %s -U %s -d %s -f %s --no-owner --no-privileges --clean --if-exists',
                $pgDumpPath,
                escapeshellarg($dbConfig['host']),
                escapeshellarg($dbConfig['port']),
                escapeshellarg($dbConfig['username']),
                escapeshellarg($dbConfig['database']),
                escapeshellarg($sqlTempFile)
            );

            // Set environment variable untuk password
            putenv('PGPASSWORD='.$dbConfig['password']);

            // Jalankan perintah backup
            $output = [];
            $returnVar = 0;
            exec($command.' 2>&1', $output, $returnVar);

            // Hapus environment variable setelah digunakan
            putenv('PGPASSWORD');

            // Periksa hasil dump
            $sqlExists = file_exists($sqlTempFile);
            $sqlSize = $sqlExists ? filesize($sqlTempFile) : 0;

            if ($returnVar !== 0 || ! $sqlExists || $sqlSize == 0) {
                // If failed, try without --clean --if-exists (in case pg_dump version issues)
                if ($returnVar !== 0) {
                    Log::warning('Backup with --clean failed, retrying without cleanse options. Error: '.implode("\n", $output));
                    $commandRetry = sprintf(
                        '"%s" -h %s -p %s -U %s -d %s -f %s --no-owner --no-privileges',
                        $pgDumpPath,
                        escapeshellarg($dbConfig['host']),
                        escapeshellarg($dbConfig['port']),
                        escapeshellarg($dbConfig['username']),
                        escapeshellarg($dbConfig['database']),
                        escapeshellarg($sqlTempFile)
                    );
                    putenv('PGPASSWORD='.$dbConfig['password']);
                    $output = [];
                    $returnVar = 0;
                    exec($commandRetry.' 2>&1', $output, $returnVar);
                    putenv('PGPASSWORD');
                }
            }

            // Re-check after retry
            $sqlExists = file_exists($sqlTempFile);
            $sqlSize = $sqlExists ? filesize($sqlTempFile) : 0;

            if ($returnVar !== 0 || ! $sqlExists || $sqlSize == 0) {
                $errorMsg = $returnVar !== 0 ? implode("\n", $output) : (! $sqlExists ? 'File dump database tidak terbuat' : 'File dump database kosong');
                Log::error('Backup Failed during pg_dump:', ['error' => $errorMsg]);

                return back()->with('error', 'Backup database gagal: '.$errorMsg);
            }

            // Inisialisasi ZipArchive untuk mengemas database.sql dan file storage pengguna
            $zip = new ZipArchive;
            if ($zip->open($fullPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                return back()->with('error', 'Gagal membuat file arsip zip untuk backup: '.$fileName);
            }

            // 1. Masukkan database.sql
            $zip->addFile($sqlTempFile, 'database.sql');

            // 2. Masukkan file storage public (kop surat, logo, templates xlsx, dll)
            $publicFilesCount = $this->addFolderToZip($zip, storage_path('app/public'), 'storage/public');

            // 3. Masukkan file storage private (sk_surat: templates docx, archives doc/pdf, dll)
            $privateFilesCount = $this->addFolderToZip($zip, storage_path('app/private'), 'storage/private', ['public']);

            $totalFilesCount = $publicFilesCount + $privateFilesCount;

            // 4. Masukkan manifest.json
            $manifest = [
                'version' => '1.0',
                'format' => 'all-in-one',
                'app' => config('app.name', 'SIKAS'),
                'app_npsn' => env('APP_NPSN_CODE', ''),
                'created_at' => Carbon::now()->toIso8601String(),
                'has_database' => true,
                'has_storage' => true,
                'storage_files_count' => $totalFilesCount,
            ];
            $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            $zip->close();

            Log::info("Backup successful: {$fileName} (DB + {$totalFilesCount} storage files)");

            return back()->with('success', "Backup database & berkas berhasil dibuat: {$fileName} (Database + {$totalFilesCount} berkas unggahan)");
        } catch (Exception $e) {
            Log::error('Backup Exception:', ['error' => $e->getMessage()]);

            return back()->with('error', 'Backup gagal: '.$e->getMessage());
        } finally {
            if (file_exists($sqlTempFile)) {
                @unlink($sqlTempFile);
            }
            if (is_dir($tempDir)) {
                @rmdir($tempDir);
            }
        }
    }

    /**
     * Melakukan restore database PostgreSQL dan berkas fisik (storage)
     */
    public function restore(Request $request)
    {
        $request->validate([
            // Izinkan ukuran hingga 2 GB (2097152 KB)
            'backup_file' => 'required|file|extensions:rsv,btb,sql|max:2097152',
            'restore_id' => 'nullable|string|max:100',
        ]);

        $restoreId = $request->input('restore_id');
        $this->setRestoreProgress($restoreId, 10, 'Memvalidasi berkas & kesiapan sistem...', 'processing');

        @ini_set('max_execution_time', '600');
        @ini_set('memory_limit', '1024M');

        $tempDir = storage_path('app/temp/restore_'.uniqid());
        $extractedSqlPath = null;

        try {
            $dbConfig = Config::get('database.connections.pgsql');

            // Step 1: Validasi File Backup & Path psql SEBELUM memodifikasi database
            $psqlPath = $this->getPostgresBinaryPath('psql');
            if (! file_exists($psqlPath)) {
                $this->setRestoreProgress($restoreId, 100, "Executable psql tidak ditemukan di server: {$psqlPath}", 'error');

                return back()->with('error', "Executable psql tidak ditemukan di server: {$psqlPath}. Pastikan path PostgreSQL terkonfigurasi dengan benar.");
            }

            $file = $request->file('backup_file');
            if (! $file || ! $file->isValid()) {
                $this->setRestoreProgress($restoreId, 100, 'Upload file backup tidak valid.', 'error');

                return back()->with('error', 'Upload file backup tidak valid.');
            }

            $uploadedPath = $file->getRealPath();
            if (! file_exists($uploadedPath) || filesize($uploadedPath) === 0) {
                $this->setRestoreProgress($restoreId, 100, 'File backup yang diunggah kosong atau tidak terbaca.', 'error');

                return back()->with('error', 'File backup yang diunggah kosong atau tidak terbaca.');
            }

            $totalFilesRestored = 0;
            $isZipPackage = false;

            $this->setRestoreProgress($restoreId, 20, 'Memeriksa format paket cadangan (.rsv)...', 'processing');

            // Periksa apakah berkas berupa ZIP archive
            $zip = new ZipArchive;
            if ($zip->open($uploadedPath) === true) {
                $isZipPackage = true;

                if (! file_exists($tempDir)) {
                    mkdir($tempDir, 0755, true);
                }

                // Cek apakah terdapat database.sql dalam arsip
                if ($zip->locateName('database.sql') === false) {
                    $zip->close();
                    $this->setRestoreProgress($restoreId, 100, 'Format arsip backup tidak valid: berkas database.sql tidak ditemukan di dalam paket.', 'error');

                    return back()->with('error', 'Format arsip backup tidak valid: berkas database.sql tidak ditemukan di dalam paket.');
                }

                $this->setRestoreProgress($restoreId, 30, 'Mengekstrak paket arsip & data basis data...', 'processing');

                $extractedSqlPath = $tempDir.'/database.sql';
                if (! $zip->extractTo($tempDir, ['database.sql'])) {
                    $zip->close();
                    throw new Exception('Gagal mengekstrak database.sql dari arsip backup.');
                }

                // Ekstrak berkas storage publik & privat (Merge & Overwrite)
                $this->setRestoreProgress($restoreId, 38, 'Mengekstrak berkas fisik media...', 'processing');
                $publicRestored = $this->extractZipSubdir($zip, 'storage/public', storage_path('app/public'));
                $privateRestored = $this->extractZipSubdir($zip, 'storage/private', storage_path('app/private'));
                $totalFilesRestored = $publicRestored + $privateRestored;

                $zip->close();
                $sqlPathToRestore = $extractedSqlPath;
            } else {
                // File adalah file SQL mentah format lama (backward compatibility)
                $sqlPathToRestore = $uploadedPath;
            }

            // Step 2: Persiapan Database & Restore Data
            try {
                $this->setRestoreProgress($restoreId, 45, 'Membersihkan & menyiapkan skema database baru...', 'processing');

                // Bersihkan schema public untuk restore fresh
                DB::statement('DROP SCHEMA public CASCADE');
                DB::statement('CREATE SCHEMA public');
                DB::statement('GRANT ALL ON SCHEMA public TO public');

                // Step 3: Jalankan psql restore
                $this->setRestoreProgress($restoreId, 55, 'Mengimpor tabel & data transaksi ke PostgreSQL...', 'processing');
                putenv('PGPASSWORD='.$dbConfig['password']);

                $command = sprintf(
                    '"%s" -h %s -p %s -U %s -d %s -f %s',
                    $psqlPath,
                    escapeshellarg($dbConfig['host']),
                    escapeshellarg($dbConfig['port']),
                    escapeshellarg($dbConfig['username']),
                    escapeshellarg($dbConfig['database']),
                    escapeshellarg($sqlPathToRestore)
                );

                $output = [];
                $returnVar = 0;
                exec($command.' 2>&1', $output, $returnVar);

                putenv('PGPASSWORD');

                if ($returnVar !== 0) {
                    $errorSnippet = implode("\n", array_slice($output, -10));
                    throw new Exception("Eksekusi psql gagal (code {$returnVar}): ".$errorSnippet);
                }

                // Reset sequences (Penting setelah restore)
                $this->setRestoreProgress($restoreId, 80, 'Menyinkronkan urutan ID (sequence)...', 'processing');
                $this->resetSequences();

                // Run migrations to ensure schema is up to date with code
                $this->setRestoreProgress($restoreId, 88, 'Memvalidasi migrasi skema database...', 'processing');
                Artisan::call('migrate', ['--force' => true]);

                // Pastikan symlink storage terhubung jika belum ada
                $this->setRestoreProgress($restoreId, 95, 'Memverifikasi tautan berkas fisik...', 'processing');
                if (! file_exists(public_path('storage'))) {
                    try {
                        Artisan::call('storage:link');
                    } catch (\Throwable $linkError) {
                        Log::warning('Storage link error: '.$linkError->getMessage());
                    }
                }

                if ($isZipPackage) {
                    $message = "Database dan {$totalFilesRestored} berkas fisik berhasil dipulihkan (restore).";
                } else {
                    $message = 'Database versi legacy berhasil dipulihkan (tanpa berkas fisik).';
                }

                $this->setRestoreProgress($restoreId, 100, $message, 'completed');

                return back()->with('success', $message);
            } catch (Exception $e) {
                Log::error('Restore execution failed: '.$e->getMessage());

                // SAFEGUARD: Jika restore gagal dan tabel hilang, jalankan migrasi agar sessions & users kembali ada!
                try {
                    Artisan::call('migrate', ['--force' => true]);
                } catch (\Throwable $migError) {
                    Log::error('Emergency migration failed: '.$migError->getMessage());
                }

                $this->setRestoreProgress($restoreId, 100, 'Restore gagal: '.$e->getMessage(), 'error');

                return back()->with('error', 'Restore gagal: '.$e->getMessage());
            }
        } catch (Exception $e) {
            $this->setRestoreProgress($restoreId, 100, 'Restore gagal: '.$e->getMessage(), 'error');

            return back()->with('error', $e->getMessage());
        } finally {
            if ($extractedSqlPath && file_exists($extractedSqlPath)) {
                @unlink($extractedSqlPath);
            }
            if (is_dir($tempDir)) {
                @rmdir($tempDir);
            }
        }
    }

    /**
     * Mengambil status progres nyata dari proses restore
     */
    public function restoreProgress(string $restoreId)
    {
        $safeId = preg_replace('/[^a-zA-Z0-9_-]/', '', $restoreId);
        $progressFile = storage_path('app/temp/restore_progress_'.$safeId.'.json');

        if (file_exists($progressFile)) {
            $content = @file_get_contents($progressFile);
            $data = json_decode($content, true);

            if (is_array($data)) {
                return response()->json($data);
            }
        }

        return response()->json([
            'percent' => 5,
            'message' => 'Menghubungkan ke server...',
            'status' => 'processing',
        ]);
    }

    /**
     * Memperbarui status progres restore ke file temporer
     */
    protected function setRestoreProgress(?string $restoreId, int $percent, string $message, string $status = 'processing'): void
    {
        if (empty($restoreId)) {
            return;
        }

        $safeId = preg_replace('/[^a-zA-Z0-9_-]/', '', $restoreId);
        $tempDir = storage_path('app/temp');
        if (! file_exists($tempDir)) {
            @mkdir($tempDir, 0755, true);
        }

        $progressFile = $tempDir.'/restore_progress_'.$safeId.'.json';
        $payload = [
            'percent' => $percent,
            'message' => $message,
            'status' => $status,
            'updated_at' => microtime(true),
        ];

        @file_put_contents($progressFile, json_encode($payload));
    }

    /**
     * Menambahkan seluruh isi folder ke dalam ZipArchive secara rekursif
     */
    protected function addFolderToZip(ZipArchive $zip, string $sourcePath, string $zipPrefix, array $excludeDirs = []): int
    {
        if (! is_dir($sourcePath)) {
            return 0;
        }

        $sourcePath = rtrim(str_replace('\\', '/', $sourcePath), '/');
        $filesAdded = 0;

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourcePath, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $itemPath = str_replace('\\', '/', $item->getPathname());
            $relativePath = substr($itemPath, strlen($sourcePath) + 1);

            // Periksa apakah berada dalam direktori yang dikecualikan
            $shouldExclude = false;
            foreach ($excludeDirs as $exclude) {
                $exclude = trim(str_replace('\\', '/', $exclude), '/');
                if ($relativePath === $exclude || str_starts_with($relativePath, $exclude.'/')) {
                    $shouldExclude = true;
                    break;
                }
            }

            if ($item->getFilename() === '.gitignore' || $item->getFilename() === '.DS_Store') {
                $shouldExclude = true;
            }

            if ($shouldExclude) {
                continue;
            }

            $zipEntryPath = rtrim($zipPrefix, '/').'/'.$relativePath;

            if ($item->isDir()) {
                $zip->addEmptyDir($zipEntryPath);
            } elseif ($item->isFile()) {
                $zip->addFile($itemPath, $zipEntryPath);
                $filesAdded++;
            }
        }

        return $filesAdded;
    }

    /**
     * Mengekstrak subfolder tertentu dari ZipArchive ke direktori tujuan (Merge & Overwrite)
     */
    protected function extractZipSubdir(ZipArchive $zip, string $zipPrefix, string $destinationPath): int
    {
        $zipPrefix = trim(str_replace('\\', '/', $zipPrefix), '/');
        $destinationPath = rtrim(str_replace('\\', '/', $destinationPath), '/');
        $filesExtracted = 0;

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = str_replace('\\', '/', $zip->getNameIndex($i));

            if ($entryName === $zipPrefix || str_starts_with($entryName, $zipPrefix.'/')) {
                $subPath = substr($entryName, strlen($zipPrefix));
                $subPath = ltrim($subPath, '/');

                if (empty($subPath)) {
                    continue;
                }

                $targetPath = $destinationPath.'/'.$subPath;

                if (str_ends_with($entryName, '/')) {
                    if (! file_exists($targetPath)) {
                        @mkdir($targetPath, 0755, true);
                    }
                } else {
                    $parentDir = dirname($targetPath);
                    if (! file_exists($parentDir)) {
                        @mkdir($parentDir, 0755, true);
                    }

                    $stream = $zip->getStream($entryName);
                    if ($stream) {
                        $targetHandle = fopen($targetPath, 'wb');
                        if ($targetHandle) {
                            stream_copy_to_stream($stream, $targetHandle);
                            fclose($targetHandle);
                            $filesExtracted++;
                        }
                        fclose($stream);
                    }
                }
            }
        }

        return $filesExtracted;
    }

    /**
     * Menemukan path executable PostgreSQL (psql / pg_dump) secara dinamis
     */
    protected function getPostgresBinaryPath(string $binary = 'psql'): string
    {
        $dbConfig = Config::get('database.connections.pgsql');
        $configuredPath = $dbConfig['dump']['dump_binary_path'] ?? env('PG_DUMP_PATH', '');

        $ext = PHP_OS_FAMILY === 'Windows' ? '.exe' : '';
        $binaryWithExt = $binary.$ext;

        $candidateDirs = [
            $configuredPath,
            dirname(base_path()).DIRECTORY_SEPARATOR.'pgsql'.DIRECTORY_SEPARATOR.'bin',
            'C:\\laragon\\bin\\postgresql\\pgsql\\bin\\',
            'C:\\laragon\\www\\newSIKAS2\\pgsql\\bin\\',
            'C:\\Program Files\\PostgreSQL\\18\\bin\\',
            'C:\\Program Files\\PostgreSQL\\17\\bin\\',
            'C:\\Program Files\\PostgreSQL\\16\\bin\\',
        ];

        foreach ($candidateDirs as $dir) {
            if (empty($dir)) {
                continue;
            }
            $dir = rtrim($dir, '\\/');
            $fullPath = $dir.DIRECTORY_SEPARATOR.$binaryWithExt;
            if (file_exists($fullPath)) {
                return $fullPath;
            }
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $whichOutput = [];
            $whichReturn = 0;
            @exec("where.exe {$binary} 2>NUL", $whichOutput, $whichReturn);
            if ($whichReturn === 0 && ! empty($whichOutput[0]) && file_exists(trim($whichOutput[0]))) {
                return trim($whichOutput[0]);
            }
        }

        return ! empty($configuredPath) ? rtrim($configuredPath, '\\/').DIRECTORY_SEPARATOR.$binaryWithExt : $binaryWithExt;
    }

    /**
     * Mendownload file backup
     */
    public function download(Request $request)
    {
        $fileName = $request->get('file');
        // Prevent path traversal
        $fileName = basename($fileName);
        $backupPath = storage_path('app/backups/'.$fileName);

        if (! file_exists($backupPath)) {
            return back()->with('error', 'File backup tidak ditemukan');
        }

        return Response::download($backupPath, $fileName, [
            'Content-Type' => 'application/octet-stream',
        ]);
    }

    /**
     * Menghapus file backup
     */
    public function delete(Request $request)
    {
        $fileName = $request->get('file');
        // Prevent path traversal
        $fileName = basename($fileName);
        $backupPath = storage_path('app/backups/'.$fileName);

        if (! file_exists($backupPath)) {
            return back()->with('error', 'File backup tidak ditemukan');
        }

        if (unlink($backupPath)) {
            return back()->with('success', 'File backup berhasil dihapus');
        } else {
            return back()->with('error', 'Gagal menghapus file backup');
        }
    }

    /**
     * Mendapatkan daftar file backup
     */
    private function getBackupFiles()
    {
        $backupPath = storage_path('app/backups');
        $files = [];

        if (is_dir($backupPath)) {
            // Match .rsv, .btb, and .sql files
            $backupFiles = glob($backupPath.'/*.{rsv,btb,sql}', GLOB_BRACE);

            foreach ($backupFiles as $file) {
                $fileName = basename($file);
                $files[] = [
                    'name' => $fileName,
                    'size' => $this->formatBytes(filesize($file)),
                    'created_at' => date('d/m/Y H:i:s', filemtime($file)),
                    'path' => $file,
                ];
            }

            // Mengurutkan berdasarkan tanggal terbaru
            usort($files, function ($a, $b) {
                return filemtime($b['path']) - filemtime($a['path']);
            });
        }

        return $files;
    }

    /**
     * Format ukuran file dalam bytes ke format yang mudah dibaca
     */
    private function formatBytes($size, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }

        return round($size, $precision).' '.$units[$i];
    }

    /**
     * Update NPSN CODE di .env
     */
    public function updateNpsn(Request $request)
    {
        $allowedNpsns = (array) config('license.allowed_npsn', []);

        $request->validate([
            'npsn_code' => ['required', 'string', 'max:255', Rule::in($allowedNpsns)],
        ], [
            'npsn_code.in' => 'NPSN yang dimasukkan tidak terdaftar dalam lisensi resmi aplikasi.',
        ]);

        $path = app()->environmentFilePath();

        if (file_exists($path)) {
            $envContent = file_get_contents($path);

            if (strpos($envContent, 'APP_NPSN_CODE=') !== false) {
                $envContent = preg_replace(
                    '/^APP_NPSN_CODE=.*$/m',
                    'APP_NPSN_CODE='.$request->npsn_code,
                    $envContent
                );
            } else {
                // Ensure newline before appending
                $envContent = rtrim($envContent)."\nAPP_NPSN_CODE=".$request->npsn_code."\n";
            }

            file_put_contents($path, $envContent);
        }

        return back()->with('success', 'NPSN berhasil diperbarui');
    }
}
