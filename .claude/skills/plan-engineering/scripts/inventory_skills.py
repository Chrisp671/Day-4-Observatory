#!/usr/bin/env python3
"""Inventory skill metadata under explicit roots without loading skill bodies."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---(?:\s*\n|\Z)", re.DOTALL)
FIELD = re.compile(r"^([A-Za-z0-9_-]+):\s*(.*)$")


def scalar(value: str) -> str:
    value = value.strip()
    if value in {"|", ">", "|-", ">-", "|+", ">+"}:
        return ""
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def metadata(path: Path, root: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8", errors="replace")
    match = FRONTMATTER.search(text)
    fields: dict[str, str] = {}
    if match:
        current = ""
        for line in match.group(1).splitlines():
            found = FIELD.match(line)
            if found:
                current = found.group(1)
                fields[current] = scalar(found.group(2))
            elif current and line.startswith((" ", "\t")):
                fields[current] = f"{fields[current]} {line.strip()}".strip()
    relative = path.relative_to(root)
    disabled = "uninstalled" in relative.parts
    agent_metadata = path.parent / "agents" / "openai.yaml"
    implicit_disabled = False
    if agent_metadata.exists():
        policy = agent_metadata.read_text(encoding="utf-8", errors="replace")
        implicit_disabled = bool(re.search(r"^\s*allow_implicit_invocation:\s*false\s*$", policy, re.MULTILINE | re.IGNORECASE))
    frontmatter_user_only = fields.get("disable-model-invocation", "").lower() == "true"
    return {
        "name": fields.get("name") or path.parent.name,
        "version": fields.get("version", ""),
        "source": fields.get("source", ""),
        "description": fields.get("description", ""),
        "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "path": str(path.resolve()),
        "root": str(root.resolve()),
        "disabled": disabled,
        "user_only": frontmatter_user_only or implicit_disabled,
        "invocation_source": "frontmatter" if frontmatter_user_only else ("agent-policy" if implicit_disabled else "default"),
        "valid_frontmatter": bool(match and fields.get("name")),
    }


def discover(root: Path, include_disabled: bool) -> list[dict[str, object]]:
    if not root.exists():
        return []
    found: list[dict[str, object]] = []
    for path in sorted(root.rglob("SKILL.md")):
        item = metadata(path, root)
        if include_disabled or not item["disabled"]:
            found.append(item)
    return found


def render_markdown(items: list[dict[str, object]]) -> str:
    counts = Counter(str(item["name"]) for item in items)
    lines = [
        "| Name | Version | Invocation | State | Duplicate | Digest | Description | Path |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for item in items:
        name = str(item["name"])
        values = [
            name,
            str(item["version"] or "—"),
            "user-only" if item["user_only"] else "model-available",
            "disabled" if item["disabled"] else "active",
            "yes" if counts[name] > 1 else "no",
            str(item["sha256"])[:12],
            str(item["description"]).replace("|", "\\|"),
            f"`{item['path']}`",
        ]
        lines.append("| " + " | ".join(values) + " |")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("roots", nargs="+", type=Path, help="Narrow directories containing skills")
    parser.add_argument("--include-disabled", action="store_true")
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    items: list[dict[str, object]] = []
    for root in args.roots:
        items.extend(discover(root, args.include_disabled))
    items.sort(key=lambda item: (str(item["name"]), str(item["path"])))

    if args.format == "json":
        counts = Counter(str(item["name"]) for item in items)
        payload = {
            "skills": items,
            "duplicate_names": sorted(name for name, count in counts.items() if count > 1),
        }
        output = json.dumps(payload, indent=2) + "\n"
    else:
        output = render_markdown(items)

    if args.output:
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
