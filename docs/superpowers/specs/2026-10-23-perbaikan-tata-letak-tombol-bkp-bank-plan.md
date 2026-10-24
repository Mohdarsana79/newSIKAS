# Rencana Implementasi: Perbaikan Tata Letak Tombol Menu Buku Kas Pembantu Bank (BKP Bank)

Dokumen ini berisi analisis penyebab tombol berantakan pada toolbar Buku Kas Bank, konsep solusi tata letak 2 baris terstruktur yang dipilih, rancangan kode diff lengkap, dan panduan pengujian.

---

## 1. Analisis Masalah (Problem Analysis)

### Gejala yang Terlihat pada Screenshot:
1. Pada tab **BKP Bank** di halaman Rekapan BKU, terdapat 5 tombol menu:
   - `[ ✨ Pra-Audit AI (DeepSeek-R1) ]` (panjang: ~230px)
   - `[ 💲 Check Saldo Awal ]` (panjang: ~180px)
   - `[ ✓ Check STS ]` (panjang: ~130px)
   - `[ 📄 Export Excel ]` (panjang: ~135px)
   - `[ 🖨️ CETAK BKP BANK ]` (panjang: ~170px)
2. Kelima tombol tersebut disatukan di dalam satu container flex:
   `flex flex-col md:flex-row justify-between items-center`
   dengan tombol di sisi kanan: `mt-4 md:mt-0 flex flex-wrap gap-2`.
3. Total lebar seluruh 5 tombol + filter `Pilih Bulan` melebihi lebar kontainer pada resolusi layar normal (terutama di layar laptop 1280px - 1366px atau saat sidebar aktif).
4. Akibatnya, `flex-wrap` memotong baris dan memaksa tombol ke-5 (`CETAK BKP BANK`) jatuh ke baris kedua seorang diri, berada persis di bawah tombol ungu Pra-Audit AI, sementara area kanan dan kirinya kosong.
5. Susunan ini tampak tidak seimbang, terpotong canggung, dan mengganggu estetika antarmuka.

---

## 2. Solusi yang Dipilih: Tata Letak 2 Baris Terstruktur (Two-Tier Structured Toolbar)

Sesuai preferensi yang Anda pilih, tata letak akan diorganisir menjadi 2 baris fungsional yang harmonis:

### Struktur Tata Letak:
```
+----------------------------------------------------------------------------------------------------+
| Baris 1: Navigasi Periode & Aksi Dokumen                                                           |
| [ Pilih Bulan: (Januari ▾) ]                                    [ 📄 Export Excel ] [ 🖨️ Cetak BKP Bank ] |
+----------------------------------------------------------------------------------------------------+
| Baris 2: Alat Pemeriksaan & Validasi Kas Bank (dengan garis pemisah halus)                         |
| ● Alat Pemeriksaan & Validasi Kas Bank:     [ ✨ Pra-Audit AI ] [ 💲 Check Saldo Awal ] [ ✓ Check STS ] |
+----------------------------------------------------------------------------------------------------+
```

### Keunggulan Desain Ini:
1. **Pengelompokan Logis (Functional Grouping)**:
   - **Baris 1**: Aksi primer pengguna (memilih periode bulan, lalu mengunduh/mencetak dokumen PDF/Excel).
   - **Baris 2**: Alat rekonsiliasi dan verifikasi data kas bank (Audit AI DeepSeek-R1, Pengecekan STS, dan Pengecekan Saldo Awal).
2. **Kerapian Visual & Responsif**:
   - Baris 1 hanya menampung 2 tombol di kanan, dijamin tidak akan pernah patah/wrap di resolusi laptop mana pun.
   - Baris 2 menampung 3 tombol utilitas dengan label penjelas di sisi kiri, memberikan tampilan dashboard yang profesional dan rapi.
   - Pada layar mobile/tablet kecil, masing-masing baris akan menyusun secara fleksibel (`flex-col sm:flex-row`).

---

## 3. Rincian Perubahan Kode

**Target File**: `resources/js/Pages/Penatausahaan/Rekapitulasi.tsx` (baris 733–791)

### Kode Lama:
```tsx
{/* Control Bar */}
<div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-4 w-full md:w-auto">
        <label htmlFor="bulanBank" className="text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Bulan:</label>
        <select
            id="bulanBank"
            value={bulanBank.toLowerCase()}
            onChange={(e) => setBulanBank(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 w-full md:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
        >
            {monthList.map((m) => (
                <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
            ))}
        </select>
    </div>
    <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
        {renderAuditButton('bkp_bank')}
        <button
            onClick={() => setShowTrkSaldoAwalModal(true)}
            className="inline-flex items-center px-4 py-2 bg-yellow-600 dark:bg-yellow-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-yellow-500 dark:hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition ease-in-out duration-150"
        >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {bkpBankData?.data?.is_trk_saldo_awal_year ? 'Update Check Saldo Awal' : 'Check Saldo Awal'}
        </button>

        <button
            onClick={() => setShowCheckStsModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 dark:hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
        >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {bkpBankData?.data?.has_sts_year ? 'Update Check STS' : 'Check STS'}
        </button>

        <button
            onClick={handleExportExcelBkpBank}
            className="inline-flex items-center px-4 py-2 bg-green-800 dark:bg-green-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-green-800 uppercase tracking-widest hover:bg-green-700 dark:hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
        >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
        </button>

        <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
        >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            CETAK BKP BANK
        </button>
    </div>
</div>
```

### Usulan Kode Baru:
```tsx
{/* Control Bar - 2 Baris Terstruktur */}
<div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
    {/* Baris 1: Filter Bulan & Aksi Dokumen Output (Export Excel & Cetak) */}
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <label htmlFor="bulanBank" className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Pilih Bulan:
            </label>
            <select
                id="bulanBank"
                value={bulanBank.toLowerCase()}
                onChange={(e) => setBulanBank(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 w-full sm:w-48 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize shadow-sm"
            >
                {monthList.map((m) => (
                    <option key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                ))}
            </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
                onClick={handleExportExcelBkpBank}
                className="inline-flex items-center px-4 py-2 bg-green-800 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-md font-semibold text-xs uppercase tracking-widest shadow-sm transition ease-in-out duration-150"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
            </button>

            <button
                onClick={() => setShowPrintModal(true)}
                className="inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-900 hover:bg-gray-700 dark:hover:bg-gray-800 text-white rounded-md font-semibold text-xs uppercase tracking-widest shadow-sm transition ease-in-out duration-150"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                CETAK BKP BANK
            </button>
        </div>
    </div>

    {/* Baris 2: Alat Pemeriksaan & Validasi Kas Bank (AI, Saldo Awal, STS) */}
    <div className="pt-3 border-t border-gray-200 dark:border-gray-600/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Alat Pemeriksaan & Validasi Kas Bank:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            {renderAuditButton('bkp_bank')}

            <button
                onClick={() => setShowTrkSaldoAwalModal(true)}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 dark:bg-yellow-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-yellow-500 dark:hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition ease-in-out duration-150 shadow-sm"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {bkpBankData?.data?.is_trk_saldo_awal_year ? 'Update Check Saldo Awal' : 'Check Saldo Awal'}
            </button>

            <button
                onClick={() => setShowCheckStsModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 dark:hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150 shadow-sm"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {bkpBankData?.data?.has_sts_year ? 'Update Check STS' : 'Check STS'}
            </button>
        </div>
    </div>
</div>
```

---

## 4. Rencana Pengujian & Verifikasi

1. **Pengujian Tampilan Web**:
   - Memastikan baris 1 menampilkan filter bulan di kiri dan tombol Export Excel + Cetak BKP Bank di kanan secara sejajar.
   - Memastikan baris 2 menampilkan label helper dan tombol Pra-Audit AI, Check Saldo Awal, dan Check STS dengan rapi.
   - Memastikan tidak ada tombol yang terdorong atau terputus canggung di bawah tombol lain pada berbagai ukuran layar.
2. **Pengujian Fungsionalitas**:
   - Klik `Export Excel`: URL download Excel BKP Bank terbuka di tab baru.
   - Klik `CETAK BKP BANK`: Modal pengaturan cetak PDF muncul.
   - Klik `Pra-Audit AI`: Modal Pra-Audit AI DeepSeek-R1 terbuka dengan benar.
   - Klik `Check Saldo Awal`: Modal `TrkSaldoAwalModal` terbuka.
   - Klik `Check STS`: Modal `CheckStsModal` terbuka.
3. **Validasi Build**:
   - Menjalankan `npx tsc --noEmit` dan `npm run build` untuk memastikan tidak ada kesalahan kompilasi.
