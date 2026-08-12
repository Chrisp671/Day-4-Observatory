#!/usr/bin/env python3
"""Validate a Plan Engineering Markdown file for structural and ID integrity."""

from __future__ import annotations

import re
import sys
from pathlib import Path

REQUIRED = (
    "outcome",
    "scope",
    "requirements",
    "architecture",
    "decisions",
    "risks",
    "verification",
    "progress",
)
REQUIRED_ID_PATTERNS = {
    "requirement": re.compile(r"\bREQ-\d{3}\b"),
    "work item": re.compile(r"\bWI-\d{3}\b"),
}
ALL_ID = re.compile(r"\b(?:REQ|ASM|QST|DEC|SEAM|RSK|WI|CHK)-\d{3}\b")
DECLARATION = re.compile(
    r"^(?:#+\s+|[-*]\s+)((?:REQ|ASM|QST|DEC|SEAM|RSK|WI|CHK)-\d{3})\b",
    re.MULTILINE,
)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_plan.py PLAN.md", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8")
    lowered = text.lower()
    errors: list[str] = []
    for heading in REQUIRED:
        if not re.search(rf"^#+\s+.*{re.escape(heading)}", lowered, re.MULTILINE):
            errors.append(f"missing heading containing: {heading}")
    for label, pattern in REQUIRED_ID_PATTERNS.items():
        if not pattern.search(text):
            errors.append(f"missing stable {label} ID ({pattern.pattern})")
    ids = ALL_ID.findall(text)
    declarations = DECLARATION.findall(text)
    duplicate_declarations = sorted({value for value in declarations if declarations.count(value) > 1})
    if duplicate_declarations:
        errors.append("duplicate apparent declarations: " + ", ".join(duplicate_declarations))
    if "definition of done" not in lowered and "acceptance" not in lowered:
        errors.append("missing definition of done or acceptance section")
    if "rollback" not in lowered and "reversible" not in lowered:
        errors.append("missing rollback/reversibility treatment")
    if "html" in lowered and "canonical" not in lowered and "projection" not in lowered:
        errors.append("HTML is mentioned without a canonical/projection ownership statement")
    agentic_heading = re.search(r"^#+\s+.*\b(?:agent|skill|orchestrat)", lowered, re.MULTILINE)
    if agentic_heading and "capability" not in lowered:
        errors.append("agentic plan missing capability routing treatment")
    if errors:
        print(f"FAIL {path}")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"PASS {path}: {len(set(ids))} unique stable IDs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
