<?php

namespace App\Http\Controllers;

use App\Services\ActivityLogger;
use App\Services\ArkasChunkUploadService;
use App\Services\ArkasStateStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArkasAgentController extends Controller
{
    public function ping(Request $request, ArkasStateStore $stateStore, ArkasChunkUploadService $chunkService): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'message' => 'Koneksi Agent Sync terverifikasi.',
            'active_mode' => $stateStore->getActiveMode(),
            'max_upload_mb' => $chunkService->getMaxUploadMb(),
            'chunk_size_mb' => $chunkService->getChunkSizeMb(),
            'last_upload' => $stateStore->getLastUpload(),
        ]);
    }

    public function uploadInit(Request $request, ArkasChunkUploadService $chunkService): JsonResponse
    {
        $validated = $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'total_size' => ['required', 'integer', 'min:1'],
            'chunk_size' => ['required', 'integer', 'min:65536'],
            'total_chunks' => ['required', 'integer', 'min:1'],
            'sha256' => ['required', 'string', 'size:64'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $result = $chunkService->initUpload($validated);

        return response()->json($result, (int) ($result['http_status'] ?? 200));
    }

    public function uploadChunk(Request $request, ArkasChunkUploadService $chunkService): JsonResponse
    {
        $validated = $request->validate([
            'upload_id' => ['required', 'string', 'max:64'],
            'chunk_index' => ['required', 'integer', 'min:0'],
            'chunk' => ['required', 'file'],
        ]);

        $result = $chunkService->storeChunk(
            (string) $validated['upload_id'],
            (int) $validated['chunk_index'],
            $request->file('chunk')
        );

        return response()->json($result, (int) ($result['http_status'] ?? 200));
    }

    public function uploadFinalize(
        Request $request,
        ArkasChunkUploadService $chunkService,
        ActivityLogger $activityLogger
    ): JsonResponse {
        $validated = $request->validate([
            'upload_id' => ['required', 'string', 'max:64'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $deviceName = isset($validated['device_name']) && trim((string) $validated['device_name']) !== ''
            ? trim((string) $validated['device_name'])
            : 'Laptop ARKAS';

        $result = $chunkService->finalizeUpload((string) $validated['upload_id'], [
            'via' => 'agent',
            'device_name' => $deviceName,
            'uploaded_by' => "Agent Sync ({$deviceName})",
        ]);

        if (($result['ok'] ?? false) === true) {
            $activityLogger->log([
                'user_id' => null,
                'user_name' => "Agent Sync ({$deviceName})",
                'user_role' => 'agent',
                'module' => 'path_arkas',
                'action' => 'import',
                'variant' => 'global',
                'description' => "Menyinkronkan arkas.db via Agent Sync dari {$deviceName}",
                'method' => 'POST',
                'route_name' => 'arkas-agent.upload-finalize',
                'path' => '/arkas-agent/upload/finalize',
                'status_code' => 200,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'metadata' => [
                    'device_name' => $deviceName,
                    'size_bytes' => $result['size_bytes'] ?? null,
                    'years' => $result['years'] ?? [],
                ],
            ]);
        }

        return response()->json($result, (int) ($result['http_status'] ?? 200));
    }
}
