# Design Spec: Integrasi RKAS Perubahan pada SIKAS AI Copilot

**Tanggal:** 2026-10-20  
**Status:** Approved  
**Author:** AI Copilot Team & Domain Lead  
**Terkait:** [`app/Services/Ai/CopilotService.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php), [`app/Config/VariantConfig.php`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Config/VariantConfig.php)

---

## 1. Konteks & Masalah
Pada sistem SIKAS, penganggaran sekolah memiliki dua fase:
1. **RKAS Awal (Murni)**: Model `Rkas` / tabel `rkas`. Digunakan sejak awal tahun anggaran untuk seluruh alokasi belanja.
2. **RKAS Perubahan / Pergeseran**: Model `RkasPerubahan` / tabel `rkas_perubahans`. Dibuat saat sekolah melakukan pergeseran anggaran di pertengahan tahun.
   - Sesuai regulasi dan arsitektur SIKAS: Tahap 1 (Januari–Juni) dikunci (*month-locked*), sedangkan perubahan/pergeseran kuota dan penambahan belanja terjadi di Tahap 2 (Juli–Desember).
   - Di tabel `*_buku_kas_umum_uraian_details`, transaksi belanja Tahap 1 dihubungkan melalui `rkas_id`, sedangkan belanja Tahap 2 dihubungkan melalui `rkas_perubahan_id` ([`VariantConfig::uraianDetailRkasFk`](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Config/VariantConfig.php#L255)).

**Masalah Saat Ini:**
- `CopilotService` selalu membaca model `Rkas` (RKAS Awal).
- Ketika sekolah merevisi anggaran (contoh: akun Benda Pos / Materai dinaikkan dari Rp 120.000 menjadi Rp 130.000 dengan penambahan 1 materai di bulan September), Copilot tetap membaca pagu Rp 120.000.
- Akibatnya, ketika realisasi BKU mencapai Rp 130.000, Copilot salah melaporkan terjadi "kelebihan belanja Rp 10.000", padahal realisasinya sah dan tepat 100% menurut RKAS Perubahan.
- Kegiatan yang digeser atau baru ditambahkan di Tahap 2 RKAS Perubahan juga tidak ditemukan saat pencarian kegiatan RKAS.

---

## 2. Sasaran Perubahan
1. **Deteksi RKAS Perubahan Otomatis**: Mendeteksi secara dinamis apakah sekolah memiliki data `RkasPerubahan` untuk tahun anggaran dan varian aktif.
2. **Penyelarasan Pagu ROB (`get_bkp_rob_monthly`)**:
   - Jika RKAS Perubahan ada, gunakan Pagu Perubahan sebagai pagu tahunan resmi.
   - Deteksi pergeseran per rekening belanja: bandingkan Pagu Awal vs Pagu Perubahan, dan berikan keterangan pergeseran (misal: `Pagu Rp 130.000 [Perubahan +Rp 10.000 dari Tahap 2]`).
   - Hitung sisa anggaran belanja terhadap Pagu Perubahan sehingga tidak timbul false positive "kelebihan belanja".
3. **Penyelarasan Ringkasan Pagu (`get_budget_pagu_summary`)**:
   - Melaporkan status dokumen anggaran yang sedang berlaku (`RKAS Perubahan` atau `RKAS Awal`).
   - Menyajikan total rencana anggaran belanja dan rincian per kelompok belanja dari RKAS aktif, serta total RKAS Awal sebagai pembanding jika terjadi perubahan.
4. **Pencarian Kegiatan Belanja (`search_rkas_activity`)**:
   - Menyesuaikan sumber pencarian: jika filter bulan adalah Tahap 1 (Jan–Jun), cari di `Rkas` Awal; jika Tahap 2 (Jul–Des) dan ada perubahan, cari di `RkasPerubahan`.
   - Jika tanpa filter bulan dan ada perubahan, tampilkan item aktif yang berlaku di tahun berjalan.
5. **Draf Transaksi Kuitansi BKU (`prepare_bku_transaction_draft` & `commitBkuTransaction`)**:
   - Tentukan penautan Foreign Key sesuai tanggal transaksi:
     * Tanggal di bulan Januari–Juni: hubungkan ke `rkas_id` (RKAS Awal).
     * Tanggal di bulan Juli–Desember: jika ada perubahan, hubungkan ke `rkas_perubahan_id` (RKAS Perubahan).
   - Validasi sisa kuota pagu belanja dihitung berdasarkan foreign key yang bersesuaian.

---

## 3. Detail Arsitektur & Implementasi Teknis

### 3.1. Helper Resolusi RKAS Aktif
Di `CopilotService`, dibuat metode pembantu:
```php
protected function getRkasContext(int $tahun, string $variant, ?int $bulanAngka = null): array
{
    VariantConfig::validateVariant($variant);
    $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
    $rkasClass = VariantConfig::getModelClass('rkas', $variant);
    $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
    $penganggaranFk = VariantConfig::penganggaranFk($variant);

    $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
    $hasPerubahan = $rkasPerubahanClass 
        && $penganggaran 
        && $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();

    // Tentukan apakah bulan berada di Tahap 2
    $isTahap2 = $bulanAngka !== null ? ($bulanAngka >= 7) : false;

    // Model untuk transaksi/kegiatan bulan spesifik
    $targetModelClass = ($isTahap2 && $hasPerubahan) ? $rkasPerubahanClass : $rkasClass;
    $usageFk = VariantConfig::uraianDetailRkasFk($variant, $isTahap2 && $hasPerubahan);

    return [
        'penganggaran' => $penganggaran,
        'has_perubahan' => $hasPerubahan,
        'rkas_class' => $rkasClass,
        'rkas_perubahan_class' => $rkasPerubahanClass,
        'active_pagu_class' => $hasPerubahan ? $rkasPerubahanClass : $rkasClass,
        'target_model_class' => $targetModelClass,
        'usage_fk' => $usageFk,
        'is_tahap_2' => $isTahap2,
    ];
}
```

### 3.2. Penyesuaian `get_bkp_rob_monthly`
1. Ambil pagu tahunan per rekening dari `$active_pagu_class`.
2. Jika `$has_perubahan` bernilai `true`:
   - Ambil juga pagu dari `$rkasClass` (Awal).
   - Hitung selisih: `$selisih = $paguPerubahan - $paguAwal`.
   - Tambahkan atribut pada `rekap_objek`:
     * `pagu_rkas`: Pagu Perubahan (misal: 130.000)
     * `pagu_awal`: Pagu Awal (misal: 120.000)
     * `selisih_perubahan`: +10.000
     * `status_pergeseran`: "Mengalami penambahan Rp 10.000 di RKAS Perubahan (Tahap 2)" jika `$selisih > 0`, atau "Pengurangan" jika `< 0`, atau "Tetap" jika `== 0`.
3. Total realisasi tahunan BKU dibandingkan dengan `pagu_rkas` (Perubahan).
   - Jika realisasi <= pagu perubahan, `is_over_budget = false`.

### 3.3. Penyesuaian `get_budget_pagu_summary`
1. Total rencana belanja dihitung dari `$active_pagu_class`.
2. Kembalikan data metadata:
   - `status_rkas`: `'RKAS Perubahan'` jika ada perubahan, `'RKAS Awal (Murni)'` jika belum.
   - `total_rencana_rkas_aktif`: total nominal.
   - `total_rencana_rkas_awal`: total nominal awal jika ada perubahan.
   - `perubahan_tahap_2`: nominal perubahan di semester kedua.

### 3.4. Penyesuaian `search_rkas_activity`
1. Jika parameter `$bulan` diberikan:
   - Bulan Jan–Jun -> cari di `rkas` awal.
   - Bulan Jul–Des -> jika `$hasPerubahan`, cari di `rkas_perubahans`, sertakan sisa pagu yang dihitung dari kolom `rkas_perubahan_id` di `bku_uraian_details`.
2. Jika parameter `$bulan` kosong:
   - Jika `$hasPerubahan`, cari di item aktif gabungan (Jan–Jun awal + Jul–Des perubahan).

### 3.5. Penyesuaian `prepare_bku_transaction_draft` & `commitBkuTransaction`
1. Ekstraksi bulan dari tanggal transaksi (`tanggal`):
   - Jika bulan >= 7 dan `$hasPerubahan` ada:
     * `rkas_model` = `RkasPerubahan`
     * Field di `bku_uraian_details` yang diisi adalah `rkas_perubahan_id`
     * Field `rkas_id` diisi `null`
   - Jika bulan 1–6 atau belum ada perubahan:
     * `rkas_model` = `Rkas`
     * Field di `bku_uraian_details` yang diisi adalah `rkas_id`
     * Field `rkas_perubahan_id` diisi `null`

---

## 4. Rencana Pengujian
1. **Unit / Integration Test (Script Scratch)**:
   - Validasi data Benda Pos (ID 12) di tahun 2025:
     * Pagu Awal: Rp 120.000
     * Pagu Perubahan: Rp 130.000
     * Realisasi BKU: Rp 130.000
     * Hasil ROB Copilot harus menampilkan Pagu Rp 130.000, Realisasi Rp 130.000, Sisa Rp 0 (TIDAK ADA kelebihan belanja).
2. **Pencarian Kegiatan**:
   - Cari item kegiatan di bulan September (Tahap 2): harus menampilkan kuota dari RKAS Perubahan.
3. **Pagu Summary**:
   - Harus melaporkan status aktif `RKAS Perubahan` untuk tahun 2025.
4. **PHP Linter & Pint**:
   - Memastikan tidak ada syntax error dan format kode rapi.

---

## 5. Review & Approval
- User approval: **Setuju** (2026-10-20)
- Langkah selanjutnya: Penyusunan Implementation Plan.
