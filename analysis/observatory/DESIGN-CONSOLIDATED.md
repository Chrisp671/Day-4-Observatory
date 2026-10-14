# Design Research — Consolidated Verdict (WI-008)

*2026-08-12. Synthesis of four independent research documents:*
- `DESIGN-RESEARCH.md` (root, "engraved instrument" doc)
- `analysis/observatory/DESIGN-RESEARCH.md` (museum-sourced)
- `analysis/observatory/DESIGN-RESEARCH-SOL.md` (Sol)
- `analysis/observatory/kimi-Open DESIGN-RESEARCH.md` (Kimi; code-anchored, Atkins-measured)

*Each was digested by an independent agent against the standing identity rules
(Prussian field `#0E2440`; color reserved for sun `#F0B310` and moon; no
planetarium glow; Canvas 2D; no new dependencies). This file is the canonical
design spec going forward; the four sources are reference material.*

## Shared verdict (all four agree)

**Thesis: printed, not simulated.** The geometry and identity are right — the
dial band (0.110R) sits inside the measured historical astrolabe-limb range
(0.10–0.13R), the font pair is correct, the gaps are generous, and the
"single-reference-frame printed instrument" position is unoccupied in the
market. The work is *rank clarification*: length/weight/interruption before
opacity, opacity before hue, hue never.

## Adopted — implemented in this pass

1. **Sun glow deleted** (unanimous #1: "the single most planetarium element").
   Gold disc 0.03R + 1px `inkHi` keyline remain. The keyline also resolves the
   gold-on-blue chromostereopsis concern (root doc).
2. **Gold day-arc deleted** (Kimi; 1.24:1 decorative wash that dilutes the one
   gold disc — the sun itself is the day indicator). Tightens DEC-008.
3. **Rise/set marked by shape, not tint**: full-band `inkHi` boundary ticks at
   the rise and set hours (the no-color alternative; gold ticks were offered
   but rejected under the strict color rule). Night arc fill kept as ambience.
4. **Three-level tick cadence** (was 1.1:1 major:minor — history demands ≥2:1):
   - 6-hour major: full band +0.012R, 1.4px, `inkHi@.95`
   - hour: half band (0.055R), 1.0px, `inkMid@.9` (4.69:1 ✓)
   - 30-minute minor: quarter band, 0.75px, `inkLow` (decorative, allowed)
   - numerals promoted `inkMid@.9` → `inkHi@.9` (4.69:1 → 10.2:1)
5. **Moon outline deleted** (moonlight↔shadow adjacency is 15.17:1 — the disc
   separates itself). Terminator + earthshine kept as-is (validated).
6. **Moon orbit broken behind the moon** (gap ≈ 2× disc width each side) and
   kept faint — "fixed vs moving is read by openness, not color" (astrolabe
   rete). The sidereal ring is now the only continuous articulated interior
   scale.
7. **Truthful Earth graticule** (equatorial orthographic): limb 1.5px `inkHi`;
   equator + central meridian 1.0px `inkMid`; tropic chords at ±sin(23.44°) =
   ±0.398r and two meridian half-ellipses as hairlines. (The old 0.38 ellipse
   was accidentally almost the tropic — now it is exactly.) Terminator softener
   ellipse ("an airbrush in disguise") deleted; crisp clipped night fill stays.
8. **Seeded print grain**: one 128×128 seeded monochrome tile, ~0.75px blur,
   composited at ~1.2% over the face, rebuilt only on resize, never animated.
   Aggregate texture stays under the Atkins-measured ~4% budget (Kimi computed
   3.5% mottle + 3.1% exposure drift from Met object 291537).

## Adopted in principle — deferred work items

- **WI-009 (accessibility, L):** DOM transcript of instrument state; freeze-time
  control (resume jumps to *now*); `prefers-reduced-motion` 60s cadence;
  high-contrast mode (`inkLow` → `inkMid` promotion); print mode (inverted,
  labeled, grain-free — an explicitly sanctioned second palette for output
  only). All four docs demand these; they are DOM/CSS scope.
- **WI-010 (flourish, M):** one curved Instrument Serif small-caps ring title
  (0.12–0.18em tracking, per-glyph on arc, after `document.fonts.ready`);
  validation matrix (R=240/400/600 snapshots + one-second glance test:
  civil time → sun → moon → day/night → sidereal).

## Rejected (conflicts with standing rules)

- Field change toward `#003153` (invalidates every computed contrast ratio).
- Light-mode palette, second gold `#B8860B` (forks the token system).
- New fonts (Cormorant SC / EB Garamond SC / etc.) — all four verdicts keep the
  pair; the fallback lists are rejected options, not options.
- SVG/vector export (implies a second renderer).
- Mare stipples / craters on the 60px moon (museum doc: no surface detail
  below ~80px), coastlines/ocean stippling (geographic-truth claim out of
  scope for v1).
- Paper-white `#F0EAD6` swap — no `#FFFFFF` exists in the app; `inkHi` and
  `moonlight` are already off-whites. No-op.
- Gold rise/set markers — see item 3; needs a DEC to un-reject.

## Standing ledger (from the merged contrast tables, over `#0E2440`)

| Paint | Ratio | License |
|---|---|---|
| `inkHi` 1.0 / .9 / .55 / .45 | 12.26 / 10.20 / 4.70 / 3.59 | text ≥.55; non-text ≥.45 |
| `inkMid` 1.0 / .9 / .55 | 5.45 / 4.69 / 2.62 | text ≥.9; **.55 fails — never load-bearing** |
| `inkLow` any | ≤2.11 | decorative forever |
| gold 1.0 | 8.30 | the sun only |
| moonlight 1.0 | 13.84 | the moon only; avoid large solid areas |

Rule of thumb: required strokes ≥1 CSS px; verify final rendered pixels at
DPR 1/2/3 — token math flatters hairlines.
