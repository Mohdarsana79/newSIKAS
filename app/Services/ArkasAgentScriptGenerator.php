<?php

namespace App\Services;

class ArkasAgentScriptGenerator
{
    /**
     * Generate a zero-install Windows hybrid .bat + PowerShell Agent Sync script
     * embedded with server URL and fresh Sync Token (PIN is always prompted interactively).
     */
    public function generateBatScript(string $serverBaseUrl, string $syncToken, int $chunkSizeMb = 2): string
    {
        $cleanUrl = rtrim(trim($serverBaseUrl), '/');
        $escapedUrl = str_replace("'", "''", $cleanUrl);
        $escapedToken = str_replace("'", "''", trim($syncToken));
        $chunkBytes = max(1, min(4, $chunkSizeMb)) * 1024 * 1024;

        $script = <<<BAT
@echo off & setlocal
title SIKAS - ARKAS Sync Agent
chcp 65001 >nul
set "SIKAS_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "\$t=[System.IO.File]::ReadAllText(\$env:SIKAS_SELF,[System.Text.Encoding]::UTF8); \$i=\$t.IndexOf('#__SIKAS_PS_START__'); Invoke-Expression \$t.Substring(\$i)"
set "SIKAS_EXIT=%ERRORLEVEL%"
echo.
pause
exit /b %SIKAS_EXIT%
#__SIKAS_PS_START__
\$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http

\$ServerUrl  = '{$escapedUrl}'
\$SyncToken  = '{$escapedToken}'
\$ChunkBytes = {$chunkBytes}
\$DeviceName = \$env:COMPUTERNAME

function Write-Banner {
    Clear-Host
    Write-Host '==============================================================' -ForegroundColor Cyan
    Write-Host '             SIKAS - ARKAS SYNC AGENT (WINDOWS)               ' -ForegroundColor Cyan
    Write-Host '==============================================================' -ForegroundColor Cyan
    Write-Host ("  Server   : " + \$ServerUrl) -ForegroundColor Gray
    Write-Host ("  Perangkat: " + \$DeviceName) -ForegroundColor Gray
    Write-Host '==============================================================' -ForegroundColor Cyan
    Write-Host ''
}

function Read-PinPlain {
    \$sec = Read-Host 'Masukkan PIN Sinkronisasi (4-6 digit)' -AsSecureString
    \$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR(\$sec)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(\$bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR(\$bstr)
    }
}

function Parse-HttpError(\$Exception) {
    try {
        \$resp = \$Exception.Response
        if (\$null -ne \$resp) {
            \$statusCode = [int]\$resp.StatusCode
            \$stream = \$resp.GetResponseStream()
            \$reader = New-Object System.IO.StreamReader(\$stream)
            \$body = \$reader.ReadToEnd()
            \$reader.Close()
            try {
                \$json = \$body | ConvertFrom-Json
                if (\$json.message) {
                    return "HTTP \$statusCode - " + \$json.message
                }
            } catch {}
            return "HTTP \$statusCode - Gagal terhubung ke server."
        }
    } catch {}
    return \$Exception.Message
}

function Invoke-SikasJson(\$Endpoint, \$Pin, \$PayloadObj) {
    \$uri = \$ServerUrl + \$Endpoint
    \$headers = @{
        'X-Arkas-Sync-Token' = \$SyncToken
        'X-Arkas-Sync-Pin'   = \$Pin
        'Accept'             = 'application/json'
    }
    \$jsonBody = (\$PayloadObj | ConvertTo-Json -Depth 5 -Compress)
    try {
        return Invoke-RestMethod -Uri \$uri -Method Post -Headers \$headers -ContentType 'application/json; charset=utf-8' -Body \$jsonBody -TimeoutSec 120
    } catch {
        throw (Parse-HttpError \$_.Exception)
    }
}

function Find-ArkasDb {
    \$candidates = @(
        (Join-Path \$env:APPDATA 'Arkas\arkas.db'),
        (Join-Path \$env:LOCALAPPDATA 'Arkas\arkas.db')
    )
    foreach (\$c in \$candidates) {
        if (\$c -and (Test-Path -LiteralPath \$c -PathType Leaf)) {
            return \$c
        }
    }
    Write-Host '[!] File arkas.db tidak ditemukan di lokasi default AppData.' -ForegroundColor Yellow
    \$manual = Read-Host 'Masukkan jalur lengkap file arkas.db (atau seret file ke sini lalu Enter)'
    \$manual = \$manual.Trim().Trim('"').Trim("'")
    if (\$manual -and (Test-Path -LiteralPath \$manual -PathType Leaf)) {
        return \$manual
    }
    return \$null
}

function Test-ArkasProcessRunning {
    \$procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { \$_.ProcessName -match '(?i)^arkas' }
    return (\$null -ne \$procs -and @(\$procs).Count -gt 0)
}

function Test-ArkasWalActive(\$DbPath) {
    \$wal = \$DbPath + '-wal'
    if (Test-Path -LiteralPath \$wal -PathType Leaf) {
        try {
            \$info = Get-Item -LiteralPath \$wal -ErrorAction Stop
            return (\$info.Length -gt 0)
        } catch {
            return \$true
        }
    }
    return \$false
}

function Show-ProgressBar(\$Current, \$Total, \$SentBytes, \$TotalBytes) {
    \$pct = [math]::Min(100, [math]::Floor((\$Current / \$Total) * 100))
    \$filled = [math]::Floor(\$pct / 5)
    \$bar = ('#' * \$filled) + ('-' * (20 - \$filled))
    \$sentMb = [math]::Round(\$SentBytes / 1MB, 2)
    \$totalMb = [math]::Round(\$TotalBytes / 1MB, 2)
    Write-Host -NoNewline ("`r  Mengunggah [\$bar] \$pct% (\$Current/\$Total bagian | \$sentMb / \$totalMb MB)   ") -ForegroundColor Cyan
}

function Send-ChunkWithRetry(\$HttpClient, \$Uri, \$Pin, \$UploadId, \$ChunkIndex, [byte[]]\$Buffer, [int]\$Length) {
    \$maxAttempts = 3
    for (\$attempt = 1; \$attempt -le \$maxAttempts; \$attempt++) {
        try {
            \$content = New-Object System.Net.Http.MultipartFormDataContent
            \$content.Add((New-Object System.Net.Http.StringContent(\$UploadId)), 'upload_id')
            \$content.Add((New-Object System.Net.Http.StringContent([string]\$ChunkIndex)), 'chunk_index')
            \$slice = New-Object byte[] \$Length
            [System.Buffer]::BlockCopy(\$Buffer, 0, \$slice, 0, \$Length)
            \$byteContent = New-Object System.Net.Http.ByteArrayContent(,\$slice)
            \$byteContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/octet-stream')
            \$content.Add(\$byteContent, 'chunk', "chunk_\$ChunkIndex.part")

            \$req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, \$Uri)
            \$req.Headers.Add('X-Arkas-Sync-Token', \$SyncToken)
            \$req.Headers.Add('X-Arkas-Sync-Pin', \$Pin)
            \$req.Headers.Add('Accept', 'application/json')
            \$req.Content = \$content

            \$resp = \$HttpClient.SendAsync(\$req).GetAwaiter().GetResult()
            \$respBody = \$resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            \$content.Dispose()
            \$req.Dispose()

            if (\$resp.IsSuccessStatusCode) {
                return
            }

            \$errMsg = "HTTP " + [int]\$resp.StatusCode
            try {
                \$parsed = \$respBody | ConvertFrom-Json
                if (\$parsed.message) { \$errMsg = \$errMsg + " - " + \$parsed.message }
            } catch {}

            if ([int]\$resp.StatusCode -in @(401, 403, 404, 422, 429)) {
                throw \$errMsg
            }

            if (\$attempt -eq \$maxAttempts) {
                throw \$errMsg
            }
        } catch {
            if (\$attempt -eq \$maxAttempts) {
                throw \$_.Exception.Message
            }
            Start-Sleep -Seconds (\$attempt * 2)
        }
    }
}

function Invoke-ArkasSync(\$DbPath, \$Pin) {
    \$fileInfo = Get-Item -LiteralPath \$DbPath
    \$totalSize = [long]\$fileInfo.Length
    \$totalMb = [math]::Round(\$totalSize / 1MB, 2)
    Write-Host ("[*] Menghitung checksum SHA-256 (\$totalMb MB)...") -ForegroundColor Gray
    \$sha256 = (Get-FileHash -LiteralPath \$DbPath -Algorithm SHA256).Hash.ToLower()
    \$totalChunks = [int][math]::Ceiling(\$totalSize / \$ChunkBytes)

    \$initRes = Invoke-SikasJson '/arkas-agent/upload/init' \$Pin @{
        filename     = \$fileInfo.Name
        total_size   = \$totalSize
        chunk_size   = \$ChunkBytes
        total_chunks = \$totalChunks
        sha256       = \$sha256
        device_name  = \$DeviceName
    }

    if (\$initRes.already_up_to_date -eq \$true) {
        Write-Host '[OK] Database arkas.db di server sudah paling baru (tidak perlu upload ulang).' -ForegroundColor Green
        return \$sha256
    }

    \$uploadId = \$initRes.upload_id
    \$chunkUri = \$ServerUrl + '/arkas-agent/upload/chunk'
    \$httpClient = New-Object System.Net.Http.HttpClient
    \$httpClient.Timeout = [TimeSpan]::FromSeconds(120)

    \$stream = [System.IO.File]::Open(\$DbPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    try {
        \$buffer = New-Object byte[] \$ChunkBytes
        [long]\$sentBytes = 0
        for (\$idx = 0; \$idx -lt \$totalChunks; \$idx++) {
            \$readLen = \$stream.Read(\$buffer, 0, \$ChunkBytes)
            if (\$readLen -le 0) { break }
            Send-ChunkWithRetry \$httpClient \$chunkUri \$Pin \$uploadId \$idx \$buffer \$readLen
            \$sentBytes += \$readLen
            Show-ProgressBar (\$idx + 1) \$totalChunks \$sentBytes \$totalSize
        }
    } finally {
        \$stream.Close()
        \$httpClient.Dispose()
    }

    Write-Host ''
    Write-Host '[*] Memverifikasi integritas & dekripsi SQLCipher di server...' -ForegroundColor Yellow

    \$finalRes = Invoke-SikasJson '/arkas-agent/upload/finalize' \$Pin @{
        upload_id   = \$uploadId
        device_name = \$DeviceName
    }

    Write-Host ('[OK] ' + \$finalRes.message) -ForegroundColor Green
    if (\$finalRes.years -and @(\$finalRes.years).Count -gt 0) {
        Write-Host ('     Tahun terdeteksi: ' + (\$finalRes.years -join ', ')) -ForegroundColor Gray
    }
    if (\$finalRes.active_mode -ne 'online') {
        Write-Host '     [!] Catatan: Mode server saat ini masih Mode PC Lokal. Aktifkan Mode Online / VPS di web SIKAS.' -ForegroundColor Yellow
    }

    return \$sha256
}

Write-Banner
\$Pin = Read-PinPlain
if ([string]::IsNullOrWhiteSpace(\$Pin)) {
    Write-Host '[X] PIN tidak boleh kosong.' -ForegroundColor Red
    exit 1
}

Write-Host '[*] Memverifikasi Token & PIN ke server SIKAS...' -ForegroundColor Gray
try {
    \$ping = Invoke-SikasJson '/arkas-agent/ping' \$Pin @{ device_name = \$DeviceName }
} catch {
    Write-Host ('[X] Autentikasi gagal: ' + \$_.Exception.Message) -ForegroundColor Red
    exit 1
}

Write-Host ('[OK] Terhubung! Mode aktif server: ' + \$ping.active_mode.ToUpper()) -ForegroundColor Green
\$DbPath = Find-ArkasDb
if (-not \$DbPath) {
    Write-Host '[X] File arkas.db tidak ditemukan.' -ForegroundColor Red
    exit 1
}
Write-Host ('[*] Lokasi arkas.db: ' + \$DbPath) -ForegroundColor Gray
Write-Host ''
Write-Host 'Pilih Mode Sinkronisasi:' -ForegroundColor White
Write-Host '  [1] Sync Sekarang (1x Klik)' -ForegroundColor Cyan
Write-Host '  [2] Mode Pantau Otomatis (Auto-Sync setiap aplikasi ARKAS ditutup)' -ForegroundColor Cyan
Write-Host ''
\$choice = Read-Host 'Pilihan Anda (1/2) [default: 1]'
if ([string]::IsNullOrWhiteSpace(\$choice)) { \$choice = '1' }

if (\$choice -eq '1') {
    while ((Test-ArkasProcessRunning) -or (Test-ArkasWalActive \$DbPath)) {
        Write-Host '[!] Aplikasi ARKAS masih terbuka atau file arkas.db-wal masih aktif.' -ForegroundColor Yellow
        Write-Host '    Tutup aplikasi ARKAS terlebih dahulu agar data transaksi terbaru tidak tertinggal.' -ForegroundColor Yellow
        Read-Host '    Setelah ARKAS ditutup, tekan ENTER untuk melanjutkan'
    }
    try {
        [void](Invoke-ArkasSync \$DbPath \$Pin)
    } catch {
        Write-Host ('[X] Sinkronisasi gagal: ' + \$_.Exception.Message) -ForegroundColor Red
        exit 1
    }
} elseif (\$choice -eq '2') {
    Write-Host ''
    Write-Host '==============================================================' -ForegroundColor Green
    Write-Host '  MODE PANTAU AKTIF - Jangan tutup jendela ini (boleh minimize)' -ForegroundColor Green
    Write-Host '  Sync otomatis berjalan setiap kali aplikasi ARKAS ditutup.   ' -ForegroundColor Green
    Write-Host '  Tekan Ctrl+C untuk berhenti.                                ' -ForegroundColor Green
    Write-Host '==============================================================' -ForegroundColor Green
    Write-Host ''

    \$lastHash = if (\$ping.last_upload -and \$ping.last_upload.sha256) { \$ping.last_upload.sha256 } else { '' }
    \$wasRunning = Test-ArkasProcessRunning

    if (-not \$wasRunning -and -not (Test-ArkasWalActive \$DbPath)) {
        try {
            \$currentHash = (Get-FileHash -LiteralPath \$DbPath -Algorithm SHA256).Hash.ToLower()
            if (\$currentHash -ne \$lastHash) {
                Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Perubahan awal terdeteksi, memulai sync...') -ForegroundColor Cyan
                \$lastHash = Invoke-ArkasSync \$DbPath \$Pin
            } else {
                Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Data server sudah sinkron. Menunggu aktivitas ARKAS...') -ForegroundColor Gray
            }
        } catch {
            Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] [!] Gagal sync awal: ' + \$_.Exception.Message) -ForegroundColor Yellow
        }
    }

    while (\$true) {
        Start-Sleep -Seconds 5
        \$isRunning = Test-ArkasProcessRunning
        if (\$isRunning -and -not \$wasRunning) {
            Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Aplikasi ARKAS terdeteksi dibuka. Menunggu selesai...') -ForegroundColor Gray
        }

        if (\$wasRunning -and -not \$isRunning) {
            Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Aplikasi ARKAS ditutup. Menunggu 3 detik untuk checkpoint WAL...') -ForegroundColor Cyan
            Start-Sleep -Seconds 3
            if (Test-ArkasWalActive \$DbPath) {
                Start-Sleep -Seconds 3
            }
            try {
                \$currentHash = (Get-FileHash -LiteralPath \$DbPath -Algorithm SHA256).Hash.ToLower()
                if (\$currentHash -ne \$lastHash) {
                    \$lastHash = Invoke-ArkasSync \$DbPath \$Pin
                } else {
                    Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Tidak ada perubahan data pada arkas.db.') -ForegroundColor Gray
                }
            } catch {
                Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] [!] Gagal auto-sync: ' + \$_.Exception.Message) -ForegroundColor Yellow
            }
        }
        \$wasRunning = \$isRunning
    }
} else {
    Write-Host '[X] Pilihan tidak dikenali.' -ForegroundColor Red
    exit 1
}
BAT;

        return str_replace("\n", "\r\n", str_replace("\r\n", "\n", $script));
    }
}
