<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class NetworkAccessService
{
    /**
     * Gather non-loopback LAN IPv4 addresses available on this server.
     *
     * @return array<int, string>
     */
    public function getLocalLanIps(): array
    {
        $ips = [];

        $hostname = gethostname();
        if (is_string($hostname) && $hostname !== '') {
            $resolved = @gethostbynamel($hostname);
            if (is_array($resolved)) {
                $ips = array_merge($ips, $resolved);
            }
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $process = new Process(['ipconfig']);
            $process->setTimeout(5);
            try {
                $process->run();
                if ($process->isSuccessful()) {
                    preg_match_all('/IPv4[^:\r\n]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i', $process->getOutput(), $matches);
                    if (! empty($matches[1])) {
                        $ips = array_merge($ips, $matches[1]);
                    }
                }
            } catch (\Throwable) {
                // Ignore if ipconfig is blocked
            }
        }

        $filtered = [];
        foreach ($ips as $ip) {
            $ip = trim((string) $ip);
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                continue;
            }
            if ($ip === '127.0.0.1' || $ip === '0.0.0.0' || str_starts_with($ip, '169.254.')) {
                continue;
            }
            $filtered[$ip] = $ip;
        }

        $result = array_values($filtered);
        usort($result, function (string $a, string $b): int {
            $score = static function (string $ip): int {
                if (str_starts_with($ip, '192.168.')) {
                    return 0;
                }
                if (str_starts_with($ip, '10.')) {
                    return 1;
                }

                return 2;
            };

            return $score($a) <=> $score($b);
        });

        return $result;
    }

    /**
     * Detect the HTTP port used by the running app or Inno Setup install.ini.
     */
    public function detectActivePort(Request $request): int
    {
        $iniPath = dirname(base_path()).DIRECTORY_SEPARATOR.'configapp'.DIRECTORY_SEPARATOR.'install.ini';
        if (is_file($iniPath)) {
            $content = @file_get_contents($iniPath);
            if (is_string($content) && preg_match('/^port\s*=\s*(\d+)/mi', $content, $matches)) {
                $port = (int) $matches[1];
                if ($port > 0 && $port <= 65535) {
                    return $port;
                }
            }
        }

        $requestPort = (int) $request->getPort();

        return $requestPort > 0 ? $requestPort : 80;
    }

    /**
     * Build copy-ready HTTP URLs for LAN/school network access.
     *
     * @return array<int, string>
     */
    public function buildLanUrls(Request $request): array
    {
        $port = $this->detectActivePort($request);
        $suffix = ($port === 80 || $port === 443) ? '' : ':'.$port;

        return array_map(
            fn (string $ip): string => "http://{$ip}{$suffix}",
            $this->getLocalLanIps()
        );
    }

    /**
     * Inspect Windows Firewall inbound rule state for the active port.
     *
     * @return array{supported: bool, open: bool|null, rule_name: string, message: string}
     */
    public function getFirewallStatus(int $port): array
    {
        $ruleName = $this->firewallRuleName($port);

        if (PHP_OS_FAMILY !== 'Windows') {
            return [
                'supported' => false,
                'open' => null,
                'rule_name' => $ruleName,
                'message' => 'Pemeriksaan otomatis Windows Firewall hanya tersedia pada sistem Windows.',
            ];
        }

        try {
            $process = new Process(['netsh', 'advfirewall', 'firewall', 'show', 'rule', "name={$ruleName}"]);
            $process->setTimeout(5);
            $process->run();

            if ($process->isSuccessful() && stripos($process->getOutput(), (string) $port) !== false) {
                return [
                    'supported' => true,
                    'open' => true,
                    'rule_name' => $ruleName,
                    'message' => "Port {$port} sudah diizinkan di Windows Firewall.",
                ];
            }

            // Also check Inno Setup demo rule name if running on port 8774
            $altRuleName = "newSIKAS Demo Server (Port {$port})";
            if ($altRuleName !== $ruleName) {
                $altProcess = new Process(['netsh', 'advfirewall', 'firewall', 'show', 'rule', "name={$altRuleName}"]);
                $altProcess->setTimeout(5);
                $altProcess->run();
                if ($altProcess->isSuccessful() && stripos($altProcess->getOutput(), (string) $port) !== false) {
                    return [
                        'supported' => true,
                        'open' => true,
                        'rule_name' => $altRuleName,
                        'message' => "Port {$port} sudah diizinkan di Windows Firewall.",
                    ];
                }
            }

            return [
                'supported' => true,
                'open' => false,
                'rule_name' => $ruleName,
                'message' => "Aturan Firewall khusus port {$port} belum terdeteksi. Klik Buka Port Firewall atau jalankan installer sebagai Administrator.",
            ];
        } catch (\Throwable $e) {
            return [
                'supported' => true,
                'open' => null,
                'rule_name' => $ruleName,
                'message' => 'Tidak dapat memeriksa status Firewall secara otomatis: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Attempt to add an inbound Windows Firewall rule for the given port.
     *
     * @return array{success: bool, open: bool|null, message: string, manual_command?: string}
     */
    public function openFirewallPort(int $port): array
    {
        $ruleName = $this->firewallRuleName($port);
        $manualCmd = "netsh advfirewall firewall add rule name=\"{$ruleName}\" dir=in action=allow protocol=TCP localport={$port} profile=any";

        if (PHP_OS_FAMILY !== 'Windows') {
            return [
                'success' => false,
                'open' => null,
                'message' => 'Fitur ini hanya berjalan pada server Windows.',
            ];
        }

        try {
            $del = new Process(['netsh', 'advfirewall', 'firewall', 'delete', 'rule', "name={$ruleName}"]);
            $del->setTimeout(5);
            $del->run();

            $add = new Process([
                'netsh', 'advfirewall', 'firewall', 'add', 'rule',
                "name={$ruleName}",
                'dir=in',
                'action=allow',
                'protocol=TCP',
                "localport={$port}",
                'profile=any',
            ]);
            $add->setTimeout(5);
            $add->run();

            if ($add->isSuccessful()) {
                return [
                    'success' => true,
                    'open' => true,
                    'message' => "Port {$port} berhasil dibuka pada Windows Firewall.",
                ];
            }

            return [
                'success' => false,
                'open' => false,
                'message' => 'Gagal membuka port otomatis (membutuhkan hak akses Administrator). Jalankan perintah berikut di Command Prompt (Run as Administrator):',
                'manual_command' => $manualCmd,
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'open' => false,
                'message' => 'Gagal menjalankan netsh: '.$e->getMessage(),
                'manual_command' => $manualCmd,
            ];
        }
    }

    /**
     * Build the full summary payload passed to the Network & Online Access UI panel.
     *
     * @return array<string, mixed>
     */
    public function getNetworkSummary(Request $request): array
    {
        $port = $this->detectActivePort($request);
        $envPath = app()->environmentFilePath();
        $programData = getenv('ProgramData') ?: ($_SERVER['ProgramData'] ?? 'C:\ProgramData');
        $secureDir = rtrim($programData, '\\/').DIRECTORY_SEPARATOR.'SIKAS';
        $isProgramDataEnv = str_starts_with(
            strtolower(str_replace('/', '\\', $envPath)),
            strtolower(str_replace('/', '\\', $secureDir))
        );

        return [
            'port' => $port,
            'lan_urls' => $this->buildLanUrls($request),
            'current_host_url' => $request->getSchemeAndHttpHost(),
            'app_url' => (string) config('app.url', 'http://localhost'),
            'force_https' => (bool) config('app.force_https', false),
            'trusted_proxies' => (string) config('trustedproxy.proxies', '*'),
            'env_location' => $isProgramDataEnv ? 'programdata' : 'root',
            'firewall' => $this->getFirewallStatus($port),
        ];
    }

    /**
     * Persist selected keys into the active .env file (root or C:\ProgramData\SIKAS\.env).
     *
     * @param  array<string, string>  $pairs
     */
    public function updateEnvKeys(array $pairs): void
    {
        $envPath = app()->environmentFilePath();
        if (! File::exists($envPath)) {
            return;
        }

        $raw = File::get($envPath);
        $lines = preg_split("/\r\n|\n|\r/", $raw);
        if (! is_array($lines)) {
            $lines = [];
        }

        $remaining = $pairs;
        foreach ($lines as $i => $line) {
            foreach ($remaining as $key => $val) {
                if (str_starts_with($line, "{$key}=")) {
                    $formatted = str_contains($val, ' ') ? '"'.$val.'"' : $val;
                    $lines[$i] = "{$key}={$formatted}";
                    unset($remaining[$key]);
                    break;
                }
            }
        }

        foreach ($remaining as $key => $val) {
            $formatted = str_contains($val, ' ') ? '"'.$val.'"' : $val;
            $lines[] = "{$key}={$formatted}";
        }

        File::put($envPath, implode("\n", $lines)."\n");

        if (array_key_exists('APP_URL', $pairs)) {
            Config::set('app.url', $pairs['APP_URL']);
        }
        if (array_key_exists('FORCE_HTTPS', $pairs)) {
            Config::set('app.force_https', filter_var($pairs['FORCE_HTTPS'], FILTER_VALIDATE_BOOLEAN));
        }

        if (app()->configurationIsCached()) {
            Artisan::call('config:clear');
        }
    }

    protected function firewallRuleName(int $port): string
    {
        return "newSIKAS Server (Port {$port})";
    }
}
