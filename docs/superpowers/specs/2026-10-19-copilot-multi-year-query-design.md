# Desain Spesifikasi: Dukungan Kueri Multi-Tahun pada SIKAS AI Copilot

## 1. Konteks & Latar Belakang
Pada sistem SIKAS AI Copilot sebelumnya, sesi obrolan menerima parameter `$tahun` dari halaman web yang sedang aktif (misalnya tahun 2026). Di sisi lain:
1. System prompt mengunci konteks hanya pada satu tahun: *"Aplikasi saat ini mengelola dana BOSP {$variantTitle} Tahun Anggaran {$tahun}."*
2. Seluruh definisi tools function calling (`get_budget_pagu_summary`, `get_bku_monthly_realization`, `get_bkp_bank_monthly`, `get_bkp_tunai_monthly`, `search_rkas_activity`, `query_realization_comparison`) tidak memiliki parameter `tahun`.
3. Dispatcher `executeTool` selalu mengoper `$tahun` sesi aktif ke fungsi backend.

Akibatnya, ketika pengguna menanyakan data tahun lampau (seperti tahun 2025: *"Berapa pagu tahun 2025?"*, *"Tampilkan realisasi BKU 2025"*, atau komparasi 2025 vs 2026), AI mengira sistem hanya beroperasi di tahun 2026 dan menolak atau tidak mampu mengambil data tahun 2025.

Padahal di database PostgreSQL, data tahun 2025 tersimpan lengkap:
- Data penganggaran 2025: Pagu Anggaran Rp 31.320.000.
- Data Buku Kas Umum (BKU) 2025: 74 transaksi pembukuan.

Dokumen ini merumuskan penambahan kapabilitas kueri multi-tahun agar AI Copilot secara cerdas dapat mengakses data tahun aktif maupun tahun-tahun lampau yang tersedia di database.

---

## 2. Sasaran & Kriteria Keberhasilan
1. **Parameter `tahun` Opsional pada Tools:** Setiap tool pembacaan data (`get_budget_pagu_summary`, `get_bku_monthly_realization`, `get_bkp_bank_monthly`, `get_bkp_tunai_monthly`, `search_rkas_activity`, `query_realization_comparison`) mendukung parameter opsional `tahun`.
2. **Kesadaran Multi-Tahun pada Prompt:** AI mengetahui tahun aktif saat ini sebagai default, sekaligus mengetahui daftar tahun anggaran lain yang tersedia di database (misal: `2025, 2026`).
3. **Eksekusi Dinamis:** Jika pengguna tidak menyebut tahun, AI menggunakan tahun aktif. Jika pengguna menyebut tahun tertentu (misal: "tahun 2025"), AI secara otomatis mengirimkan `tahun: 2025` ke tool terkait.
4. **Respon Akurat Data Lampau:** AI dapat menampilkan pagu 2025, kuitansi BKU 2025, buku bank 2025, dan buku kas tunai 2025 dengan format tabel HTML resmi.

---

## 3. Arsitektur & Spesifikasi Teknis

### 3.1. Penyesuaian Schema Function Calling Tools
Pada `CopilotService::getAvailableTools()`, setiap tool berikut ditambahkan properti `tahun`:
```json
"tahun": {
    "type": "integer",
    "description": "Tahun anggaran data yang diminta (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini."
}
```
Tools yang diperbarui:
1. `get_budget_pagu_summary`
2. `get_bku_monthly_realization`
3. `get_bkp_bank_monthly`
4. `get_bkp_tunai_monthly`
5. `search_rkas_activity`
6. `query_realization_comparison`

### 3.2. Deteksi Tahun Database & Pembaruan System Prompt
Pada `CopilotService::chat()`:
1. Ambil daftar tahun yang tersedia:
   ```php
   $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
   $availableYears = $penganggaranClass::orderBy('tahun_anggaran', 'asc')->pluck('tahun_anggaran')->toArray();
   $daftarTahunStr = ! empty($availableYears) ? implode(', ', $availableYears) : (string) $tahun;
   ```
2. Injeksi informasi multi-tahun ke `$systemPrompt`:
   ```text
   Aplikasi saat ini mengelola dana BOSP {$variantTitle}.
   Tahun Anggaran aktif di layar adalah {$tahun}.
   Sistem database juga menyimpan arsip data resmi untuk tahun anggaran: {$daftarTahunStr}.
   
   ATURAN TAHUN ANGGARAN:
   - Gunakan Tahun Anggaran aktif ({$tahun}) sebagai default jika pengguna tidak menyebutkan tahun secara spesifik.
   - Jika pengguna menanyakan data tahun anggaran lain yang tersedia di arsip (misalnya tahun 2025, atau perbandingan antar tahun), Anda BISA dan WAJIB mengakses data tahun tersebut dengan menyertakan parameter `tahun` pada tool yang relevan (contoh: tahun: 2025).
   - Jangan pernah mengatakan Anda hanya bisa mengakses tahun {$tahun} jika data tahun yang ditanyakan pengguna tersedia di database.
   ```

### 3.3. Penyesuaian Dispatcher `executeTool`
Di `CopilotService::executeTool()`:
```php
$targetTahun = ! empty($args['tahun']) ? (int) $args['tahun'] : $tahun;

return match ($name) {
    'get_budget_pagu_summary' => $this->getBudgetPaguSummary($targetTahun, $variant),
    'get_bku_monthly_realization' => $this->getBkuMonthlyRealization($targetTahun, $args['bulan'] ?? 'Maret', $variant),
    'get_bkp_bank_monthly' => $this->getBkpBankMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
    'get_bkp_tunai_monthly' => $this->getBkpTunaiMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
    'search_rkas_activity' => $this->searchRkasActivity($targetTahun, $args['query'] ?? '', $variant, $args['bulan'] ?? null),
    'query_realization_comparison' => $this->queryRealizationComparison($targetTahun, $variant, $args['group_by'] ?? 'triwulan'),
    ...
};
```

---

## 4. Keamanan & Kualitas
- Tetap mematuhi aturan sanitasi variabel sistem, pencegahan kode database/SQL, dan format tabel HTML standar Rupiah.
- Kompatibel dengan seluruh varian penganggaran (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).
