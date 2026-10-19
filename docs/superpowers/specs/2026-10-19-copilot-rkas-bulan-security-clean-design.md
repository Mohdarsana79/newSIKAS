# Spesifikasi Desain: Pencarian RKAS Berdasarkan Bulan, Keamanan SQL Injection, dan Pembersihan Istilah Teknis

**Tanggal**: 19 Oktober 2026  
**Status**: Approved (Hasil Brainstorming & Grilling)  
**Dokumen Terkait**: [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php), [HasRkasBehavior.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Models/Traits/HasRkasBehavior.php)

---

## 1. Latar Belakang & Masalah

Pengguna melaporkan kendala dan kebutuhan keamanan/tampilan pada **SIKAS AI Copilot**:

1. **Pencarian Data RKAS Berdasarkan Bulan Gagal**:
   - Saat pengguna meminta: *"Tampilkan data RKAS awal bulan Maret"*, AI Copilot tidak dapat menemukannya.
   - Analisis akar masalah:
     - Method `searchRkasActivity` hanya mencari kata kunci pada kolom `uraian`, `kode_kegiatans.uraian`, `kode_kegiatans.sub_program`, dan `rekening_belanjas.rincian_objek`.
     - Skema tabel RKAS di SIKAS menyimpan alokasi bulan pada kolom `bulan` dengan nilai string nama bulan Indonesia (`'Januari'`, `'Februari'`, `'Maret'`, dst.).
     - Tool `search_rkas_activity` sebelumnya tidak memiliki parameter `bulan`, tidak memfilter kolom `bulan`, dan tidak mengembalikan nama bulan pada payload hasilnya.
2. **Keamanan dari SQL Injection**:
   - Parameter pencarian dari pengguna harus diproteksi secara menyeluruh dari potensi SQL injection melalui prepared statements, parameterized binding, dan escaping karakter wildcard (`%`, `_`).
3. **Pembersihan Tampilan dari Kode dan Nama Variabel Teknis**:
   - AI Copilot terkadang masih menyebutkan nama variabel teknis (misal `$rkas_id`, `$spent`, `rkas_id`, `kode_rekening_id`) atau cuplikan query SQL di dalam obrolan.
   - Pengguna menginginkan antarmuka yang 100% profesional dan bersih, bebas dari istilah internal developer atau cuplikan kode.

---

## 2. Tujuan & Ruang Lingkup

1. **Perluasan Tool `search_rkas_activity`**:
   - Menambahkan parameter opsional `bulan` (enum whitelist: 12 nama bulan resmi).
   - Menjadikan parameter `query` opsional jika `bulan` diberikan (sehingga pengguna bisa mencari *"Semua kegiatan bulan Maret"* tanpa harus mengetik nama barang).
   - Menambahkan kolom `bulan` ke dalam hasil return array `items`.
2. **Pencegahan SQL Injection**:
   - Validasi ketat nama bulan terhadap whitelist resmi.
   - Escaping karakter wildcard pada `query` via `addcslashes($query, '%_\\')`.
   - Menggunakan parameterized prepared statements murni pada seluruh query Eloquent / DB.
   - Strict casting integer untuk parameter tahun dan IDs.
3. **Pembersihan Istilah Teknis & Nama Variabel**:
   - Memperketat instruksi System Prompt AI untuk melarang penyebutan nama variabel internal, query SQL, atau format JSON mentah.
   - Menambahkan fungsi sanitasi post-processing `cleanResponseFromCodeAndVariables` di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php) untuk secara otomatis membersihkan nama variabel teknis jika model secara tidak sengaja mengeluarkannya.

---

## 3. Rancangan Arsitektur & Teknis

### A. Backend: Perluasan `search_rkas_activity` & SQL Protection

#### 1. Definisi Tool di `getAvailableTools()`
```php
[
    'type' => 'function',
    'function' => [
        'name' => 'search_rkas_activity',
        'description' => 'Mencari rincian kegiatan dan akun belanja pada RKAS tahun anggaran aktif berdasarkan kata kunci uraian/kegiatan dan/atau filter alokasi bulan penganggaran (Januari s/d Desember).',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'Kata kunci nama kegiatan, barang, atau rekening belanja (opsional jika bulan diisi).',
                ],
                'bulan' => [
                    'type' => 'string',
                    'enum' => [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ],
                    'description' => 'Nama bulan penganggaran RKAS (Januari sampai Desember).',
                ],
            ],
        ],
    ],
]
```

#### 2. Query Builder Aman & Filter Bulan
- Whitelist bulan resmi:
  ```php
  $validMonths = [
      'januari' => 'Januari', 'februari' => 'Februari', 'maret' => 'Maret',
      'april' => 'April', 'mei' => 'Mei', 'juni' => 'Juni',
      'juli' => 'Juli', 'agustus' => 'Agustus', 'september' => 'September',
      'oktober' => 'Oktober', 'november' => 'November', 'desember' => 'Desember',
  ];
  ```
- Normalisasi dan validasi:
  - Jika parameter `bulan` diberikan atau kata nama bulan terdeteksi pada teks query, cocokkan dengan whitelist.
  - Terapkan `where('bulan', $matchedMonth)` dengan prepared statement.
  - Untuk kata kunci teks, lakukan sanitasi:
    ```php
    $escaped = addcslashes($queryClean, '%_\\');
    $query->whereRaw('LOWER(uraian) LIKE ?', ["%{$escaped}%"]);
    ```
- Sertakan kolom `bulan` dalam hasil return array `items`.

---

### B. Backend: Pembersihan Kode & Nama Variabel Teknis

#### 1. Penajaman System Prompt di `CopilotService.php`
Menambahkan aturan eksplisit pada bagian Karakter & Pedoman Kerja:
- **LARANGAN TEKNIS**: Dilarang keras menyebutkan kode pemrograman, query SQL, nama variabel teknis (seperti `$spent`, `$rkas_id`, `rkas_id`, `kode_rekening_id`, `bkuDetailFk`), atau nama tabel database.
- **TERMINOLOGI HUMANIS**: Gunakan bahasa Indonesia resmi penatausahaan keuangan:
  - Gunakan *"ID Kegiatan"* alih-alih *"rkas_id"*.
  - Gunakan *"Sisa Anggaran"* alih-alih *"sisa_pagu"* atau *"$remaining"*.
  - Gunakan *"Realisasi Belanja"* alih-alih *"terealisasi"* atau *"$spent"*.

#### 2. Sanitasi Post-Processing di `CopilotService.php`
Sebelum mengembalikan teks konten respons ke antarmuka pengguna, jalankan method:
```php
protected function sanitizeResponseText(string $text): string
{
    // 1. Bersihkan variabel PHP ($varName)
    $text = preg_replace('/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/', '', $text);

    // 2. Samarkan technical key names
    $replacements = [
        '/\brkas_id\b/i' => 'ID Kegiatan',
        '/\bbku_id\b/i' => 'ID Transaksi BKU',
        '/\bkode_rekening_id\b/i' => 'Kode Rekening',
        '/\bkode_kegiatan_id\b/i' => 'Kode Kegiatan',
        '/\bsisa_pagu\b/i' => 'Sisa Anggaran',
        '/\btotal_anggaran\b/i' => 'Total Anggaran',
    ];
    $text = preg_replace(array_keys($replacements), array_values($replacements), $text);

    // 3. Bersihkan cuplikan raw SQL jika ada
    $text = preg_replace('/SELECT\s+.*?\s+FROM\s+.*?(?:WHERE.*?)?;?/is', '', $text);

    return trim($text);
}
```

---

## 4. Rencana Pengujian & Validasi

1. **Uji Pencarian RKAS Berdasarkan Bulan**:
   - Kirim prompt: *"Tampilkan data RKAS awal bulan Maret"*.
   - Verifikasi: AI memanggil `search_rkas_activity` dengan `bulan: 'Maret'`, menampilkan daftar kegiatan yang dianggarkan pada bulan Maret dalam tabel HTML scrollable yang rapi.
2. **Uji Keamanan SQL Injection**:
   - Kirim input manipulatif: `query: "' OR 1=1 --"`.
   - Verifikasi: Sistem memperlakukan input secara literal aman sebagai teks pencarian, tanpa mengeksekusi sintaks SQL liar.
3. **Uji Pembersihan Nama Variabel**:
   - Verifikasi: Respons asisten sama sekali tidak memuat awalan `$` atau nama kunci teknis seperti `rkas_id` atau query database.
