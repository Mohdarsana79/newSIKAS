<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeepSeekService
{
    protected string $baseUrl;

    public function __construct(?string $baseUrl = null)
    {
        $this->baseUrl = rtrim($baseUrl ?: env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'), '/');
    }

    /**
     * Menguji validitas API Key DeepSeek ke endpoint /models
     */
    public function testConnection(string $apiKey): array
    {
        $apiKey = trim($apiKey);
        if (empty($apiKey)) {
            return [
                'success' => false,
                'message' => 'API Key DeepSeek tidak boleh kosong.',
            ];
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(15)
                ->acceptJson()
                ->get("{$this->baseUrl}/models");

            if ($response->successful()) {
                $data = $response->json();
                $modelIds = collect($data['data'] ?? [])->pluck('id')->all();

                return [
                    'success' => true,
                    'message' => 'Koneksi ke DeepSeek API berhasil terhubung!',
                    'models' => $modelIds,
                ];
            }

            $errorMsg = $response->json('error.message') ?? "HTTP {$response->status()}: " . $response->body();
            return [
                'success' => false,
                'message' => "Gagal terhubung ke DeepSeek API: {$errorMsg}",
            ];
        } catch (\Throwable $e) {
            Log::error('DeepSeek connection test error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Gagal menghubungi server DeepSeek: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Memanggil model DeepSeek-R1 (deepseek-reasoner) untuk penalaran audit mendalam
     */
    public function callReasoner(string $apiKey, array $messages, array $options = []): array
    {
        $apiKey = trim($apiKey);
        if (empty($apiKey)) {
            return [
                'success' => false,
                'message' => 'Kunci API DeepSeek belum dikonfigurasi pada profil Anda.',
            ];
        }

        $payload = array_merge([
            'model' => $options['model'] ?? 'deepseek-reasoner',
            'messages' => $messages,
            'max_tokens' => $options['max_tokens'] ?? 4096,
        ], $options);

        // Hapus options yang bukan parameter resmi DeepSeek
        unset($payload['timeout']);

        $timeout = $options['timeout'] ?? 90; // Default 90 detik untuk model reasoner

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->acceptJson()
                ->post("{$this->baseUrl}/chat/completions", $payload);

            if ($response->successful()) {
                $data = $response->json();
                $choice = $data['choices'][0]['message'] ?? [];
                
                return [
                    'success' => true,
                    'content' => $choice['content'] ?? '',
                    'reasoning_content' => $choice['reasoning_content'] ?? null,
                    'usage' => $data['usage'] ?? [],
                ];
            }

            $statusCode = $response->status();
            $errorJson = $response->json();
            $errorMessage = $errorJson['error']['message'] ?? $response->body();

            if ($statusCode === 401) {
                $errorMessage = 'Kunci API DeepSeek tidak valid atau telah kedaluwarsa.';
            } elseif ($statusCode === 402) {
                $errorMessage = 'Saldo kuota API DeepSeek Anda telah habis. Silakan isi ulang saldo di platform DeepSeek.';
            } elseif ($statusCode === 429) {
                $errorMessage = 'Batas laju permintaan (Rate Limit) DeepSeek tercapai. Mohon tunggu beberapa saat.';
            }

            Log::warning("DeepSeek Reasoner API error ({$statusCode}): {$errorMessage}");

            return [
                'success' => false,
                'message' => $errorMessage,
                'status_code' => $statusCode,
            ];
        } catch (\Throwable $e) {
            Log::error('DeepSeek Reasoner call exception: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Terjadi kesalahan jaringan saat menghubungi DeepSeek: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Memanggil model DeepSeek-V3 (deepseek-chat) untuk fungsi interaktif cepat
     */
    public function callChat(string $apiKey, array $messages, array $options = []): array
    {
        $apiKey = trim($apiKey);
        if (empty($apiKey)) {
            return [
                'success' => false,
                'message' => 'Kunci API DeepSeek belum dikonfigurasi pada profil Anda.',
            ];
        }

        $payload = array_merge([
            'model' => $options['model'] ?? 'deepseek-chat',
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
        ], $options);

        $timeout = $options['timeout'] ?? 45;

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->acceptJson()
                ->post("{$this->baseUrl}/chat/completions", $payload);

            if ($response->successful()) {
                $data = $response->json();
                $choice = $data['choices'][0]['message'] ?? [];

                return [
                    'success' => true,
                    'content' => $choice['content'] ?? '',
                    'usage' => $data['usage'] ?? [],
                ];
            }

            $errorMessage = $response->json('error.message') ?? $response->body();
            return [
                'success' => false,
                'message' => "DeepSeek Chat error: {$errorMessage}",
            ];
        } catch (\Throwable $e) {
            Log::error('DeepSeek Chat call exception: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Gagal menghubungi DeepSeek: ' . $e->getMessage(),
            ];
        }
    }
}
