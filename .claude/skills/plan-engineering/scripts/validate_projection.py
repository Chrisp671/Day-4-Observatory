#!/usr/bin/env python3
"""Check that an HTML plan is offline and agrees with canonical Markdown IDs."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ID = re.compile(r"\b(?:REQ|ASM|QST|DEC|SEAM|RSK|WI|CHK)-\d{3}\b")
REMOTE = re.compile(r"(?:src|href)\s*=\s*[\"'](?:https?:)?//", re.IGNORECASE)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: validate_projection.py PLAN.md PLAN.html", file=sys.stderr)
        return 2
    markdown_path, html_path = map(Path, sys.argv[1:])
    markdown = markdown_path.read_text(encoding="utf-8")
    html = html_path.read_text(encoding="utf-8")
    canonical = set(ID.findall(markdown))
    projected = set(ID.findall(html))
    errors: list[str] = []

    missing = sorted(canonical - projected)
    extra = sorted(projected - canonical)
    if missing:
        errors.append("IDs missing from HTML: " + ", ".join(missing))
    if extra:
        errors.append("IDs absent from canonical Markdown: " + ", ".join(extra))
    if REMOTE.search(html):
        errors.append("HTML contains an external src/href dependency")
    for required in ("<style", "<script", "<noscript", "@media print", "<main"):
        if required.lower() not in html.lower():
            errors.append(f"HTML missing required offline artifact element: {required}")

    if errors:
        print(f"FAIL {html_path}")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"PASS {html_path}: {len(canonical)} canonical IDs projected; no remote dependencies")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
