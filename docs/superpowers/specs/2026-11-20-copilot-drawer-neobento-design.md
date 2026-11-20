# Desain Redesign UI Neo-Bento SIKAS AI Copilot (`CopilotDrawer`)

**Tanggal:** 2026-11-20  
**Status:** Disetujui untuk peninjauan spec  
**Ruang Lingkup:**
- Modul baru:
  - `resources/js/Components/Ai/copilot/types.ts`
  - `resources/js/Components/Ai/copilot/copilotFormatter.ts`
  - `resources/js/Components/Ai/copilot/CopilotMessageCards.tsx`
- Pembaruan:
  - `resources/js/Components/Ai/CopilotDrawer.tsx`

---

## 1. Latar Belakang & Masalah

Komponen **SIKAS AI Copilot** (`resources/js/Components/Ai/CopilotDrawer.tsx`, 875 baris) masih memakai gaya visual legacy (`purple-700`/`indigo-600`/`bg-gray-800`/`bg-gray-900`) yang belum selaras dengan sistem desain **SIKAS Neo-Bento Full-Color** (`#1E1D2E`, `#15131F`, `lime-400`, `brand-500`, `rounded-[26px]`, `shadow-float`), serta memiliki beberapa kekurangan UX dan kualitas kode:

1. Masih menggunakan dialog bawaan browser `confirm()` untuk reset obrolan dan `alert()` untuk error penyimpanan draf BKU.
2. Belum memiliki tombol **Salin Jawaban** pada bubble AI, belum ada auto-resize `textarea`, dan `ApexCharts` memakai warna grid/sumbu hardcoded light mode.
3. Field `action_buttons` pada pesan AI beserta 10+ import Lucide & `router` belum pernah dirender/digunakan.
4. Satu file tunggal menampung parser Markdown/HTML, kartu draf transaksi BKU, mini chart, dan seluruh antarmuka obrolan.

---

## 2. Keputusan Desain (Hasil Wawancara)

1. **Tema Visual:** **Signature SIKAS Neo-Bento Dark-Header** — header gelap `#252438 -> #1E1D2E -> #15141E` (serasi dengan `Sidebar.tsx`) dengan *aurora blur glow* violet & lime, tombol kirim `bg-lime-400 text-slate-950 shadow-lime`, dan bodi chat adaptif light/dark (`#F6F7FB` / `#0D0C15` dengan kartu `#15131F`).
2. **Paket UX Neo-Bento (tanpa mengubah backend/API):**
   - Konfirmasi reset obrolan inline di bawah header (menggantikan `confirm()`).
   - Banner error inline di dalam kartu draf BKU (menggantikan `alert()`).
   - Tombol **Salin Jawaban 1-Klik** (`Salin` → `Tersalin!`) pada setiap pesan asisten.
   - `textarea` **auto-resize** (1–4 baris).
   - Welcome prompt berikon Lucide/`IconTile` dengan grid responsif 2 kolom saat `Maximized`.
   - `ApexCharts` adaptif dark/light mode via `MutationObserver` pada `document.documentElement`.
   - Rendering `action_buttons` sebagai kartu navigasi cepat Neo-Bento.
3. **Modularisasi:** Memecah tipe, formatter Markdown/tabel, dan kartu pesan ke folder `resources/js/Components/Ai/copilot/` agar `CopilotDrawer.tsx` fokus pada state & shell obrolan.

---

## 3. Arsitektur & Detail Implementasi

### 3.1 Tipe Bersama: `resources/js/Components/Ai/copilot/types.ts`
Mengekspor:
- `ActionButton` (`label`, `url`, `icon?`, `description?`)
- `StagingDraft` (seluruh properti draf transaksi BKU termasuk `is_committed?`, `bku_id?`, dan tambahan opsional `commit_error?: string` untuk error inline)
- `CopilotAnalyticsChart` (`title`, `categories: string[]`, `series: { name: string; data: number[] }[]`)
- `Message` (`id`, `role: 'user' | 'assistant'`, `content`, `staging_card?`, `analytics_chart?`, `action_buttons?`, `timestamp`)

### 3.2 Formatter Markdown & Tabel Neo-Bento: `resources/js/Components/Ai/copilot/copilotFormatter.ts`
- Mengekspor `sanitizeAndFormatHtml(content: string): string` (parsing tabel Markdown, strip code fences, sanitasi tag `<script>`/`<iframe>`/`<object>`/event handler/`javascript:`, pembungkusan tabel dengan kontainer `overflow-x-auto overflow-y-auto max-h-80 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#15131F] sikas-scroll`, formatting heading, bold, bullet dengan titik `text-brand-500 dark:text-lime-300`, dan angka tabular `text-sikas-num`).
- Mengekspor `COPILOT_HTML_STYLES` (CSS ter-scope `.ai-html-content` bertema Neo-Bento untuk light & dark mode).

### 3.3 Kartu Pesan Neo-Bento: `resources/js/Components/Ai/copilot/CopilotMessageCards.tsx`
Mengekspor 3 komponen:

1. **`CopilotStagingDraftCard`**:
   - Kartu Neo-Bento (`rounded-2xl border border-brand-500/15 bg-slate-50/90 p-3.5 dark:border-brand-400/20 dark:bg-[#12101B]`).
   - Header: `IconTile tone="lime" size="sm"` + judul `Draf Transaksi BKU` + `StatusBadge tone="violet"` untuk `jenis_transaksi`.
   - Rincian kegiatan, rekening (`font-mono`), penyedia & tanggal, total nominal (`text-sikas-num text-[13.5px] font-extrabold`), potongan pajak (jika `> 0`), serta sisa pagu RKAS sebelum → sesudah (`text-sikas-num`, warna `emerald` atau `rose` bila `is_over_budget`).
   - Banner error inline (`bg-pastel-rose border-rose-200 dark:bg-rose-500/10`) bila `draft.commit_error` terisi (menggantikan `alert()`).
   - Footer aksi: `StatusBadge tone="success"` `Tersimpan di BKU (#ID)` jika `is_committed`, atau tombol `bg-lime-400 text-slate-950 shadow-lime hover:bg-lime-300` `Konfirmasi & Simpan ke BKU`.

2. **`CopilotAnalyticsChartCard`**:
   - Mendeteksi class `.dark` pada `document.documentElement` melalui `MutationObserver` untuk menyelaraskan warna label sumbu, grid (`#eef2f6` di light / `rgba(255,255,255,0.08)` di dark), dan `tooltip.theme` (`'dark'` / `'light'`).
   - Palet warna seri selaras Neo-Bento (`['#7c5cff', '#c5e84e', '#38bdf8']`).
   - Header memakai `IconTile tone="violet" size="sm"` dengan ikon `BarChart3`.

3. **`CopilotActionButtonsCard`**:
   - Merender `action_buttons` bila array tidak kosong.
   - Memetakan `btn.icon` (mis. `file`, `printer`, `settings`, `sync`, `shield`, `chart`, default `compass`) ke ikon Lucide di dalam `IconTile tone="sky" size="sm"`.
   - URL internal (diawali `/` atau origin sama) dinavigasi memakai `router.visit(btn.url)`; URL eksternal `http(s)://` dibuka di tab baru dengan `rel="noopener noreferrer"`.

### 3.4 Shell Utama: `resources/js/Components/Ai/CopilotDrawer.tsx`
1. **Props & State:**
   - Mempertahankan penuh kontrak props `CopilotDrawerProps` (`copilotState`, `setCopilotState`, `sidebarOpen`), `localStorage` key `sikas_copilot_chat_${userId}_${variant}`, serta endpoint API (`api.ai.copilot.context`, `api.ai.copilot.chat`, `api.ai.copilot.commit`).
   - Menambahkan state lokal `confirmingClear`, `copiedMessageId` (dengan cleanup timeout saat unmount), dan ref `textareaRef` untuk auto-resize (min 1 baris, maks `112px`).
   - Memformat nama varian dengan label manusiawi (`reguler` → `BOSP Reguler`, `kinerja` → `BOSP Kinerja`, `silpa` → `SiLPA BOSP Reguler`, `kinerja_silpa` → `SiLPA BOSP Kinerja`).
2. **Outer Shell & 3 Mode Jendela:**
   - Normal: `inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[440px] lg:w-[470px] h-[min(600px,calc(100vh-5.5rem))] rounded-[26px]`.
   - Maximized: `top-2 bottom-2 left-2 right-2 lg:top-4 lg:bottom-4 lg:right-4` + `sidebarOpen ? 'lg:left-[276px]' : 'lg:left-[98px]'` (`rounded-[26px] copilot-maximized`), selaras persis dengan padding `AuthenticatedLayout`.
   - Minimized: `bottom-3 right-3 w-[min(330px,calc(100vw-1.5rem))] rounded-[22px]` dengan header gelap compact, badge jumlah pesan (bila `messages.length > 0`), dan tombol buka/tutup.
3. **Header Gelap Signature SIKAS:**
   - Latar `bg-gradient-to-r from-[#252438] via-[#1E1D2E] to-[#15141E]` dengan dua *ambient glow* (`bg-brand-500/25` & `bg-lime-400/15`).
   - Emblem `IconTile tone="lime"` (`<Brain />`) + indikator titik hijau aktif, judul `SIKAS AI Copilot`, pil badge `V3` lime, subtitle varian & TA.
   - Tombol aksi header (`Mulai Obrolan Baru`, `Kecilkan`/`Buka`, `Maksimalkan`/`Pulihkan`, `Tutup`) masing-masing memiliki `aria-label` dan `title`.
   - **Bar Konfirmasi Reset Inline:** muncul saat `confirmingClear === true` tepat di bawah header dengan tombol `Batal` dan `Ya, Bersihkan` (menghapus `messages` dan `localStorage` tanpa `confirm()`).
4. **Welcome State & Percakapan:**
   - Banner *API Key Belum Terpasang* bergaya `pastel-amber` + pill `Buka Profil`.
   - Welcome State: emblem `IconTile tone="violet" size="lg"`, pill tab switcher kaca (`Panduan Aplikasi` | `Keuangan & Draf`, tab aktif `bg-lime-400 text-slate-950 shadow-lime`), dan daftar prompt cepat berikon Lucide/`IconTile` (1 kolom normal, 2 kolom saat `isMaximized`).
   - Bubble user: `bg-gradient-to-br from-[#252438] to-[#1E1D2E] text-white dark:from-brand-600 dark:to-brand-700 rounded-[20px] rounded-br-md`.
   - Bubble asisten: `bg-white dark:bg-[#171524] border border-slate-200/80 dark:border-white/10 rounded-[20px] rounded-bl-md`, avatar AI mini, render `sanitizeAndFormatHtml`, `CopilotStagingDraftCard`, `CopilotAnalyticsChartCard`, `CopilotActionButtonsCard`, plus baris meta jam & tombol **Salin** 1-klik (`Salin` → `Tersalin!`).
   - Typing indicator: pil Neo-Bento dengan avatar AI + 3 titik bouncing (`lime-400`/`brand-400`) + `"SIKAS AI sedang menganalisis..."`.
5. **Input Composer Neo-Bento:**
   - Wadah `rounded-2xl border border-slate-200/90 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.04]` dengan `focus-within:border-lime-400 focus-within:ring-4 focus-within:ring-lime-200/60 dark:focus-within:border-lime-400/70 dark:focus-within:ring-lime-400/10`.
   - `<textarea>` auto-resize (`max-h-28`) + tombol kirim `bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lime rounded-xl` dengan `aria-label="Kirim pesan"`.

---

## 4. Cakupan & Keamanan

- Tidak mengubah controller PHP (`AiCopilotController.php`), service AI (`CopilotService.php`), maupun route Laravel mana pun.
- Menjaga penuh sanitasi HTML pada jawaban AI dan validasi URL aman pada `action_buttons` (menolak protokol `javascript:`/`data:`).

---

## 5. Rencana Verifikasi

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan lulus dengan exit code `0`.
2. Pastikan tidak ada lagi panggilan `confirm(` maupun `alert(` di `CopilotDrawer.tsx`.
3. Jalankan peninjauan dua sumbu (`/code-review`: **Standards** & **Spec**) terhadap keempat file.
