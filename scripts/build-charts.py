"""Build the per-constellation chart files for the Constellations view (WI-032, REQ-015).

Source: d3-celestial by Olaf Frohn, BSD-3-Clause, at a pinned commit —
  data/stars.6.json              stars to magnitude 6 (XHIP: Anderson & Francis 2012)
  data/starnames.json            names, Bayer/Flamsteed designations and the
                                 constellation of each HIP star (Kostjuk 2002 cross index)
  data/constellations.json       IAU abbreviation, name, genitive
  data/constellations.lines.json the IAU figure lines, as [RA°, Dec°] polylines
Output: web/public/charts/<Abbr>.json, one small file per constellation, loaded on
demand, plus web/public/charts/index.json (name -> abbr) and the attribution and
licence text beside them. Re-run to regenerate; the commit is pinned so the
output is reproducible.

usage: python scripts/build-charts.py [--cache DIR]
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.request
from pathlib import Path

REPO = "ofrohn/d3-celestial"
COMMIT = "7e720a3de062059d4c5400a379146a601d9010e0"
FILES = ["data/stars.6.json", "data/starnames.json", "data/constellations.json",
         "data/constellations.lines.json", "LICENSE"]
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "public" / "charts"

# Stars fainter than this are left off a chart unless they anchor a line.
CHART_MAG_LIMIT = 5.5
# How close a line vertex must be to a catalogue star to be that star (degrees).
VERTEX_MATCH_DEG = 0.12
# How many star names a chart carries: the brightest, by magnitude.
NAMES_PER_CHART = 3
# Our catalog's names where they differ from d3-celestial's (app/constellations.ts).
RENAME = {"Corona Austrina": "Corona Australis"}
# d3-celestial splits Serpens in two; the IAU counts one constellation.
MERGE = {"Ser": ("Serpens", "Serpentis", ["Ser"])}
# Asterisms the app tracks that live inside a constellation: chart that one.
ALIAS = {"Pleiades": "Tau"}

GREEK = {"α": "Alpha", "β": "Beta", "γ": "Gamma", "δ": "Delta", "ε": "Epsilon", "ζ": "Zeta",
         "η": "Eta", "θ": "Theta", "ι": "Iota", "κ": "Kappa", "λ": "Lambda", "μ": "Mu",
         "ν": "Nu", "ξ": "Xi", "ο": "Omicron", "π": "Pi", "ρ": "Rho", "σ": "Sigma",
         "τ": "Tau", "υ": "Upsilon", "φ": "Phi", "χ": "Chi", "ψ": "Psi", "ω": "Omega"}


def fetch(cache: Path, rel: str) -> Path:
    target = cache / Path(rel).name
    if not target.exists():
        url = f"https://raw.githubusercontent.com/{REPO}/{COMMIT}/{rel}"
        print("fetch", url)
        with urllib.request.urlopen(url, timeout=60) as r:  # noqa: S310 - pinned GitHub raw URL
            target.write_bytes(r.read())
    return target


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def ra_norm(ra: float) -> float:
    """Right ascension in degrees, [0, 360)."""
    return ra % 360.0


def sep_deg(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    d = abs(ra_norm(ra1) - ra_norm(ra2))
    d = min(d, 360 - d) * math.cos(math.radians((dec1 + dec2) / 2))
    return math.hypot(d, dec1 - dec2)


def display_name(entry: dict) -> str:
    """A star's name for the chart: its proper name, else its Bayer designation
    spelled out with the constellation's abbreviation ("Gamma Mic")."""
    if entry.get("name"):
        return entry["name"]
    bayer = entry.get("bayer") or ""
    if bayer and bayer[0] in GREEK:
        return f"{GREEK[bayer[0]]}{bayer[1:]} {entry.get('c', '')}".strip()
    return ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=str(Path.home() / ".cache" / "d3-celestial"))
    args = ap.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    paths = {Path(f).name: fetch(cache, f) for f in FILES}

    stars = load(paths["stars.6.json"])["features"]
    names = load(paths["starnames.json"])
    cons = load(paths["constellations.json"])["features"]
    lines: dict[str, list] = {}
    for f in load(paths["constellations.lines.json"])["features"]:
        lines.setdefault(f["id"], []).extend(f["geometry"]["coordinates"])

    # Every star, with its constellation and a display name where it has one.
    by_con: dict[str, list[dict]] = {}
    for f in stars:
        hip = str(f["id"])
        ra, dec = f["geometry"]["coordinates"]
        entry = names.get(hip, {})
        con = entry.get("c", "")
        if not con:
            continue
        by_con.setdefault(con, []).append({
            "hip": int(hip), "ra": round(ra_norm(ra), 4), "dec": round(dec, 4),
            "mag": float(f["properties"]["mag"]), "name": display_name(entry),
            "proper": bool(entry.get("name")),
        })

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()
    index: dict[str, str] = {}
    counts = []
    merged_parts = {part for _, _, parts in MERGE.values() for part in parts} | set(MERGE)
    entries = [(c["id"], RENAME.get(c["properties"]["name"], c["properties"]["name"]), c["properties"].get("gen", ""))
               for c in cons if c["id"] not in merged_parts]
    entries += [(abbr, name, gen) for abbr, (name, gen, _) in MERGE.items()]
    for abbr, name, genitive in entries:
        parts = MERGE[abbr][2] if abbr in MERGE else [abbr]
        members = [s for part in parts for s in by_con.get(part, [])]
        figure = [poly for part in parts for poly in lines.get(part, [])]
        chosen: dict[int, dict] = {s["hip"]: s for s in members if s["mag"] <= CHART_MAG_LIMIT}
        # Line vertices are stars: keep whichever star each vertex sits on,
        # searching the whole sky because figures cross borders.
        for poly in figure:
            for ra, dec in poly:
                best, bestd = None, VERTEX_MATCH_DEG
                for lst in by_con.values():
                    for s in lst:
                        d = sep_deg(ra, dec, s["ra"], s["dec"])
                        if d < bestd:
                            best, bestd = s, d
                if best is not None:
                    chosen[best["hip"]] = best
        ordered = sorted(chosen.values(), key=lambda s: s["mag"])
        # The names: the brightest members that have a name, proper names first.
        named = [s for s in ordered if s["name"] and s in members]
        named.sort(key=lambda s: (not s["proper"], s["mag"]))
        label_hips = {s["hip"] for s in named[:NAMES_PER_CHART]}
        chart = {
            "abbr": abbr,
            "name": name,
            "genitive": genitive,
            "stars": [[s["ra"], s["dec"], s["mag"], s["name"] if s["hip"] in label_hips else ""] for s in ordered],
            "lines": [[[round(ra_norm(ra), 4), round(dec, 4)] for ra, dec in poly] for poly in figure],
        }
        (OUT / f"{abbr}.json").write_text(json.dumps(chart, ensure_ascii=False, separators=(",", ":")) + "\n",
                                          encoding="utf-8")
        index[name] = abbr
        counts.append((name, len(chart["stars"]), len(chart["lines"]), sum(1 for s in chart["stars"] if s[3])))

    for alias, abbr in ALIAS.items():
        index[alias] = abbr
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    (OUT / "LICENSE-d3-celestial.txt").write_text(paths["LICENSE"].read_text(encoding="utf-8"), encoding="utf-8")
    (OUT / "ATTRIBUTION.md").write_text(
        "# Chart data attribution\n\n"
        "The files in this directory are generated by `scripts/build-charts.py` from\n"
        f"[d3-celestial](https://github.com/{REPO}) by Olaf Frohn, commit `{COMMIT}`,\n"
        "released under the BSD 3-Clause License (see `LICENSE-d3-celestial.txt`).\n\n"
        "d3-celestial's own sources, as its readme records them:\n\n"
        "- Star positions and magnitudes: XHIP — An Extended Hipparcos Compilation;\n"
        "  Anderson E., Francis C. (2012).\n"
        "- Star names and designations: HD-DM-GC-HR-HIP-Bayer-Flamsteed Cross Index\n"
        "  (Kostjuk, 2002) and the General Catalogue of Variable Stars (Samus et al.).\n"
        "- Constellation figures (the connecting lines) and names: the IAU constellation\n"
        "  page, with d3-celestial's modifications.\n\n"
        "Each `<Abbr>.json` holds one constellation: `stars` as `[RA°, Dec°, magnitude,\n"
        "name-or-empty]` (J2000), and `lines` as polylines of `[RA°, Dec°]`. `index.json`\n"
        "maps constellation names to abbreviations. Files are loaded on demand by the\n"
        "Constellations view.\n",
        encoding="utf-8")
    counts.sort(key=lambda t: t[1])
    print(f"wrote {len(index)} charts to {OUT}")
    print("fewest stars:", counts[:5])
    print("most stars:", counts[-3:])
    missing_names = [n for n, _, _, k in counts if k == 0]
    print("charts with no named star:", missing_names)
    return 0


if __name__ == "__main__":
    sys.exit(main())
