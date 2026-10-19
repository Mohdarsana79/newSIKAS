# Implementation Plan: SIKAS AI DeepSeek Suite (Fase 2: Agentic Copilot Transaksi & Text-to-Analytics)

**Tanggal:** 19 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-19-sikas-ai-copilot-analytics-phase2-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-sikas-ai-copilot-analytics-phase2-design.md)  
**Status:** Menunggu Persetujuan Pengguna Sebelum Eksekusi  

---

## Ringkasan Proyek
Mengimplementasikan **Fase 2** dari SIKAS AI DeepSeek Suite:
1. **Agentic Copilot Penatausahaan (DeepSeek-V3 Function Calling):** Penyusunan draf transaksi belanja dan perhitungan pajak otomatis melalui instruksi bahasa alami dengan dialog persetujuan *staging card*.
2. **Text-to-Analytics Keuangan Eksekutif:** Tanya jawab performa keuangan yang menyajikan narasi formal, KPI cards, dan grafik interaktif mini `ApexCharts`.
3. **Floating Copilot Drawer Global:** Komponen slide-over yang tertanam di seluruh halaman aplikasi via `AuthenticatedLayout.tsx` dengan penyimpanan riwayat sesi obrolan di `localStorage`.

---

## Tahapan Implementasi Detail

### Tahap 1: Penambahan Kapabilitas Tool Calling di `DeepSeekService.php`
- [ ] Buka `app/Services/Ai/DeepSeekService.php`.
- [ ] Tambahkan method `callChatWithTools(string $apiKey, array $messages, array $tools = [], array $options = []): array`:
  - Mendukung parameter resmi DeepSeek `tools` (skema fungsi OpenAI compatible).
  - Menangani parsing respons `tool_calls` dan penanganan `function` arguments JSON.

### Tahap 2: Layanan Copilot & Eksekutor Tool (`CopilotService.php`)
- [ ] Buat class `app/Services/Ai/CopilotService.php`:
  - Definisikan 4 spesifikasi tools resmi untuk DeepSeek-V3:
    * `search_rkas_activity`
    * `calculate_tax_recommendation`
    * `prepare_bku_transaction_draft`
    * `query_realization_comparison`
  - Implementasikan eksekutor backend untuk masing-masing tool sesuai varian aktif (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`):
    * `searchRkasActivity(int $tahun, string $query, string $variant): array`
    * `calculateTaxRecommendation(float $amount, string $itemType, bool $isPkp, bool $hasNpwp): array`
    * `prepareBkuDraft(array $params, string $variant, int $tahun): array`
    * `queryRealizationComparison(int $tahun, string $variant, string $groupBy): array`
  - Implementasikan loop orkestrasi pemanggilan model dan eksekusi tool sampai menghasilkan pesan final dan/atau payload interaktif (*staging card* / *chart*).

### Tahap 3: Controller & Rute Backend
- [ ] Buat controller `app/Http/Controllers/AiCopilotController.php`:
  - Resolusi varian aktif via `app('variant')` dan `VariantConfig`.
  - Method `chat(Request $request)`: menerima array `messages`, memvalidasi API Key pengguna, memanggil `CopilotService`, dan mengembalikan pesan respons asisten.
  - Method `commitTransaction(Request $request)`: menerima payload draf yang dikonfirmasi pengguna, lalu menyimpan entri transaksi ke tabel `buku_kas_umums` dan `buku_kas_umum_uraian_details` dalam `DB::transaction()`.
  - Method `getQuickContext(Request $request)`: mengambil statistik ringkas pagu dan kas untuk rekomendasi prompt awal.
- [ ] Daftarkan rute di `routes/variant.php`:
  - `POST /api/ai/copilot/chat` (`api.ai.copilot.chat`)
  - `POST /api/ai/copilot/commit` (`api.ai.copilot.commit`)
  - `GET /api/ai/copilot/context` (`api.ai.copilot.context`)

### Tahap 4: Antarmuka Pengguna (UI/UX)
- [ ] Buat komponen `resources/js/Components/Ai/CopilotDrawer.tsx`:
  - Floating Action Button (FAB) di kanan bawah dengan ikon `Sparkles` dan label status.
  - Slide-over Drawer dengan header model aktif (`DeepSeek-V3`), varian aktif, dan tombol *"Mulai Obrolan Baru"*.
  - Rekomendasi prompt cepat (*quick suggestion chips*).
  - Komponen gelembung obrolan:
    * Teks markdown respons.
    * Komponen `StagingCard`: Pratinjau draf transaksi BKU dengan tombol `[✅ Konfirmasi & Simpan ke BKU]` dan `[✏️ Form BKU]`.
    * Komponen `MiniAnalyticsChart`: Merender grafik mini batang/perbandingan menggunakan `react-apexcharts`.
  - Form input dengan textarea auto-expand dan tombol kirim.
  - Sinkronisasi riwayat obrolan sesi ke `localStorage` per user dan varian.
- [ ] Pasang `CopilotDrawer` ke dalam `resources/js/Layouts/AuthenticatedLayout.tsx` agar tersedia di semua halaman aplikasi.

### Tahap 5: Verifikasi & Uji Coba
- [ ] Uji coba tanya jawab umum keuangan ("Berapa saldo kas dan sisa pagu kegiatan sarpras?").
- [ ] Uji coba instruksi pembuatan transaksi belanja (misal: "Catat belanja snack rapat Rp 300.000 tunai ke Toko Berkah").
- [ ] Verifikasi kartu draf transaksi muncul dengan kalkulasi sisa pagu dan pajak yang tepat.
- [ ] Uji klik tombol `[Konfirmasi & Simpan ke BKU]` dan pastikan transaksi benar-benar tersimpan ke database BKU.
- [ ] Uji pertanyaan perbandingan serapan belanja dan pastikan grafik mini ApexCharts tampil interaktif.
- [ ] Jalankan `npm run build` untuk memverifikasi kompilasi TypeScript dan Vite.
