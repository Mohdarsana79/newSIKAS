# AGENTS.md

School financial management app ("SIKAS") for BOSP funds: budgeting (RKAS), treasury/cash book (BKU/Penatausahaan), reports, PDF/Excel export, and ARKAS desktop-app integration.

## Stack & tooling
- Laravel 13 + PHP 8.3 + PostgreSQL (`newSIKAS`); Inertia + React 18 + TypeScript (strict) + Vite 7 + Tailwind 3.
- Run locally via Laragon (php/node/composer are on PATH).
- Frontend entry: `resources/js/app.tsx`; `@/*` alias maps to `resources/js/*`.
- Blade templates exist only for PDF output (`barryvdh/laravel-dompdf`) and email; Excel via `maatwebsite/excel`; routing exposed to JS via Ziggy.

## Commands
- `composer test` — `config:clear` then the PHPUnit suite (runs on sqlite `:memory:`). Preferred over bare `php artisan test`.
- `php artisan test --filter=SomeTest` — single test.
- `composer dev` — server + queue + `pail` + vite concurrently.
- `npm run dev` / `npm run build` (build runs `tsc && vite build`).
- Format PHP with `vendor/bin/pint` (no repo wrapper script).

## Variant system (core architecture — understand before editing domain code)
The app serves 4 budget "variants": `reguler`, `kinerja`, `silpa`, `kinerja_silpa` (BOSP Reguler / Kinerja and their SiLPA carryovers). This is the single most important concept.
- `app/Config/VariantConfig.php` is the source of truth: model-class map, FK names, route prefixes, titles.
- Each domain concept has 4 parallel Eloquent models/tables, e.g. `Penganggaran`→`penganggarans`, `KinerjaPenganggaran`→`kinerja_penganggarans`, `SilpaPenganggaran`→`silpa_penganggarans`, `KinerjaSilpaPenganggaran`→`kinerja_silpa_penganggarans`. Shared behavior lives in `app/Models/Traits/*`.
- Routes: `routes/web.php` loops `VariantConfig::VARIANTS`, mounting `routes/variant.php` once per variant under the `variant:{name}` middleware alias; non-reguler variants get a URL + route-name prefix (e.g. `kinerja-`). All domain routes live in `routes/variant.php`.
- Controllers read the active variant via `app('variant')` (default `reguler`, set by the `DetectVariant` middleware), pick models with `VariantConfig::getModelClass($concept, $variant)`, and render via a per-controller `renderVariant()` helper that injects `variant` + `routePrefix` props.
- Frontend builds route names with `useVariantRoute()` (`resources/js/Hooks/useVariantRoute.ts`), which prepends `routePrefix`.
- All variants share the same React components (`VariantConfig::pagePrefix()` returns `''`) — variant differences are model/data + routing only, not forked pages.
- To add a variant-scoped feature: create the model ×4 (or only the variants that apply), register it in `VariantConfig::modelMap()` + the FK helper, add routes to `routes/variant.php`, resolve via `getModelClass()`.

## Environment & data
- `.env` is gitignored and holds real secrets (PostgreSQL `newSIKAS` on 127.0.0.1:5432). Do not commit it.
- No `.env.example` exists — a fresh checkout must create `.env` manually. `composer setup` (in `composer.json`) copies `.env.example` → `.env`, so it will fail until one is created.
- NPSN license gate: global `CheckNpsnLicense` middleware redirects to `/license-invalid` when `APP_NPSN_CODE` differs from `sekolahs.npsn`. Empty `APP_NPSN_CODE` or a missing `sekolahs` row passes (useful on fresh local DBs).
- ARKAS integration reads an external SQLite file at `ARKAS_DB_PATH` (the ARKAS desktop app's DB).

## Design specs
- Feature design docs live in `docs/superpowers/specs/*.md` (written in Indonesian, spec-driven workflow). Check for an existing spec before large feature/refactor work.

## Repo gotchas
- Root-level ad-hoc scripts (`fix_*.php`, `replace_*.php`, `test_*.php`, `inject_*.php`, `cleanup.php`, `repair.php`, `old_penganggaran.php`, `*.py`) and `scratch/` are one-off migration/debug scripts. Do not run or commit them. `.gitignore` covers only some (e.g. `fix_*`, `repair*`, `replace_*`, `test_*`, `scratch_*`, `copy_*`, `debug_*`); `inject_*.php`, `*.py`, `cleanup.php`, `old_penganggaran.php` are NOT ignored.
- `_ide_helper.php`, `_ide_helper_models.php`, `.phpstorm.meta.php` are generated + gitignored; regenerate with `php artisan ide-helper:*`.
