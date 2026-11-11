<?php

namespace App\Http\Controllers;

use App\Models\SkDokumen;
use App\Models\SkFolder;
use App\Models\SkTemplate;
use App\Services\SkSuratService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SkSuratController extends Controller
{
    protected SkSuratService $skSuratService;

    public function __construct(SkSuratService $skSuratService)
    {
        $this->skSuratService = $skSuratService;
    }

    /**
     * Display list of folders.
     */
    public function index(Request $request)
    {
        $query = SkFolder::query()
            ->withCount(['dokumens', 'templates'])
            ->with('user:id,name')
            ->latest('updated_at');

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->whereRaw('LOWER(nama_folder) LIKE ?', ["%{$search}%"])
                ->orWhereRaw('LOWER(deskripsi) LIKE ?', ["%{$search}%"]);
        }

        $folders = $query->paginate(12)->withQueryString();

        return Inertia::render('SkSurat/Index', [
            'folders' => $folders,
            'filters' => $request->only('search'),
            'totalFolders' => SkFolder::count(),
            'totalDokumens' => SkDokumen::count(),
            'totalGenerated' => SkDokumen::where('tipe', 'generated')->count(),
            'totalUploaded' => SkDokumen::where('tipe', 'uploaded')->count(),
        ]);
    }

    /**
     * Create a new folder.
     */
    public function storeFolder(Request $request)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $validated = $request->validate([
            'nama_folder' => 'required|string|max:255',
            'deskripsi' => 'nullable|string|max:1000',
            'warna' => 'nullable|string|max:50',
        ]);

        $validated['warna'] = $validated['warna'] ?? 'indigo';
        $validated['created_by'] = auth()->id();

        $folder = SkFolder::create($validated);

        return redirect()->route('sk-surat.show', $folder->id)->with('success', 'Folder berhasil dibuat.');
    }

    /**
     * Update an existing folder.
     */
    public function updateFolder(Request $request, $id)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $folder = SkFolder::findOrFail($id);

        $validated = $request->validate([
            'nama_folder' => 'required|string|max:255',
            'deskripsi' => 'nullable|string|max:1000',
            'warna' => 'nullable|string|max:50',
        ]);

        $folder->update($validated);

        return back()->with('success', 'Folder berhasil diperbarui.');
    }

    /**
     * Delete a folder and its contents.
     */
    public function destroyFolder($id)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $folder = SkFolder::with(['templates', 'dokumens'])->findOrFail($id);

        // Remove files from storage
        foreach ($folder->templates as $template) {
            if ($template->file_path && Storage::exists($template->file_path)) {
                Storage::delete($template->file_path);
            }
        }

        foreach ($folder->dokumens as $dokumen) {
            if ($dokumen->file_path && Storage::exists($dokumen->file_path)) {
                Storage::delete($dokumen->file_path);
            }
        }

        $folder->delete();

        return redirect()->route('sk-surat.index')->with('success', 'Folder dan seluruh isinya berhasil dihapus.');
    }

    /**
     * Show folder detail with its documents and templates.
     */
    public function show(Request $request, $id)
    {
        $folder = SkFolder::with([
            'templates.user:id,name',
            'dokumens' => function ($q) use ($request) {
                if ($request->filled('search')) {
                    $search = strtolower($request->search);
                    $q->where(function ($sub) use ($search) {
                        $sub->whereRaw('LOWER(perihal) LIKE ?', ["%{$search}%"])
                            ->orWhereRaw('LOWER(nomor_surat) LIKE ?', ["%{$search}%"]);
                    });
                }
                if ($request->filled('tipe')) {
                    $q->where('tipe', $request->tipe);
                }
                $q->with(['template', 'user:id,name'])->latest();
            },
        ])->findOrFail($id);

        $schoolData = $this->skSuratService->getSchoolAutoFillData();

        return Inertia::render('SkSurat/Show', [
            'folder' => $folder,
            'schoolData' => $schoolData,
            'filters' => $request->only('search', 'tipe'),
        ]);
    }

    /**
     * Upload a new master template (.docx) to a folder.
     */
    public function storeTemplate(Request $request, $folderId)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $folder = SkFolder::findOrFail($folderId);

        $request->validate([
            'judul' => 'required|string|max:255',
            'file' => 'required|file|mimes:docx|max:10240',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $storedPath = $file->store('sk_surat/templates', 'local');

        $fullPath = Storage::path($storedPath);
        $variables = $this->skSuratService->extractVariables($fullPath);

        $template = SkTemplate::create([
            'folder_id' => $folder->id,
            'judul' => $request->judul,
            'file_path' => $storedPath,
            'file_name_original' => $originalName,
            'detected_variables' => $variables,
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', "Master template '{$template->judul}' berhasil diunggah dengan ".count($variables).' variabel terdeteksi.');
    }

    /**
     * Delete a master template.
     */
    public function destroyTemplate($id)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $template = SkTemplate::findOrFail($id);

        if ($template->file_path && Storage::exists($template->file_path)) {
            Storage::delete($template->file_path);
        }

        $template->delete();

        return back()->with('success', 'Master template berhasil dihapus.');
    }

    /**
     * Store dynamic document generated from template.
     */
    public function storeDokumen(Request $request, $folderId)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $folder = SkFolder::findOrFail($folderId);

        $validated = $request->validate([
            'template_id' => 'required|exists:sk_templates,id',
            'perihal' => 'required|string|max:255',
            'nomor_surat' => 'nullable|string|max:255',
            'tanggal_surat' => 'nullable|date',
            'data_isian' => 'nullable|array',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        // Auto-extract nomor_surat and tanggal_surat from data_isian if not explicitly passed
        $dataIsian = $request->input('data_isian', []);
        if (empty($validated['nomor_surat'])) {
            $validated['nomor_surat'] = $dataIsian['nomor_surat'] ?? $dataIsian['no_surat'] ?? $dataIsian['nomor'] ?? null;
        }
        if (empty($validated['tanggal_surat'])) {
            $rawDate = $dataIsian['tanggal_surat'] ?? $dataIsian['tanggal'] ?? $dataIsian['tgl_surat'] ?? null;
            if ($rawDate && strtotime($rawDate)) {
                $validated['tanggal_surat'] = date('Y-m-d', strtotime($rawDate));
            }
        }

        $validated['folder_id'] = $folder->id;
        $validated['tipe'] = 'generated';
        $validated['created_by'] = auth()->id();

        SkDokumen::create($validated);

        return back()->with('success', 'Dokumen surat berhasil dibuat.');
    }

    /**
     * Update dynamic document data isian.
     */
    public function updateDokumen(Request $request, $id)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $dokumen = SkDokumen::findOrFail($id);

        $validated = $request->validate([
            'perihal' => 'required|string|max:255',
            'nomor_surat' => 'nullable|string|max:255',
            'tanggal_surat' => 'nullable|date',
            'data_isian' => 'nullable|array',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $dataIsian = $request->input('data_isian', []);
        if (empty($validated['nomor_surat'])) {
            $validated['nomor_surat'] = $dataIsian['nomor_surat'] ?? $dataIsian['no_surat'] ?? $dataIsian['nomor'] ?? null;
        }
        if (empty($validated['tanggal_surat'])) {
            $rawDate = $dataIsian['tanggal_surat'] ?? $dataIsian['tanggal'] ?? $dataIsian['tgl_surat'] ?? null;
            if ($rawDate && strtotime($rawDate)) {
                $validated['tanggal_surat'] = date('Y-m-d', strtotime($rawDate));
            }
        }

        $dokumen->update($validated);

        return back()->with('success', 'Data dokumen berhasil diperbarui.');
    }

    /**
     * Upload scanned/physical archive file.
     */
    public function uploadArsip(Request $request, $folderId)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $folder = SkFolder::findOrFail($folderId);

        $request->validate([
            'perihal' => 'required|string|max:255',
            'nomor_surat' => 'nullable|string|max:255',
            'tanggal_surat' => 'nullable|date',
            'file' => 'required|file|mimes:pdf,docx,jpg,jpeg,png|max:15360',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $storedPath = $file->store('sk_surat/archives', 'local');

        SkDokumen::create([
            'folder_id' => $folder->id,
            'tipe' => 'uploaded',
            'perihal' => $request->perihal,
            'nomor_surat' => $request->nomor_surat,
            'tanggal_surat' => $request->tanggal_surat,
            'file_path' => $storedPath,
            'file_name_original' => $originalName,
            'keterangan' => $request->keterangan,
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Berkas arsip fisik berhasil diunggah.');
    }

    /**
     * Delete a document (generated or archive).
     */
    public function destroyDokumen($id)
    {
        abort_if(auth()->user()->isKepalaSekolah(), 403, 'Akses ditolak untuk Kepala Sekolah.');

        $dokumen = SkDokumen::findOrFail($id);

        if ($dokumen->file_path && Storage::exists($dokumen->file_path)) {
            Storage::delete($dokumen->file_path);
        }

        $dokumen->delete();

        return back()->with('success', 'Dokumen berhasil dihapus.');
    }

    /**
     * Download generated DOCX file.
     */
    public function downloadDocx($id)
    {
        $dokumen = SkDokumen::with('template')->findOrFail($id);

        if ($dokumen->tipe !== 'generated') {
            abort(400, 'Dokumen ini bukan dokumen hasil generate template.');
        }

        $tempPath = $this->skSuratService->generateDocx($dokumen);
        $downloadName = Str::slug($dokumen->perihal ?: 'surat').'.docx';

        return response()->download($tempPath, $downloadName)->deleteFileAfterSend(true);
    }

    /**
     * Export generated document to PDF.
     */
    public function exportPdf($id)
    {
        $dokumen = SkDokumen::with('template')->findOrFail($id);

        if ($dokumen->tipe !== 'generated') {
            abort(400, 'Dokumen ini bukan dokumen hasil generate template.');
        }

        $tempDocxPath = $this->skSuratService->generateDocx($dokumen);

        try {
            $tempPdfPath = $this->skSuratService->convertDocxToPdf($tempDocxPath);
            $downloadName = Str::slug($dokumen->perihal ?: 'surat').'.pdf';

            // Clean up docx temp file
            if (file_exists($tempDocxPath)) {
                @unlink($tempDocxPath);
            }

            return response()->download($tempPdfPath, $downloadName)->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            if (file_exists($tempDocxPath)) {
                @unlink($tempDocxPath);
            }
            report($e);

            return back()->with('error', 'Gagal mengekspor PDF: '.$e->getMessage().'. Anda dapat mengunduh format DOCX.');
        }
    }

    /**
     * Download uploaded physical archive file.
     */
    public function downloadArchive($id)
    {
        $dokumen = SkDokumen::findOrFail($id);

        if ($dokumen->tipe !== 'uploaded' || ! $dokumen->file_path || ! Storage::exists($dokumen->file_path)) {
            abort(404, 'Berkas arsip tidak ditemukan.');
        }

        return Storage::download($dokumen->file_path, $dokumen->file_name_original ?: 'dokumen_arsip');
    }
}
