# Spesifikasi Desain: Tool Pagu Anggaran & Render HTML Table pada AI Copilot

**Tanggal**: 19 Oktober 2026  
**Status**: Approved (Hasil Brainstorming & Grilling)  
**Dokumen Terkait**: [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php), [CopilotDrawer.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx)

---

## 1. Latar Belakang & Masalah

Pada penggunaan **SIKAS AI Copilot (DeepSeek-V3)** di Penatausahaan, ditemukan dua kebutuhan penyempurnaan utama:

1. **Ketidaksesuaian Respon (Intent Misalignment)**:
   - Pengguna menanyakan: *"Berapa pagu anggaran saya?"*.
   - Saat ini, AI Copilot tidak memiliki tool khusus untuk mengambil murni data **Pagu Anggaran Penetapan**. Akibatnya, AI memanggil tool analitik `query_realization_comparison` atau `search_rkas_activity`, sehingga jawaban yang muncul justru memaksakan grafik/tabel **realisasi serapan belanja** yang belum tentu diminta pengguna.
2. **Kerapian Format Tampilan Pesan (HTML Table Rendering)**:
   - Pengguna meminta agar jawaban AI yang memuat data terstruktur (seperti rekap pagu atau daftar kegiatan) disajikan dalam format **tabel HTML yang rapi**.
   - Di frontend ([CopilotDrawer.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx)), pesan saat ini hanya dirender dalam `<div className="whitespace-pre-wrap">{msg.content}</div>`, sehingga tag `<table>` atau format Markdown pipe tidak terformat dan hanya tampil sebagai teks mentah.

---

## 2. Tujuan & Ruang Lingkup

1. Menambahkan tool function calling baru: `get_budget_pagu_summary` di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php).
2. Memisahkan secara tegas panduan intent pada System Prompt AI:
   - Pertanyaan seputar **Pagu / Penetapan Anggaran** $\rightarrow$ memanggil `get_budget_pagu_summary`.
   - Pertanyaan seputar **Realisasi / Serapan Belanja / Komparasi** $\rightarrow$ memanggil `query_realization_comparison`.
   - Pencarian **Sisa Pagu Kegiatan / Akun Belanja Spesifik** $\rightarrow$ memanggil `search_rkas_activity`.
3. Memperbarui panduan output AI agar menyajikan data perbandingan dan rekapitulasi dalam format tag `<table>` HTML semantik standar.
4. Membangun komponen `HtmlMessageRenderer` di [CopilotDrawer.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Ai/CopilotDrawer.tsx) yang secara aman mem-parsing dan merender tag HTML dengan preset styling Tailwind (responsive overflow, zebra stripe, dark mode support).

---

## 3. Rancangan Arsitektur & Teknis

### A. Backend: Tool `get_budget_pagu_summary`

#### 1. Definisi Function Tool pada `getAvailableTools()`
```php
[
    'type' => 'function',
    'function' => [
        'name' => 'get_budget_pagu_summary',
        'description' => 'Mengambil ringkasan data resmi Pagu Anggaran BOSP tahun anggaran aktif (Total penetapan pendapatan, rencana belanja RKAS, alokasi per tahap dan per kelompok belanja) tanpa memunculkan analitik serapan/realisasi kecuali diminta.',
        'parameters' => [
            'type' => 'object',
            'properties' => (object) [],
        ],
    ],
]
```

#### 2. Implementasi Method `getBudgetPaguSummary(int $tahun, string $variant)`
- **Model yang digunakan**:
  - `Penganggaran`: mengambil `total_anggaran` / `pendapatan`.
  - `PenerimaanDana`: mengambil alokasi per tahap (Tahap 1, Tahap 2).
  - `Rkas`: menjumlahkan total pagu belanja yang telah dirinci di RKAS (`jumlah * harga_satuan`), dikelompokkan ke:
    - Belanja Operasi / Barang & Jasa (`kode_rekening` diawali `5.1.02`)
    - Belanja Modal / Aset (`kode_rekening` diawali `5.2`)
    - Belanja Lainnya jika ada.
- **Payload Return**:
  ```json
  {
      "tahun": 2026,
      "variant": "reguler",
      "pagu_total": 450000000,
      "rencana_belanja_rkas": 450000000,
      "tahap_1": 225000000,
      "tahap_2": 225000000,
      "kelompok_belanja": [
          {"nama": "Belanja Barang dan Jasa", "pagu": 350000000, "persen": 77.78},
          {"nama": "Belanja Modal", "pagu": 100000000, "persen": 22.22}
      ],
      "status_penganggaran": "Aktif / Terverifikasi"
  }
  ```

#### 3. Penyesuaian System Prompt di `CopilotService.php`
- Menegaskan aturan intent:
  - *Jika pengguna bertanya "Berapa pagu anggaran saya?", "Berapa dana BOSP tahun ini?", dll $\rightarrow$ panggil `get_budget_pagu_summary`.*
  - *JANGAN memanggil `query_realization_comparison` kecuali pengguna secara eksplisit meminta data realisasi, serapan, atau perbandingan antar triwulan.*
- Instruksi format HTML:
  - *Jika menampilkan data angka lebih dari 1 baris, gunakan tabel HTML `<table class="sikas-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>`.*
  - *Format rupiah: `Rp xx.xxx.xxx` rata kanan.*

---

### B. Frontend: HTML Table Renderer di `CopilotDrawer.tsx`

#### 1. Komponen Sanitizer & Renderer
Membuat sub-komponen `HtmlChatContent` yang merender konten pesan:
- Membersihkan string dari script atau atribut event berbahaya (`<script>`, `onload`, `onerror`, `onclick`).
- Mengizinkan elemen presentasional: `table`, `thead`, `tbody`, `tr`, `th`, `td`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `span`, `br`, `hr`, `code`.

#### 2. Styling Tabel Modern (Tailwind)
Menambahkan wrapper dan CSS class khusus pada container chat:
```css
/* Styling otomatis untuk table di dalam chat bubble AI */
.ai-html-content table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
}
.ai-html-content th {
    background-color: rgba(241, 245, 249, 0.9);
    padding: 0.375rem 0.625rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(226, 232, 240, 1);
}
.ai-html-content td {
    padding: 0.375rem 0.625rem;
    border-bottom: 1px solid rgba(241, 245, 249, 1);
}
/* Dark mode adaptation */
.dark .ai-html-content th {
    background-color: rgba(30, 41, 59, 0.8);
    border-color: rgba(51, 65, 85, 1);
}
.dark .ai-html-content td {
    border-color: rgba(51, 65, 85, 0.5);
}
```
Setiap tabel secara otomatis dibungkus dengan `<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 my-2">` agar tidak terpotong pada layar mobile atau drawer sempit.

---

## 4. Rencana Pengujian & Validasi

1. **Uji Intent Pagu Anggaran**:
   - Kirim prompt: *"Berapa pagu anggaran saya tahun ini?"*.
   - Verifikasi: AI memanggil `get_budget_pagu_summary` dan menampilkan tabel Pagu Total, Rincian Tahap 1 & 2, serta alokasi kelompok belanja tanpa memunculkan chart realisasi.
2. **Uji Intent Realisasi**:
   - Kirim prompt: *"Bandingkan realisasi serapan belanja per triwulan"*.
   - Verifikasi: AI memanggil `query_realization_comparison` dan menyajikan grafik ApexCharts.
3. **Uji Visual HTML Table**:
   - Verifikasi: Pesan tabel tampil dengan border halus, header kontras, nominal rata kanan, rapi, dan responsive pada mode terang maupun mode gelap.
