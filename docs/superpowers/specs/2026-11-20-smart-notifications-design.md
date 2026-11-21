# Spesifikasi Desain: Notifikasi Pintar Terpadu (Workflow Bendahara ↔ Kepala Sekolah & Pajak 4 Varian BOSP)

- **Tanggal:** 2026-11-20
- **Status:** Draft untuk Review Pengguna
- **Subsistem:** #2 dari 4 (Kolaborasi & Pemantauan Terpadu Lintas 4 Varian BOSP)
- **Lingkup:** Backend (Migration, Models, `SmartNotificationService`, Hooks di `RkasReviewController` & `PenganggaranApprovalController`, `NotificationController`, Routes, PHPUnit Tests) + Frontend (Upgrade Neo-Bento `NotificationDropdown.tsx` & `NotificationModal.tsx`, role-aware `PajakReminderModal`)

---

## 1. Tujuan & Masalah yang Diselesaikan

Saat ini lonceng notifikasi di Navbar ([NotificationDropdown.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/NotificationDropdown.tsx) & [NotificationController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/NotificationController.php)):
1. Hanya memantau pajak pada **BOSP Reguler** (`BukuKasUmum`) dan mengabaikan 3 varian lain (`kinerja`, `silpa`, `kinerja_silpa`).
2. Belum menghubungkan kolaborasi **Bendahara ↔ Kepala Sekolah** (telaah/revisi item belanja RKAS, pengajuan ulang perbaikan Bendahara, pengesahan/pembatalan pengesahan RKAS, serta antrean RKAS menunggu persetujuan).
3. Menyimpan status baca `setor_pajak` di `localStorage` browser sehingga tidak sinkron lintas perangkat LAN sekolah.
4. Menampilkan popup `PajakReminderModal` ke semua akun (termasuk Kepala Sekolah), dan tombol *"Kelola di BKU"* di `NotificationModal.tsx` menggunakan nama route `bku` (seharusnya `penatausahaan.bku` per varian).

Fitur **Notifikasi Pintar Terpadu** menyatukan **Workflow RKAS (Bendahara ↔ Kepala Sekolah)** dan **Pajak Lintas 4 Varian BOSP** ke dalam Popover Neo-Bento yang bersih, role-aware, tersinkron di database per pengguna, dan tetap kompatibel penuh dengan endpoint pajak lama.

---

## 2. Arsitektur Data & Skema Database

Migrasi: `database/migrations/2026_11_20_110000_create_smart_notifications_tables.php` (kompatibel penuh dengan **PostgreSQL** & **SQLite `:memory:`**, memakai `timestamp` agar konsisten dengan seluruh migrasi `newSIKAS`).

### 2.1 Tabel `user_notifications` (Event Kolaborasi Bendahara ↔ Kepala Sekolah)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `id()` | Primary key |
| `user_id` | `foreignId('user_id')->constrained('users')->cascadeOnDelete()` | Penerima notifikasi |
| `actor_id` | `foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete()` | Pelaku yang memicu event |
| `actor_name` | `string('actor_name', 150)` | Snapshot nama pelaku |
| `category` | `string('category', 32)->default('workflow')` | Kategori (`workflow`) |
| `type` | `string('type', 64)` | `rkas_revision_requested`, `rkas_revision_resubmitted`, `rkas_item_approved`, `rkas_approved`, `rkas_unapproved` |
| `variant` | `string('variant', 32)` | `reguler`, `kinerja`, `silpa`, `kinerja_silpa` |
| `title` | `string('title', 180)` | Judul singkat notifikasi |
| `message` | `text('message')` | Ringkasan detail (uraian, tahun anggaran, catatan/tanggapan) |
| `action_url` | `string('action_url', 255)->nullable()` | Path relatif aman (diawali `/`) menuju halaman RKAS / RKAS Perubahan / Penganggaran varian terkait |
| `dedup_key` | `string('dedup_key', 160)->nullable()` | Kunci deduplikasi agar pembaruan pada item yang sama memperbarui entri existing daripada membanjiri inbox |
| `read_at` | `timestamp('read_at')->nullable()` | Null jika belum dibaca |
| `created_at` / `updated_at` | `timestamps()` | Waktu kejadian & pembaruan |

**Indeks Komposit:**
- `user_notifications_user_read_created_idx`: `['user_id', 'read_at', 'created_at']`
- `user_notifications_user_created_idx`: `['user_id', 'created_at']`
- `user_notifications_user_dedup_idx`: `['user_id', 'dedup_key']`

### 2.2 Tabel `notification_dismissals` (Status Baca Live Notification Tersinkron DB)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `id()` | Primary key |
| `user_id` | `foreignId('user_id')->constrained('users')->cascadeOnDelete()` | Pengguna |
| `notification_key` | `string('notification_key', 140)` | Kunci unik item live (mis. `setor_pajak:kinerja:2026:11`) |
| `dismissed_at` | `timestamp('dismissed_at')->useCurrent()` | Waktu ditandai dibaca |

**Constraint:** `unique(['user_id', 'notification_key'], 'notification_dismissals_user_key_unique')`.

### 2.3 Model Eloquent

- `App\Models\UserNotification`: casts `user_id => integer`, `actor_id => integer`, `read_at => datetime`; relasi `user()` & `actor()`; scope `unread()`.
- `App\Models\NotificationDismissal`: `public $timestamps = false;`; cast `dismissed_at => datetime`; relasi `user()`.
- Relasi `userNotifications()` ditambahkan pada `App\Models\User`.

---

## 3. Logika Bisnis (`App\Services\SmartNotificationService`)

Service terpusat menangani **pengiriman event workflow** (fail-safe agar tidak mengganggu transaksi utama) dan **perakitan feed notifikasi terpadu** yang role-aware.

### 3.1 Pemicu Event Kolaborasi Bendahara ↔ Kepala Sekolah

1. **`notifyRkasItemReviewed(User $actor, RkasItemReview $review, $reviewable)`** — dipanggil dari `RkasReviewController::store()`:
   - Target penerima: seluruh pengguna aktif (selain `$actor->id`) yang memiliki akses `canAccessModule('penganggaran', LEVEL_WRITE)` (Bendahara/Operator).
   - Resolusi konteks dari kelas `$reviewable`: `(variant, isPerubahan, penganggaranId, tahunAnggaran, uraian)`.
   - Jika `status === 'perlu_revisi'`:
     - `type`: `'rkas_revision_requested'`
     - `title`: `'Item RKAS Perlu Revisi'`
     - `message`: memuat nama uraian, tahun anggaran, dan potongan catatan Kepala Sekolah (jika diisi).
     - `action_url`: URL relatif `rkas.index` atau `rkas-perubahan.index` untuk `penganggaranId` & varian terkait.
     - `dedup_key`: `"rkas_review:{$review->id}:perlu_revisi"` (di-update + reset `read_at = null` jika Kepala Sekolah memperbarui catatan revisinya).
   - Jika `status === 'disetujui'`:
     - `type`: `'rkas_item_approved'`
     - `title`: `'Item RKAS Disetujui'`
     - `dedup_key`: `"rkas_review:{$review->id}:disetujui"`.

2. **`notifyRkasItemResubmitted(User $actor, RkasItemReview $review, $reviewable)`** — dipanggil dari `RkasReviewController::resubmit()`:
   - Target penerima: seluruh pengguna aktif (selain `$actor->id`) yang memiliki ability `hasFeatureAbility('rkas_review')` (Kepala Sekolah / penelaah).
   - `type`: `'rkas_revision_resubmitted'`
   - `title`: `'Perbaikan RKAS Diajukan Ulang'`
   - `message`: memuat nama uraian, nama Bendahara, dan potongan `tanggapan_bendahara` (jika diisi).
   - `action_url`: URL relatif `rkas.index` atau `rkas-perubahan.index` varian terkait.
   - `dedup_key`: `"rkas_review:{$review->id}:resubmitted"` (reset `read_at = null`).

3. **`notifyPenganggaranApprovalChanged(User $actor, Model $penganggaran, string $variant, bool $approved, ?string $catatan = null)`** — dipanggil dari `PenganggaranApprovalController::approve()` & `unapprove()`:
   - Target penerima: seluruh pengguna aktif (selain `$actor->id`) yang memiliki akses `canAccessModule('penganggaran', LEVEL_WRITE)`.
   - Jika `$approved === true`:
     - `type`: `'rkas_approved'`, `title`: `'Penganggaran RKAS Disahkan'`, `message` memuat tahun anggaran, nama Kepala Sekolah, dan catatan persetujuan (jika ada).
   - Jika `$approved === false`:
     - `type`: `'rkas_unapproved'`, `title`: `'Pengesahan RKAS Dibatalkan'`, `message` memuat tahun anggaran dan nama pelaku.
   - `action_url`: URL relatif `penganggaran.index` varian terkait.
   - `dedup_key`: `"penganggaran_approval:{$variant}:{$penganggaran->id}"` (reset `read_at = null`).

### 3.2 Pemantauan Live Cerdas (Role-Aware & Lintas 4 Varian BOSP)

1. **Antrean Live Workflow RKAS (tidak menumpuk/duplikat, otomatis hilang saat tuntas):**
   - **Untuk penelaah/pengesah (`rkas_approve`):** memindai 4 tabel penganggaran (`Penganggaran`, `KinerjaPenganggaran`, `SilpaPenganggaran`, `KinerjaSilpaPenganggaran`) mencari tahun anggaran dengan `status_persetujuan` null/`draft` yang sudah memiliki item RKAS → tampil sebagai ringkasan `live_rkas_pending_approval` (*"RKAS Tahun {tahun} Menunggu Pengesahan"*) dengan link langsung ke `rkas.index` varian tersebut.
   - **Untuk penelaah (`rkas_review`):** menghitung item `rkas_item_reviews` berstatus `'sudah_diperbaiki'` per varian → jika > 0 tampil sebagai ringkasan `live_rkas_pending_rereview` (*"{n} Perbaikan RKAS Menunggu Telaah Ulang"*).
   - **Untuk pengelola Penganggaran (`penganggaran: write`):** menghitung item `rkas_item_reviews` berstatus `'perlu_revisi'` per varian → jika > 0 tampil sebagai ringkasan `live_rkas_needs_revision` (*"{n} Item RKAS Perlu Diperbaiki"*).
   - *Catatan:* item live workflow selalu mencerminkan pekerjaan yang benar-benar masih tertunda (`is_live: true`, `dismissible: false`), sehingga otomatis hilang seketika setelah Kepala Sekolah menyetujui atau Bendahara memperbaiki.

2. **Pajak Lintas 4 Varian BOSP:**
   - Ditampilkan hanya bila `$user->canAccessModule('penatausahaan', LEVEL_READ)` bernilai `true`.
   - Memindai 4 model BKU (`VariantConfig::getModelClass('bku', $variant)` untuk `reguler`, `kinerja`, `silpa`, `kinerja_silpa`) dengan `total_pajak > 0 || total_pajak_daerah > 0`, dikelompokkan per `(variant, year, month)`:
     - **`terima_pajak`** (`ntpn` kosong/null): `is_read: false`, `dismissible: false` (selalu aktif sampai NTPN diisi).
     - **`setor_pajak`** (`ntpn` terisi): disembunyikan bila kunci `setor_pajak:{variant}:{year}:{month}` sudah ada di `notification_dismissals` milik user tersebut (`dismissible: true`).
   - Setiap item pajak membawa `variant`, `variant_label`, `month`, `year`, `month_name`, `count`, `bku_url` (resolved server-side via `route(VariantConfig::routeName($variant, 'penatausahaan.bku'), ['tahun' => $year, 'bulan' => $month], false)`).

3. **Role-Aware Popup Pengingat Login (`show_pajak_reminder`):**
   - `show_pajak_reminder` bernilai `true` **hanya** bila `$user->canAccessModule('penatausahaan', LEVEL_WRITE)` **dan** terdapat minimal 1 item `terima_pajak` lintas 4 varian.
   - Dengan demikian Bendahara/Operator tetap mendapat popup pengingat wajib setor saat login, sedangkan Kepala Sekolah (`penatausahaan: read`) melihat tab Pajak untuk pemantauan tanpa terganggu popup saat login.

---

## 4. API Endpoints & Kompatibilitas Mundur

### 4.1 Routes (`routes/web.php`, di bawah `auth`)

Karena `PermissionCatalog::resolveRouteRequirement()` sudah mengecualikan prefix `api.notifications.` bagi semua user terautentikasi, seluruh endpoint ini aman dan otomatis dapat diakses semua peran yang login (sementara isi datanya difilter ketat sesuai RBAC masing-masing user):

```php
Route::prefix('api/notifications')->name('api.notifications.')->group(function () {
    Route::get('/unified', [NotificationController::class, 'getUnifiedNotifications'])->name('unified');
    Route::post('/read', [NotificationController::class, 'markAsRead'])->name('read');
    Route::post('/read-all', [NotificationController::class, 'markAllAsRead'])->name('read-all');
});
```

Endpoint lama di `routes/variant.php` (`api.notifications.pajak` & `api.notifications.pajak.details`) tetap dipertahankan:
- `GET /api/notifications/pajak` — tetap mengembalikan format lama (dipakai konsumen lama jika ada), dengan tambahan properti `variant` & `variant_label`.
- `GET /api/notifications/pajak/details` — kini menerima query opsional `?variant=reguler|kinerja|silpa|kinerja_silpa` (default mengikuti varian route / `reguler`), memvalidasi varian terhadap `VariantConfig::VARIANTS`, memvalidasi akses `penatausahaan: read`, dan mengembalikan rincian pajak dari model BKU varian yang tepat.

### 4.2 Kontrak Respons `GET /api/notifications/unified`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "db:12",
        "source": "db",
        "db_id": 12,
        "notification_key": null,
        "category": "workflow",
        "type": "rkas_revision_requested",
        "tone": "warning",
        "variant": "kinerja",
        "variant_label": "BOSP Kinerja",
        "title": "Item RKAS Perlu Revisi",
        "message": "Kepala Sekolah meminta revisi pada \"Belanja ATK\" (TA 2026): Sesuaikan volume.",
        "action_url": "/kinerja/rkas/5",
        "action_label": "Buka RKAS",
        "is_read": false,
        "dismissible": true,
        "created_at_human": "2 menit yang lalu",
        "meta": null
      }
    ],
    "counts": {
      "all": 3,
      "workflow": 2,
      "pajak": 1,
      "unread": 3,
      "dismissible_unread": 2
    },
    "can_view_pajak": true,
    "show_pajak_reminder": true
  }
}
```

### 4.3 Kontrak `POST /api/notifications/read` & `POST /api/notifications/read-all`
- `POST /api/notifications/read`: menerima `db_id` (int, menandai `user_notifications` milik `auth()->id()` saja) **atau** `notification_key` (string valid format `setor_pajak:{variant}:{year}:{month}`, insert/ignore ke `notification_dismissals` milik `auth()->id()`).
- `POST /api/notifications/read-all`: menerima opsional `category` (`all` | `workflow` | `pajak`), menandai seluruh `user_notifications` unread milik user + seluruh `setor_pajak` aktif ke `notification_dismissals` (tidak menghapus `terima_pajak` belum disetor maupun antrean live workflow).

---

## 5. Desain UI Neo-Bento (`NotificationDropdown.tsx` & `NotificationModal.tsx`)

### 5.1 `NotificationDropdown.tsx` (Popover Lonceng Navbar)
- **Trigger Lonceng:** tetap proporsional `h-9 w-9` di Navbar, badge angka unread merah/peach (`9+` bila > 9) dengan indikator denyut halus bila ada item prioritas tinggi (`terima_pajak`, `rkas_revision_requested`, `rkas_revision_resubmitted`, atau `live_rkas_*`).
- **Popover Neo-Bento (`w-[min(410px,calc(100vw-1.5rem))]`, `rounded-[26px]`):**
  - **Header Gelap `#15131F`** dengan *ambient glow* violet/lime:
    - Judul **"Pusat Notifikasi"** + pil jumlah unread (`lime-400 text-slate-950`).
    - Tombol refresh ringan (`RefreshCw` dengan spin saat loading) & tombol **"Tandai dibaca"** (muncul hanya bila `counts.dismissible_unread > 0`).
  - **Tab Filter Pil:** **Semua** · **Workflow RKAS** · **Pajak** (tab *Pajak* otomatis tersembunyi jika `!can_view_pajak`), masing-masing dengan counter pil.
  - **Daftar Item Terpadu (`sikas-scroll max-h-[390px]`):**
    - Kartu bersih dengan `IconTile` sesuai jenis event (revisi = `amber`, resubmit = `violet`, disetujui/lunas = `mint`, dibatalkan = `rose`, pajak wajib setor = `amber`/`rose`).
    - Indikator unread dot, judul tegas, **chip Varian BOSP** (`BOSP Reguler`, `BOSP Kinerja`, `SiLPA Reguler`, `SiLPA Kinerja`), pesan ringkas (maks 3 baris), waktu relatif Bahasa Indonesia (atau jumlah transaksi untuk pajak), dan label aksi (*"Buka RKAS →"* / *"Lihat rincian →"*).
    - Klik item Workflow: menandai `read` via `axios.post` (jika `db_id`) lalu navigasi via Inertia `router.visit(item.action_url)`.
    - Klik item Pajak: jika `setor_pajak`, menandai `dismissed` via `axios.post`, lalu membuka `NotificationModal` dengan konteks varian yang tepat.
  - **Empty State ramah** per tab.
  - **Cadence Refresh:** fetch saat mount, setiap **60 detik**, saat popover dibuka, dan saat `document.visibilityState === 'visible'` (dengan throttle ringan agar tidak burst).
- **Popup Pengingat Pajak Login (`PajakReminderModal`):** hanya tampil bila `show_pajak_reminder === true` (sekali per sesi, menunggu `changelog_closed` bila `flash.show_changelog` aktif).

### 5.2 `NotificationModal.tsx` (Rincian Pajak Multi-Varian)
- Menerima item pajak lengkap dengan `variant`, `variant_label`, dan `bku_url`.
- Header modal menampilkan **chip Varian BOSP** di samping status *Wajib Setor* / *Lunas*.
- Memanggil `GET /api/notifications/pajak/details?type=...&month=...&year=...&variant=...`.
- Tombol **"Kelola di BKU"** menavigasi langsung ke `notification.bku_url` (fallback aman ke `vRoute('penatausahaan.bku', ...)`), memperbaiki bug route `bku` yang sebelumnya salah nama dan hanya menuju varian aktif.

---

## 6. Rencana Pengujian & Verifikasi

### 6.1 PHPUnit Feature Tests (`tests/Feature/SmartNotificationTest.php`)
1. **Workflow Revisi & Resubmit lintas varian:** Kepala Sekolah menandai item RKAS Kinerja `perlu_revisi` → Bendahara menerima `user_notifications` dengan `variant: 'kinerja'` & `action_url` valid; Bendahara `resubmit` → Kepala Sekolah menerima `rkas_revision_resubmitted` + live counter; pembaruan catatan yang sama menduplikasi-ulang (`dedup_key`) tanpa spam baris baru.
2. **Pengesahan & Pembatalan RKAS:** Kepala Sekolah `approve` & `unapprove` Penganggaran → Bendahara menerima notifikasi `rkas_approved` / `rkas_unapproved`.
3. **Pajak 4 Varian & Role-Aware:** Transaksi pajak tanpa NTPN pada `kinerja` dan sudah ber-NTPN pada `silpa` keduanya muncul di `/api/notifications/unified` dengan `variant` & `bku_url` yang benar; `show_pajak_reminder` bernilai `true` untuk Bendahara dan `false` untuk Kepala Sekolah; role custom tanpa izin `penatausahaan` mendapat `can_view_pajak: false` & 0 item pajak.
4. **Sinkronisasi Status Baca DB (`read` & `read-all`):** `POST /api/notifications/read` menandai `user_notifications` (dan tidak dapat menandai milik user lain!) serta menyimpan `setor_pajak` ke `notification_dismissals`; `POST /api/notifications/read-all` menandai item dismissible tetapi **mempertahankan** `terima_pajak` belum disetor.
5. **Detail Pajak Multi-Varian:** `GET /api/notifications/pajak/details?variant=kinerja&...` mengembalikan detail dari `kinerja_buku_kas_umums` dan menolak akses user tanpa izin `penatausahaan` (`403`).

### 6.2 Quality Gates
- `vendor/bin/pint`
- `php artisan migrate --force` (PostgreSQL `newSIKAS`)
- `php artisan test --filter=SmartNotificationTest` + `ActivityLogTest`
- `npm run build` (`tsc && vite build`)
- `/code-review` dua sumbu paralel (**Standards** & **Spec**).
