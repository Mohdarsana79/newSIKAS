#!/usr/bin/env python
"""Verifikasi W2: pastikan token logika tidak berubah dibanding snapshot baseline.

Dipakai oleh Lead setelah teammate W2 selesai. Membandingkan:
- nama route()  -> multiset
- pemanggilan router.*  -> multiset method+arg
- axios.* arg pertama -> multiset
- window.open argumen -> multiset
- nama handler (const handle*/confirm*/submit) -> set
- state useState nama -> set
- parameter print/PDF (paper_size|orientation|font_size|tahap|bulan) -> multiset
- jumlah token print:

Exit code 1 jika ada perbedaan (selain file yang tidak ada).
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # repo root (docs/ui-redesign/tools -> root)
BASELINE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "docs/ui-redesign/.baseline-w2"
CURRENT = ROOT / "resources/js/Pages"

TOKEN_PATTERNS = {
    "route": re.compile(r"route\(\s*['\"]([^'\"]+)['\"]"),
    "router": re.compile(r"router\.(\w+)\(\s*(?:v?route\(\s*['\"]([^'\"]+)['\"]|([^,\n)]+))"),
    "axios": re.compile(r"axios\.(get|post|put|delete|patch)\(\s*([^,\n]+)"),
    "window_open": re.compile(r"window\.open\(([^\n]+)"),
    "handler": re.compile(r"const\s+(?:handle\w+|confirm\w+|submit)\s*="),
    "state": re.compile(r"const\s*\[(\w+),\s*(set\w+)\]\s*=\s*useState"),
    "print_param": re.compile(r"(paper_size|orientation|font_size|tahap|bulan)"),
    "print_css": re.compile(r"print:"),
    "on_click": re.compile(r"onClick="),
    "on_change": re.compile(r"onChange="),
    "on_submit": re.compile(r"onSubmit="),
    "modal_show": re.compile(r"show=\{"),
    "field_name": re.compile(r"name=['\"]([^'\"]+)['\"]"),
}


def tokens(text: str) -> dict[str, Counter]:
    out: dict[str, Counter] = {}
    for name, pattern in TOKEN_PATTERNS.items():
        if name in {"handler", "print_css", "on_click", "on_change", "on_submit", "modal_show"}:
            out[name] = Counter({"_": len(pattern.findall(text))})
            continue
        values = []
        for match in pattern.findall(text):
            if isinstance(match, tuple):
                values.append("|".join(part.strip() for part in match if part is not None))
            else:
                values.append(match.strip())
        out[name] = Counter(values)
    return out


def main() -> int:
    baseline_files = sorted(p for p in BASELINE.rglob("*.tsx"))
    if not baseline_files:
        print("Tidak ada baseline. Jalankan snapshot dulu.")
        return 2

    problems: list[str] = []
    checked = 0

    for base_file in baseline_files:
        rel = base_file.relative_to(BASELINE)
        current_file = CURRENT / rel
        checked += 1
        if not current_file.exists():
            problems.append(f"FILE HILANG: {rel}")
            continue

        before = tokens(base_file.read_text(encoding="utf-8"))
        after = tokens(current_file.read_text(encoding="utf-8"))

        for key in TOKEN_PATTERNS:
            if before[key] != after[key]:
                missing = before[key] - after[key]
                added = after[key] - before[key]
                detail = []
                if missing:
                    detail.append(f"hilang={dict(missing)}")
                if added:
                    detail.append(f"baru={dict(added)}")
                problems.append(f"{rel}: token '{key}' berubah -> {'; '.join(detail)}")

    print(f"File diperiksa: {checked}")
    if problems:
        print(f"\n{len(problems)} masalah ditemukan:\n")
        for problem in problems:
            print(f" - {problem}")
        return 1

    print("OK: seluruh token logika identik dengan baseline (hanya JSX/className yang berubah).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
