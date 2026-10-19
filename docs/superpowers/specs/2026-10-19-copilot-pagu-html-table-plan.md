# Implementation Plan: Tool Pagu Anggaran & Render HTML Table pada AI Copilot

**Tanggal:** 19 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-19-copilot-pagu-html-table-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-pagu-html-table-design.md)  
**Status:** Siap Dieksekusi  

---

## Ringkasan Proyek
Menyempurnakan SIKAS AI Copilot (DeepSeek-V3) dengan:
1. **Tool Baru `get_budget_pagu_summary`**: Menyediakan data resmi murni mengenai total pagu anggaran BOSP, alokasi per tahap (Tahap 1 & 2), dan kelompok belanja RKAS (Barang & Jasa vs Modal).
2. **Pemisahan Intent pada System Prompt**: Memastikan pertanyaan seperti *"Berapa pagu anggaran saya?"* hanya memanggil tool pagu dan tidak menampilkan grafik realisasi belanja jika tidak diminta.
3. **Format Standar Tabel HTML pada Output AI**: Menginstruksikan AI menyajikan data tabular dengan tag semantik `<table>`.
4. **Komponen `HtmlMessageRenderer` di Frontend ([CopilotDrawer.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx))**: Menampilkan pesan HTML terstruktur secara aman, responsif, dan rapi sesuai desain sistem Tailwind (termasuk dukungan tema gelap/dark mode).

---

## Tahapan Implementasi Detail

### Tahap 1: Backend - Tool `get_budget_pagu_summary` di `CopilotService.php`
- [ ] Buka `app/Services/Ai/CopilotService.php`.
- [ ] Tambahkan definisi function tool `get_budget_pagu_summary` ke dalam array return method `getAvailableTools()`.
- [ ] Implementasikan method proteksi `getBudgetPaguSummary(int $tahun, string $variant): array`:
  - Ambil model `Penganggaran`, `PenerimaanDana`, dan `Rkas` sesuai varian aktif via `VariantConfig`.
  - Ambil pagu penetapan pendapatan dari tabel penganggaran.
  - Ambil alokasi tahap 1 dan tahap 2 dari tabel penerimaan dana.
  - Hitung total rencana belanja RKAS serta agregasi kelompok belanja (Barang & Jasa vs Modal).
  - Return ringkasan data yang terstruktur rapi.
- [ ] Daftarkan dispatcher `get_budget_pagu_summary` di dalam method `executeTool()`.

### Tahap 2: Backend - Penajaman System Prompt di `CopilotService.php`
- [ ] Perbarui instruksi di `$systemPrompt`:
  - Bedakan secara tegas antara intent:
    * Pertanyaan **Pagu Anggaran / Penetapan**: Panggil `get_budget_pagu_summary`.
    * Pertanyaan **Realisasi / Serapan Belanja**: Panggil `query_realization_comparison`.
    * Pertanyaan **Kegiatan / Sisa Pagu Spesifik**: Panggil `search_rkas_activity`.
  - Tambahkan instruksi pemformatan HTML:
    * Wajib menggunakan format tabel HTML (`<table><thead>...</thead><tbody>...</tbody></table>`) jika menyajikan perbandingan data atau daftar lebih dari 1 baris.
    * Nominal diformat rupiah (contoh: `Rp 150.000.000`) dengan alignment rata kanan.
    * Menggunakan tag HTML semantik (`<p>`, `<ul>`, `<li>`, `<strong>`, `<span class="...">`).

### Tahap 3: Frontend - Sanitized HTML Table Renderer di `CopilotDrawer.tsx`
- [ ] Buka `resources/js/Components/Ai/CopilotDrawer.tsx`.
- [ ] Buat sub-komponen `HtmlChatContent({ content }: { content: string })`:
  - Melakukan sanitasi string HTML untuk membuang tag berbahaya (`<script>`, `<iframe>`, atribut event `on*`).
  - Merender HTML menggunakan `dangerouslySetInnerHTML` pada container aman dengan class `.ai-html-content`.
  - Menghandle line breaks otomatis untuk paragraf biasa.
- [ ] Tambahkan styling CSS pendukung untuk elemen `.ai-html-content`:
  - Styling `table`, `thead`, `tbody`, `tr`, `th`, `td` dengan border halus, padding rapi, dan background adaptif.
  - Bungkus tabel dalam elemen `<div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 my-2">` agar responsif.
  - Dukungan warna font dan border kontras untuk dark mode.
- [ ] Ganti `<div className="whitespace-pre-wrap">{msg.content}</div>` dengan `<HtmlChatContent content={msg.content} />`.

### Tahap 4: Pengujian & Verifikasi
- [ ] Uji eksekusi method `getBudgetPaguSummary` via testing script dengan database PostgreSQL lokal.
- [ ] Jalankan build frontend `npm run build` untuk memverifikasi tidak ada error TypeScript atau syntax JSX.
- [ ] Uji respons AI Copilot dengan pertanyaan pagu dan verifikasi bahwa:
  1. Data pagu yang muncul murni pagu penetapan (bukan grafik serapan).
  2. Data disajikan dalam bentuk tabel HTML yang rapi, sejajar, dan responsif.
